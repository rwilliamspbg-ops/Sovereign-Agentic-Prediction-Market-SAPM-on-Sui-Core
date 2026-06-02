FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    ELAN_HOME=/opt/elan \
    RUSTUP_HOME=/opt/rustup \
    CARGO_HOME=/opt/cargo \
    PATH=/opt/elan/bin:/opt/cargo/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    xz-utils \
    unzip \
    jq \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "$ELAN_HOME" "$RUSTUP_HOME" "$CARGO_HOME"

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain 1.96.0 \
  && /opt/cargo/bin/rustup component add rustfmt clippy

RUN curl -fsSL https://raw.githubusercontent.com/leanprover/elan/master/elan-init.sh | sh -s -- -y --default-toolchain leanprover/lean4:v4.30.0 \
  && lean --version \
  && lake --version

RUN ln -sf /opt/cargo/bin/rustc /usr/local/bin/rustc \
  && ln -sf /opt/cargo/bin/cargo /usr/local/bin/cargo \
  && ln -sf /opt/cargo/bin/rustfmt /usr/local/bin/rustfmt \
  && ln -sf /opt/cargo/bin/rustup /usr/local/bin/rustup \
  && ln -sf /opt/elan/bin/lean /usr/local/bin/lean \
  && ln -sf /opt/elan/bin/lake /usr/local/bin/lake \
  && ln -sf /opt/elan/bin/elan /usr/local/bin/elan

WORKDIR /workspace
