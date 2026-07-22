FROM mcr.microsoft.com/devcontainers/typescript-node

RUN echo 'cache bust 5'

USER node

RUN curl -fsSL 'https://raw.githubusercontent.com/paps/dotfiles/refs/heads/master/min-setup-via-curl.sh' | bash

RUN curl -fsSL https://claude.ai/install.sh | bash

# QoL improvement, e.g. to land there when doing `podman exec -it ID zsh`
WORKDIR /workspaces/personal-site-generator
