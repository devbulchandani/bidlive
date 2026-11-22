#!/usr/bin/env bash
# EC2 bootstrap for BidLive (Ubuntu 24.04, t3.micro or larger).
#
# Paste this into EC2 → Advanced details → User data at launch. Secrets are NOT
# here on purpose: user data is readable from the instance metadata service, so
# the .env file is written over SSH afterwards (see docs/HOSTING-AWS.md).
set -euo pipefail

# 1. Swap. `next build` needs more memory than a 1 GB instance has spare.
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# 2. Node 22 + git + Caddy (automatic HTTPS, streams responses without buffering)
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs git caddy

# 3. The app
if [ ! -d /opt/bidlive ]; then
  git clone --depth 1 https://github.com/devbulchandani/bidlive.git /opt/bidlive
fi
cd /opt/bidlive
npm ci --no-audit --no-fund
npm run build

# 4. Run it as a service. EnvironmentFile is optional (`-` prefix) so the unit
#    starts cleanly before the secrets are written.
cat > /etc/systemd/system/bidlive.service <<'UNIT'
[Unit]
Description=BidLive
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/bidlive
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=-/opt/bidlive/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable --now bidlive
