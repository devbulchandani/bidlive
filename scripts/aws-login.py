"""
Holds `aws login --remote` open and feeds it an authorization code on demand.

The sandbox has no TTY, so the CLI's stdin prompt returns EOF and the login dies.
This wrapper keeps the process alive, mirrors its output to /tmp/awslogin.log, and
writes /tmp/awscode.txt into its stdin as soon as that file appears.

Usage:
    python3 scripts/aws-login.py [profile] [region]
"""
import os
import subprocess
import sys
import threading
import time

PROFILE = sys.argv[1] if len(sys.argv) > 1 else "default"
REGION = sys.argv[2] if len(sys.argv) > 2 else "us-east-1"
CODE_FILE = "/tmp/awscode.txt"
LOG_FILE = "/tmp/awslogin.log"

# ~/.aws is not writable inside the sandbox; keep the session in the workspace.
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(root, ".aws"), exist_ok=True)
env = os.environ.copy()
env["AWS_CONFIG_FILE"] = os.path.join(root, ".aws", "config")
env["AWS_SHARED_CREDENTIALS_FILE"] = os.path.join(root, ".aws", "credentials")

if os.path.exists(CODE_FILE):
    os.remove(CODE_FILE)

proc = subprocess.Popen(
    ["aws", "login", "--profile", PROFILE, "--region", REGION, "--remote"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1,
    env=env,
)


def pump():
    with open(LOG_FILE, "w", buffering=1) as log:
        for line in proc.stdout:
            log.write(line)
            log.flush()
            sys.stdout.write(line)
            sys.stdout.flush()


threading.Thread(target=pump, daemon=True).start()

# wait for the code, up to 15 minutes
code = None
for _ in range(900):
    if os.path.exists(CODE_FILE):
        code = open(CODE_FILE).read().strip()
        if code:
            break
    if proc.poll() is not None:
        break
    time.sleep(1)

if code:
    proc.stdin.write(code + "\n")
    proc.stdin.flush()
    print("\n[helper] authorization code submitted")

try:
    proc.wait(timeout=120)
except subprocess.TimeoutExpired:
    proc.kill()
    print("\n[helper] timed out")
    sys.exit(2)

print(f"[helper] aws login exited {proc.returncode}")
sys.exit(0 if proc.returncode == 0 else 1)
