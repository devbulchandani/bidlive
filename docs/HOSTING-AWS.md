# Deploying on AWS

## Pick the service for the shape of this app, not the other way round

The app is a **single long-lived Node process** holding auction state in memory, with two
SSE streams. That rules some AWS services out immediately and makes one obvious.

| Service | Fits? | Why |
|---|---|---|
| **EC2 (t3.small)** | ✅ **recommended** | one process, always on, no cold start, streams freely. No Docker needed |
| App Runner | ⚠️ works | needs a container image in ECR, so Docker locally or a CodeBuild project; `--min-instances 0` sleeps and loses nothing (we replay from Nexconn) but adds a cold start |
| Elastic Beanstalk | ⚠️ works, with a trap | its nginx proxy **buffers responses**, which breaks SSE until you add `proxy_buffering off`. HTTPS also needs a load balancer (~$16/mo) |
| Lightsail containers | ✅ fine | fixed $7/mo, always on, but needs a local Docker push |
| Lambda / API Gateway | ❌ | no long-lived process, no shared memory, and SSE is not a fit |
| Amplify hosting | ❌ | static + serverless functions only |

**Cost:** t3.micro is free for 750 hours/month for the first 12 months of an account, then
about **$7.50/month**. t3.small (2 GB) is ~$15/month but builds comfortably. Nothing else in
this design costs money — Nexconn's free plan covers 10,000 MAU.

## One command

```bash
aws login                                   # in your own Terminal — it needs a TTY
AWS_PROFILE=default AWS_REGION=us-east-1 ./deploy/aws-deploy.sh
```

The script reads the Nexconn credentials from `.env.local`, launches a t3.micro with
[`deploy/ec2-user-data.sh`](../deploy/ec2-user-data.sh), and waits for `/api/health`.
It needs no SSH: the instance points Caddy at its own public IP in dashed form, so
`sslip.io` resolves it and Let's Encrypt issues a real certificate. The result is
`https://<dashed-ip>.sslip.io`.

Teardown is one command too — [`deploy/aws-teardown.sh`](../deploy/aws-teardown.sh) terminates
the instance and removes the security group.

> The deploy script injects the App Secret into EC2 user data, because that is the only way to
> provision without SSH. Instance metadata is not reachable from the internet, but anyone with
> API access to your account can read it. Acceptable for a hackathon instance you terminate
> afterwards; rotate the App Secret in the Nexconn console once judging ends.

## EC2 by hand

### 1. Authenticate the CLI

```bash
aws login          # this machine currently has no credentials configured
aws sts get-caller-identity
```

### 2. Launch the instance

Console → EC2 → **Launch instance**:

- **AMI:** Ubuntu Server 24.04 LTS (64-bit Arm is fine and cheaper if you pick t4g)
- **Type:** `t3.micro` (or `t3.small` for a comfortable build)
- **Key pair:** create or reuse one; you need SSH
- **Security group:** allow `22` from *your IP only*, `80` and `443` from anywhere
- **Storage:** 16 GB gp3
- **Advanced → User data:** paste [`deploy/ec2-user-data.sh`](../deploy/ec2-user-data.sh)

The script adds 2 GB of swap (`next build` needs more than 1 GB gives you), installs Node 22,
Caddy and git, clones the repo, builds, and installs a systemd unit called `bidlive`.

### 3. Write the secrets over SSH

Never in user data — that is readable from the instance metadata service.

```bash
ssh ubuntu@<public-ip>
sudo tee /opt/bidlive/.env >/dev/null <<'EOF'
NEXCONN_APP_KEY=4z3hlwrv4jtkt
NEXCONN_APP_SECRET=<your production secret>
NEXCONN_API_BASE=https://api.us-light-api.com
NEXCONN_API_BACKUP=https://api-b.us-light-api.com
NEXCONN_AREA_CODE=3
NEXT_PUBLIC_NEXCONN_AREA_CODE=3
EOF
sudo chmod 600 /opt/bidlive/.env
sudo systemctl restart bidlive
curl -s localhost:3000/api/health | python3 -m json.tool
```

`nexconnConfigured` must be `true` and `nexconnApiBase` must be the US host. You do **not**
need `NEXT_PUBLIC_NEXCONN_APP_KEY`: the client asks `/api/health` for the App Key at runtime,
so a build never depends on it being present.

### 4. HTTPS without buying a domain

`sslip.io` resolves a dashed IP to that address, so Caddy can get a real certificate:

```bash
sudo sed "s/13-233-1-2/$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 | tr . -)/" \
  /opt/bidlive/deploy/Caddyfile | sudo tee /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Your link is then `https://13-233-1-2.sslip.io`. The Caddyfile sets `flush_interval -1`;
without that the SSE streams arrive in bursts and the countdown stutters.

### 5. Verify before you submit

1. `https://<host>/api/health` → `nexconnConfigured: true`.
2. `/` shows a live lot with a running countdown.
3. `/app` → enter a lot → the `SDK · n` chip appears (this proves the browser socket connected).
4. Bid → `nexconnRecent` in `/api/health` shows `bidlive:Bid ok=true`.
5. Confirm the message in the Nexconn console.

If step 3 stalls on `SDK …`, the App Key and the area code disagree — that is the most common
failure and it looks exactly like a broken SDK.

## Two things that will bite you

- **Never run more than one instance** behind a load balancer. State is per-process, so two
  targets means two auctions with the same lot id; bids split between them and each client sees
  half the room. One instance, no autoscaling group with `desired-capacity > 1`.
- **Stop or terminate the instance after judging.** Leaving a t3.small running is ~$15/month.

## App Runner, if you would rather not manage a server

```bash
docker build -t bidlive --build-arg NEXT_PUBLIC_NEXCONN_APP_KEY=4z3hlwrv4jtkt .
aws ecr create-repository --repository-name bidlive
docker tag bidlive:latest <acct>.dkr.ecr.<region>.amazonaws.com/bidlive:latest
aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
docker push <acct>.dkr.ecr.<region>.amazonaws.com/bidlive:latest
```

Then create the service with **Auto scaling → max instances 1**, port 3000, and the same
environment variables. Set min instances to 1 for the judging window; 0 is cheaper but adds a
cold start of a few seconds.
