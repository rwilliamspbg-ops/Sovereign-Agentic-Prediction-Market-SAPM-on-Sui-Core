FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates tar jq gzip && rm -rf /var/lib/apt/lists/*

ARG SUI_RELEASE_URL="https://github.com/MystenLabs/sui/releases/download/testnet-v1.73.0/sui-testnet-v1.73.0-ubuntu-x86_64.tgz"

RUN echo "Downloading Sui release from ${SUI_RELEASE_URL}" \
 && curl -L -o /tmp/sui.tgz "${SUI_RELEASE_URL}" \
 && mkdir -p /opt/sui \
 && tar -xzf /tmp/sui.tgz -C /opt/sui --strip-components=1 \
 && rm -f /tmp/sui.tgz \
 && rm -f /opt/sui/sui-debug /opt/sui/sui-fork /opt/sui/sui-tool /opt/sui/sui-bridge /opt/sui/sui-bridge-cli /opt/sui/move-analyzer \
 && chmod +x /opt/sui/sui || true \
 && ln -sf /opt/sui/sui /usr/local/bin/sui || true

VOLUME ["/var/sui"]
EXPOSE 9000 9001 9184

HEALTHCHECK --interval=10s --timeout=3s --retries=5 CMD curl -f http://localhost:9000/ || exit 1

COPY entrypoint.sh /opt/sui/entrypoint.sh
RUN sed -i 's/\r$//' /opt/sui/entrypoint.sh && chmod +x /opt/sui/entrypoint.sh

CMD ["/bin/sh", "/opt/sui/entrypoint.sh"]
