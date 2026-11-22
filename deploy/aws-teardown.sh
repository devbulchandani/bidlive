#!/usr/bin/env bash
# Tears down whatever ./deploy/aws-deploy.sh created.
#
#   ./deploy/aws-teardown.sh
#
# A t3.micro left running costs about $7.50/month, and the security group keeps the
# account tidy. Run this once judging is over.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE="$ROOT/.aws/deploy-state"

[ -f "$STATE" ] || { echo "No deploy state at $STATE — nothing to remove."; exit 1; }
# shellcheck disable=SC1090
source "$STATE"

echo "Terminating $INSTANCE_ID in $REGION…"
aws ec2 terminate-instances --instance-ids "$INSTANCE_ID" --region "$REGION" >/dev/null
aws ec2 wait instance-terminated --instance-ids "$INSTANCE_ID" --region "$REGION"
echo "Instance terminated."

# the group cannot be deleted while the interface is still detaching
sleep 15
aws ec2 delete-security-group --group-id "$SECURITY_GROUP" --region "$REGION" \
  && echo "Security group $SECURITY_GROUP deleted." \
  || echo "Security group still attached — delete $SECURITY_GROUP manually in a minute."

rm -f "$STATE"
echo "Done."
