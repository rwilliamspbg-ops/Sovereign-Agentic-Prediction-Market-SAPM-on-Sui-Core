On-chain registry Move package

This package contains a minimal Move module `registry` that defines a `PubkeyRegistry` resource
with helpers to add and check pubkeys. It's intended for local testing on the `sui-local` validator.

Deployment (manual steps):

1. Copy this package into a machine that has the `sui` CLI and Move toolchain (or run from the `sui-local` container if it includes the CLI).
2. Build the package:

   su i move build

3. Publish the package using a funded account (replace the path and account as appropriate):

   sui client publish --path . --gas-budget 10000

4. The publish output will include the new package/module and an object id for the created registry resource (if you create one). Use that object id as `PUBKEY_REGISTRY_OBJ` in the aggregator environment.

Note: these commands depend on the Sui CLI. The helper script `scripts/deploy_onchain_registry.sh` attempts to automate this when run from the repository root.
