#!/usr/bin/env bash
# One-command EC2 deploy for BidLive.
#
#   AWS_PROFILE=your-profile ./deploy/aws-deploy.sh
#
# Reads the Nexconn credentials from .env.local (never committed) and bakes them
# into the instance's user data at deploy time. Nothing secret is written to the
# repo, and no SSH is needed: the instance configures Caddy with its own public IP.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.aws/deploy-state"
REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo us-east-1)}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.micro}"
NAME="${NAME:-bidlive}"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

# ---------------------------------------------------------------- credentials
KEY_VAL="$(grep -E '^NEXCONN_APP_KEY=' "$ROOT/.env.local" | head -1 | cut -d= -f2- | tr -d '\r')"
SEC_VAL="$(grep -E '^NEXCONN_APP_SECRET=' "$ROOT/.env.local" | head -1 | cut -d= -f2- | tr -d '\r')"
BASE_VAL="$(grep -E '^NEXCONN_API_BASE=' "$ROOT/.env.local" | head -1 | cut -d= -f2- | tr -d '\r')"
AREA_VAL="$(grep -E '^NEXCONN_AREA_CODE=' "$ROOT/.env.local" | head -1 | cut -d= -f2- | tr -d '\r')"
[ -n "$KEY_VAL" ] && [ -n "$SEC_VAL" ] || { echo "Missing NEXCONN_APP_KEY / NEXCONN_APP_SECRET in .env.local"; exit 1; }

say "Account"
aws sts get-caller-identity --query '[Account,Arn]' --output text
say "Region: $REGION · type: $INSTANCE_TYPE"

# ---------------------------------------------------------------------- image
AMI="$(aws ssm get-parameter \
  --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp3/ami-id \
  --query Parameter.Value --output text)"
echo "AMI: $AMI"

# ------------------------------------------------------------- security group
MY_IP="$(curl -s -m 8 https://checkip.amazonaws.com || true)"
MY_IP="${MY_IP%$'\n'}"
VPC="$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)"
if [ -z "$VPC" ] || [ "$VPC" = "None" ]; then
  echo "No default VPC in $REGION — create one (aws ec2 create-default-vpc) or edit the script."
  exit 1
fi
echo "VPC: $VPC"

SG="$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$NAME-sg" "Name=vpc-id,Values=$VPC" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo None)"
if [ "$SG" = "None" ] || [ -z "$SG" ]; then
  SG="$(aws ec2 create-security-group --group-name "$NAME-sg" --description "BidLive demo" --vpc-id "$VPC" --query GroupId --output text)"
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 80 --cidr 0.0.0.0/0 >/dev/null
  aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 443 --cidr 0.0.0.0/0 >/dev/null
  if [ -n "$MY_IP" ]; then
    aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 22 --cidr "$MY_IP/32" >/dev/null
  fi
  echo "Created $SG"
else
  echo "Reusing $SG"
fi

# ------------------------------------------------------------------ user data
# Written as one heredoc: the boot script does its own logging, installs Caddy from
# the official repository (it is not in Ubuntu's default sources, which is what
# silently killed the first attempt), and falls back to plain HTTP on :80 if Caddy
# is unavailable so the app is never unreachable.
USERDATA="$(mktemp)"
cat > "$USERDATA" <<'USERDATA_EOF'
#!/bin/bash
set -euo pipefail
exec > >(tee -a /var/log/bidlive-boot.log) 2>&1
echo "[boot] start $(date -Is)"

fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
chmod 600 /swapfile; mkswap /swapfile; swapon /swapfile

apt-get update -y
apt-get install -y curl gnupg git ca-certificates debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
echo "[boot] node $(node -v)"

if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg || true
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list || true
  apt-get update -y && apt-get install -y caddy || echo "[boot] caddy install failed"
fi

[ -d /opt/bidlive ] || git clone --depth 1 https://github.com/devbulchandani/bidlive.git /opt/bidlive
cd /opt/bidlive
cat > .env <<'ENVEOF'
__ENV__
ENVEOF
chmod 600 .env

npm ci --no-audit --no-fund
npm run build
echo "[boot] build finished"

cat > /etc/systemd/system/bidlive.service <<'UNIT'
[Unit]
Description=BidLive
After=network.target

[Service]
WorkingDirectory=/opt/bidlive
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/bidlive/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now bidlive
echo "[boot] service started"

# IMDSv2 is enforced on Ubuntu 24.04: a plain GET returns 401 and an empty IP,
# which silently produced a Caddyfile whose subject was ".sslip.io".
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 300")
IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 | tr . -)
if [ -z "$IP" ]; then echo "[boot] could not read public ip from IMDS"; exit 1; fi
if command -v caddy >/dev/null 2>&1; then
  cat > /etc/caddy/Caddyfile <<CADDY
${IP}.sslip.io {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000 {
		flush_interval -1
	}
}
CADDY
  systemctl reload caddy 2>/dev/null || systemctl restart caddy
  echo "[boot] caddy up for ${IP}.sslip.io"
else
  echo "[boot] no caddy — serving plain HTTP on :80"
  mkdir -p /etc/systemd/system/bidlive.service.d
  printf '[Service]\nEnvironment=PORT=80\n' > /etc/systemd/system/bidlive.service.d/port80.conf
  systemctl daemon-reload
  systemctl restart bidlive
fi
echo "[boot] done $(date -Is)"
USERDATA_EOF

# inject the credentials without putting them on the command line
ENV_BLOCK="NEXCONN_APP_KEY=$KEY_VAL
NEXCONN_APP_SECRET=$SEC_VAL
NEXCONN_API_BASE=${BASE_VAL:-https://api.us-light-api.com}
NEXCONN_API_BACKUP=https://api-b.us-light-api.com
NEXCONN_AREA_CODE=${AREA_VAL:-3}
NEXT_PUBLIC_NEXCONN_AREA_CODE=${AREA_VAL:-3}"
python3 - "$USERDATA" "$ENV_BLOCK" <<'INJECT'
import sys
path, block = sys.argv[1], sys.argv[2]
src = open(path).read().replace("__ENV__", block)
open(path, "w").write(src)
INJECT

# -------------------------------------------------------------------- launch
ID="$(aws ec2 run-instances \
  --image-id "$AMI" \
  --instance-type "$INSTANCE_TYPE" \
  --security-group-ids "$SG" \
  --iam-instance-profile Name=bidlive-ssm \
  --user-data "file://$USERDATA" \
  --block-device-mappings '[{"DeviceName":"/dev/sda1","Ebs":{"VolumeSize":16,"VolumeType":"gp3"}}]' \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$NAME}]" \
  --query 'Instances[0].InstanceId' --output text)"
rm -f "$USERDATA"
echo "Instance: $ID"

aws ec2 wait instance-running --instance-ids "$ID"
IP="$(aws ec2 describe-instances --instance-ids "$ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)"
HOST="$(echo "$IP" | tr . -).sslip.io"

mkdir -p "$ROOT/.aws"
printf 'INSTANCE_ID=%s\nREGION=%s\nSECURITY_GROUP=%s\nPUBLIC_IP=%s\nURL=https://%s\n' \
  "$ID" "$REGION" "$SG" "$IP" "$HOST" > "$STATE"

say "URL: https://$HOST"
echo "Booting and building takes 3–5 minutes. Waiting for /api/health…"

for i in $(seq 1 60); do
  sleep 10
  BODY="$(curl -s -m 10 "https://$HOST/api/health" || curl -s -m 10 "http://$IP/api/health" || true)"
  if echo "$BODY" | grep -q '"nexconnConfigured":true'; then
    echo "$BODY" | python3 -m json.tool 2>/dev/null | head -12
    say "Deployed."
    exit 0
  fi
  printf '.'
done

echo
echo "Not healthy yet. Watch the boot log with:"
echo "  aws ec2 get-console-output --instance-id $ID --output text | tail -40"
