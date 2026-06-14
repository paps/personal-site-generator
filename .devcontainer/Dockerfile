FROM mcr.microsoft.com/devcontainers/typescript-node

RUN echo 'cache bust 4'

# Contrary to some other microsoft provided devcontainer images, this one uses 'node' instead of 'vscode'
USER node

RUN curl -fsSL 'https://raw.githubusercontent.com/paps/dotfiles/refs/heads/master/min-setup-via-curl.sh' | bash
