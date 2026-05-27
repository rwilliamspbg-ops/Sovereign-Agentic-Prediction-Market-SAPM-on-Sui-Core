Sample agent

This minimal agent tests connectivity to a Sui RPC endpoint provided via `SUI_RPC` environment variable.

Build and run locally:

```bash
docker build -t sapm-agent-sample ./agents/sample
docker run --rm -e SUI_RPC=http://host.docker.internal:9000 sapm-agent-sample
```
