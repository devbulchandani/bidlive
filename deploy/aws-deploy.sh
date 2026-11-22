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
VPC="$(aws ec2 describe-vpcs --filters Name=is-default=true --query 'Vpcs[0].VpcId' --output text)"
[ "$VPC" != "None" ] || { echo "No default VPC in $REGION — create one or edit the script."; exit 1; }

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
# The instance writes its own .env, then points Caddy at its public IP in dashed
# form so sslip.io resolves it and Let's Encrypt issues a real certificate.
USERDATA="$(mktemp)"
{
  echo '#!/bin/bash'
  echo 'set -euo pipefail'
  echo 'export DEBIAN_FRONTEND=noninteractive'
  echo 'fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048'
  echo 'chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile'
  echo 'curl -fsSL https://deb.nodesource.com/setup_22.x | bash -'
  echo 'apt-get install -y nodejs git caddy'
  echo 'git clone --depth 1 https://github.com/devbulchandani/bidlive.git /opt/bidlive'
  echo 'cd /opt/bidlive && npm ci --no-audit --no-fund && npm run build'
  echo "cat > /opt/bidlive/.env <<'ENVEOF'"
  echo "NEXCONN_APP_KEY=$KEY_VAL"
  echo "NEXCONN_APP_SECRET=$SEC_VAL"
  echo "NEXCONN_API_BASE=${BASE_VAL:-https://api.us-light-api.com}"
  echo "NEXCONN_API_BACKUP=https://api-b.us-light-api.com"
  echo "NEXCONN_AREA_CODE=${AREA_VAL:-3}"
  echo "NEXT_PUBLIC_NEXCONN_AREA_CODE=${AREA_VAL:-3}"
  echo 'ENVEOF'
  echo 'chmod 600 /opt/bidlive/.env'
  cat <<'UNIT'
cat > /etc/systemd/system/bidlive.service <<'EOF'
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
[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now bidlive
UNIT
  echo 'sleep 5'
  echo 'IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 | tr . -)'
  echo 'cat > /etc/caddy/Caddyfile <<EOF'
  echo '${IP}.sslip.io {'
  echo '  encode zstd gzip'
  echo '  reverse_proxy 127.0.0.1:3000 { flush_interval -1 }'
  echo '}'
  echo 'EOF'
  echo 'systemctl reload caddy || systemctl restart caddy'
} > "$USERDATA"

# -------------------------------------------------------------------- launch
ID="$(aws ec2 run-instances \
  --image-id "$AMI" \
  --instance-type "$INSTANCE_TYPE" \
  --security-group-ids "$SG" \
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
  BODY="$(curl -s -m 10 "https://$HOST/api/health" || true)"
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
