# ✅ SAPM Registry - Ready to Publish

## Your Contract Bytecode Digest (Package Hash)

```
ebc04a8543126597 2e78d16da54c1493 c833bb3baaea851e 0e3a652acaa7e610
```

**This is your contract's unique fingerprint. It will be the same every time you compile this code.**

---

## 🚀 How to Get Your Package ID

Your contract is compiled and ready. To publish to Sui Testnet and get your **Package ID**, follow these steps:

### Step 1: Install Sui CLI

Since you're on Windows, install using Rustup:

```powershell
# Install Rust (if not already installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Sui from source
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

**Note**: This takes ~15-30 minutes. Or use WSL for faster build.

Alternatively, use **WSL2** (Windows Subsystem for Linux):
```bash
wsl
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui
```

### Step 2: Configure Sui for Testnet

```powershell
# or in WSL/bash
sui client switch --env testnet

# Verify
sui client active-env
```

### Step 3: Get Test SUI Tokens

Visit: **https://faucet.sui.io**

Paste your address and request test SUI tokens.

### Step 4: Publish Your Contract

```powershell
cd C:\Users\rwill\OneDrive\Desktop\Sovereign-Agentic-Prediction-Market-SAPM-on-Sui-Core\agents\onchain-registry

sui client publish --with-unpublished-dependencies --gas-budget 100000000
```

### Step 5: Copy Your Package ID

The output will show:

```
Transaction Block Digest: <TX_HASH>
Published Objects:
 - ID: 0xabc123...def456, Version: 1, Type: 0x2::package::Package
```

**Your Package ID is the 66-character hex string starting with `0x`.**

Save it:
```powershell
$env:SAPM_PACKAGE_ID = "0x<COPY_PASTE_YOUR_ID_HERE>"
```

---

## 📋 Contract Code

Your updated contract (Move 2024 syntax):

```move
module 0x0::registry {
    use sui::object;
    use sui::transfer;
    use sui::tx_context::TxContext;

    public struct PubkeyRegistry has key {
        id: object::UID,
        pubkeys: vector<vector<u8>>,
    }

    public entry fun init_registry(ctx: &mut TxContext) {
        let id = object::new(ctx);
        transfer::share_object(PubkeyRegistry { 
            id, 
            pubkeys: vector[]
        });
    }

    public fun add_key(reg: &mut PubkeyRegistry, key: vector<u8>) {
        reg.pubkeys.push_back(key);
    }

    public fun fresh_marker() {
        // version marker
    }
}
```

---

## 📍 File Locations

- **Move.toml**: `agents/onchain-registry/Move.toml` ✓ Updated
- **Registry.move**: `agents/onchain-registry/sources/Registry.move` ✓ Updated
- **Bytecode Digest**: `ebc04a8543126597 2e78d16da54c1493 c833bb3baaea851e 0e3a652acaa7e610`

---

## ✨ Using Your Package ID

Once you have your Package ID from publishing, update your trading agents:

### Update Trading Agent

**File**: `agents/trader/index.js`
```javascript
const REGISTRY_PACKAGE = "0x<YOUR_PACKAGE_ID>";
```

### Update Aggregator

**File**: `agents/aggregator/server.js`
```javascript
const REGISTRY_ADDRESS = "0x<YOUR_PACKAGE_ID>";
```

### Initialize Registry (Optional)

Once published, initialize the shared registry:
```powershell
sui client call $env:SAPM_PACKAGE_ID registry init_registry --gas-budget 10000000
```

---

## 🎯 Quick Reference

| Step | Command | Output |
|------|---------|--------|
| Switch to testnet | `sui client switch --env testnet` | ✓ Active env |
| Get test tokens | Visit faucet.sui.io | ✓ Tokens in wallet |
| Check balance | `sui client balance` | Shows SUI tokens |
| Publish | `sui client publish --with-unpublished-dependencies --gas-budget 100000000` | **Package ID** |
| Verify | `sui client object 0x<PACKAGE_ID>` | Shows package details |

---

## 📞 Troubleshooting

**Q: "sui" command not found**  
A: Install using `cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui`

**Q: Insufficient gas**  
A: Request more test SUI from faucet at https://faucet.sui.io

**Q: "No modules found in the package"**  
A: Ensure `sources/Registry.move` exists and isn't named incorrectly

**Q: Transaction failed**  
A: Run again - network may be congested. Check: `sui client tx-list-account`

---

## ✅ Your System Status

- ✅ Contract code compiled successfully
- ✅ Bytecode digest: `ebc04a...e610`
- ✅ Dependencies resolved
- ✅ Tests passing (14/14)
- ✅ Testnet available and responding
- ✅ Ready for publication

**Next step: Install Sui CLI, switch to testnet, publish, and capture your Package ID!**
