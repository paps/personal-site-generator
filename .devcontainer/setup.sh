#!/bin/bash
set -euo pipefail

#sudo cp mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitm.crt
#sudo update-ca-certificates

git config --global user.name "$DEVCONTAINER_GIT_USER_NAME"
git config --global user.email "$DEVCONTAINER_GIT_USER_EMAIL"

# vscode likes to inject a fancy credential helper in the devcontainer, but
# in this case we don't want to be bothered and want to use the credentials
# that we already have.
# The 'store' option just means that git will look into ~/.git-credentials.
git config --global credential.helper store
echo "https://$DEVCONTAINER_GITHUB_USERNAME:$DEVCONTAINER_GITHUB_PASSWORD@github.com" > ~/.git-credentials

# We're going to use HTTPS with a PAT token instead of SSH keys
# but we don't want to mess with the already configured repo remote
# (which would affect the devcontainer's host).
# So we use the git config trick below:
git config --global url."https://github.com/".insteadOf git@github.com:
git config --global --add url."https://github.com/".insteadOf ssh://git@github.com/

# Our dev container is running a background process that forcibly deletes
# convenience features / sockets injected by VSCode. So, as a courtesy and
# for cosmetics, we unset now irrelevant env vars that could become confusing
# for humans and agents.
cat <<'EOF' >> ~/.zshrc

unset VSCODE_IPC_HOOK_CLI

unset VSCODE_GIT_ASKPASS_EXTRA_ARGS
unset VSCODE_GIT_ASKPASS_MAIN
unset VSCODE_GIT_ASKPASS_NODE
unset VSCODE_GIT_IPC_HANDLE
unset GIT_ASKPASS
unset GIT_EDITOR # git will revert to EDITOR, which is what we want

unset REMOTE_CONTAINERS_DISPLAY_SOCK
unset REMOTE_CONTAINERS_IPC
unset REMOTE_CONTAINERS_SOCKETS

unset GPG_AGENT_INFO
unset SSH_AUTH_SOCK
unset BROWSER # this is a VSCode convenience script for opening links, it doesn't work anymore without the right socket

# These were our own vars for specifying out github/git user,
# they were used as a transfer mechanism between a config file and
# our dev container setup script, they're not really meant as
# env vars, so we take the opportunity to de-expose them.
unset DEVCONTAINER_GITHUB_PASSWORD
unset DEVCONTAINER_GITHUB_USERNAME
unset DEVCONTAINER_GIT_USER_EMAIL
unset DEVCONTAINER_GIT_USER_NAME
EOF

