#!/bin/bash
set -euo pipefail


# Re-exec as root if not already; requires passwordless sudo for this script in /etc/sudoers
# Ignore all catchable signals — only SIGKILL (kill -9) from root can stop this process
# These are not a security measures, it's just to make sure we don't inadvertently kill this process sometime later
if [[ $EUID -ne 0 ]]; then
  exec sudo "$0" "$@"
fi
trap '' HUP INT QUIT PIPE TERM USR1 USR2

while true; do
  # Delete known socket patterns in /tmp
  find /tmp -maxdepth 2 -type s \( \
    -path '/tmp/vscode-git-*.sock' -o \
    -path '/tmp/vscode-remote-containers-ipc-*.sock' -o \
    -path '/tmp/vscode-ipc-*.sock' -o \
    -path '/tmp/vscode-ssh-auth-*.sock' -o \
    -path '/tmp/mcp-*/mcp.sock' -o \
    -path '/tmp/.X11-unix/X*' \
  \) -delete 2>/dev/null || true

  sleep 5
done
