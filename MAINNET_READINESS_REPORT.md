# 🔴 SAPM Mainnet Readiness Assessment
**Sovereign Agentic Prediction Market on Sui**  
**Generated:** 2026-06-12  
**Status:** ❌ **NOT READY FOR MAINNET** (4 Critical Issues)

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| **Formal Verification** | ✅ Complete | 40 theorems proved |
| **Infrastructure** | ✅ Good | K8s, Docker, CI/CD in place |
| **Testing** | ✅ Good | 17 test files, 5 workflows |
| **Network Config** | ❌ CRITICAL | Hardcoded testnet endpoints |
| **Security** | ⚠️ CRITICAL | Package IDs hardcoded |
| **Move Contracts** | ⚠️ CRITICAL | Framework locked to testnet |
| **Overall Readiness** | ❌ **0/100** | MUST FIX before Sui mainnet |

---

## 🚨 CRITICAL ISSUES (BLOCKING MAINNET)

### 1. **HARDCODED TESTNET NETWORK ENDPOINTS** ⛔
**Severity:** CRITICAL  
**Impact:** Transactions will fail or go to wrong network

#### Problem
50 hardcoded testnet references found across the codebase:

```javascript
// ❌ BAD - agents/trader/index.js
process.env.SUI_RPC || 'https://fullnode.testnet.sui.io:443'

// ❌ BAD - agents/sui/integration/sui-blockchain.js
const SUI_RPC_URL = getFullnodeUrl('testnet')  // Hardcoded to testnet

// ❌ BAD - config/network-allowlist.json
"testnet": { "allowedNetworks": ["testnet"] }
```

#### Solution
1. **Update default RPC to use environment variable:**
```javascript
// ✅ GOOD
const SUI_RPC = process.env.SUI_RPC || getFullnodeUrl(process.env.SUI_NETWORK || 'testnet')
```

2. **Update .env.example to include mainnet:**
```env
# Network selection
SUI_NETWORK=mainnet  # or testnet, devnet
SUI_RPC=https://fullnode.mainnet.sui.io:443
```

3. **Update all agent initializers:**
   - `agents/trader/index.js` (line ~40)
   - `agents/sui/integration/sui-blockchain.js` (line ~1-20)
   - `agents/aggregator/server.js` (network config section)

**Effort:** 2-3 hours

---

### 2. **MOVE FRAMEWORK LOCKED TO TESTNET** ⛔
**Severity:** CRITICAL  
**Impact:** Cannot deploy contracts to mainnet

#### Problem
```toml
# ❌ BAD - agents/onchain-registry/Move.toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", 
        subdir = "crates/sui-framework/packages/sui-framework", 
        rev = "framework/testnet" }  # ⬅️ LOCKED TO TESTNET

[environments]
testnet = { rpc = "https://fullnode.testnet.sui.io:443" }  # Only testnet env
```

#### Solution
1. **Add mainnet environment to Move.toml:**
```toml
[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", 
        subdir = "crates/sui-framework/packages/sui-framework", 
        rev = "framework/mainnet" }  # Use mainnet framework

[environments]
mainnet = { rpc = "https://fullnode.mainnet.sui.io:443" }
testnet = { rpc = "https://fullnode.testnet.sui.io:443" }
devnet = { rpc = "https://fullnode.devnet.sui.io:443" }
```

2. **Deploy with correct environment:**
```bash
sui move build --network mainnet
sui move publish --network mainnet
```

**Effort:** 1 hour

---

### 3. **TESTNET PACKAGE ID HARDCODED IN 7 LOCATIONS** ⛔
**Severity:** CRITICAL  
**Impact:** Transactions point to testnet contracts, not mainnet

#### Problem
Testnet package ID `0x746797ce439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8` hardcoded in:

```javascript
// ❌ BAD locations:
1. demo/demo_predict_live.js:          SAPM_PACKAGE_ID = '0x746797...'
2. demo/demo_trading.js:               packageId: '0x746797...'
3. frontend/tests/unit/wallet-integration.test.js: pkgId = '0x746797...'
```

And references in:
- `frontend/.env.example` (NEXT_PUBLIC_SUI_PACKAGE_ID)
- `agents/` service integrations

#### Solution
1. **Replace all hardcoded IDs with environment variables:**

```javascript
// ✅ GOOD
const SAPM_PACKAGE_ID = process.env.NEXT_PUBLIC_SUI_PACKAGE_ID 
  || process.env.SAPM_PACKAGE_ID 
  || throw new Error('SAPM_PACKAGE_ID not configured');
```

2. **Update .env templates:**
```env
# Mainnet
NEXT_PUBLIC_SUI_PACKAGE_ID=0x<MAINNET_PACKAGE_ID_HERE>
NEXT_PUBLIC_SUI_NETWORK=mainnet

# Testnet (for development)
# NEXT_PUBLIC_SUI_PACKAGE_ID=0x746797ce439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8
# NEXT_PUBLIC_SUI_NETWORK=testnet
```

3. **Document deployment procedure:**
   - Deploy Move contracts to mainnet
   - Extract new package ID
   - Update environment configuration
   - Redeploy frontend/services

4. **Replace in code:**
   - `demo/demo_predict_live.js` (lines ~20)
   - `demo/demo_trading.js` (lines ~35, 112)
   - `frontend/tests/unit/wallet-integration.test.js` (lines ~15, 19)
   - `agents/trader/forecast_to_trade.js` (if hardcoded)

**Effort:** 2 hours

---

### 4. **SECURITY: POTENTIAL SECRET EXPOSURE IN AUDIT SCRIPT** ⛔
**Severity:** CRITICAL (False Positive, but FYI)  
**Impact:** The audit script itself was flagged (not actual code)

#### Solution
- Remove the `mainnet_readiness_audit.js` from production
- Keep only in dev/testing environment
- Consider code review for security patterns

**Effort:** 15 minutes

---

## ⚠️ HIGH PRIORITY WARNINGS (RESOLVE BEFORE MAINNET)

### 1. **GAS BUDGET TOO LOW** ⚠️
**Status:** Previously fixed to 20M MIST (based on prior context)  
**Verify:**
```bash
grep -r "gasBudget" agents/trader/ptb_builder.js
# Should show: gasBudget: 20_000_000 or configurable via env
```

**Action:** Confirm in `ptb_builder.js`:
```javascript
// ✅ GOOD
this.gasBudget = config.gasBudget || parseInt(process.env.SUI_GAS_BUDGET || '20000000');
```

---

### 2. **EXCESSIVE CONSOLE.LOG (UNSTRUCTURED LOGGING)** ⚠️
**Issue:** 470+ `console.log` calls found  
**Impact:** Logs won't be captured in production monitoring (ELK, DataDog, etc.)

**Solution:**
```javascript
// ❌ BAD
console.log('Trade executed:', tradeId, result);

// ✅ GOOD (already in place for some components)
logger.info('Trade executed', { tradeId, result, executedAt: new Date() });
```

**Action:** Verify all agents use `lib/logger`:
```bash
# Should mostly show structured logger usage
grep -r "logger\." agents/ | wc -l  # Should be high
grep -r "console\\.log" agents/ | wc -l  # Should be low
```

**Effort:** 3-4 hours (convert remaining console.log to logger.*)

---

### 3. **MOVE CONTRACT ACCESS CONTROL** ⚠️
**Issue:** Registry.move has public functions with limited validation  
**Impact:** Unauthorized operations possible

**Audit Registry.move:**
```move
// ⚠️ VERIFY - Check access control patterns
public fun add_key(...)  // Who can call?
public fun register(...) // Is there sender validation?
```

**Solution:** Ensure all public functions validate sender:
```move
// ✅ GOOD
public fun add_key(ctx: &TxContext, ...) {
    let sender = tx_context::sender(ctx);
    // Verify sender is authorized (e.g., creator, admin, or registry owner)
    assert!(is_authorized(sender), E_NOT_AUTHORIZED);
    ...
}
```

**Action:** Security audit of all 3 Move contracts:
- `Registry.move` (30 lines)
- `prediction_market.move` (312 lines)
- `incentives.move` (282 lines)

**Effort:** 2-3 hours

---

## ✅ PASSING INFRASTRUCTURE CHECKS

| Component | Status | Details |
|-----------|--------|---------|
| **Kubernetes** | ✅ Ready | 7 manifests, configurable for mainnet |
| **Docker** | ✅ Ready | 3 Dockerfiles, multi-stage builds |
| **Testing** | ✅ Good | 17 test files + 5 CI/CD workflows |
| **Formal Verification** | ✅ Complete | All 40 theorems proved & verified |
| **CI/CD Pipelines** | ✅ Working | GitHub Actions workflows active |
| **Config Management** | ✅ Flexible | Environment-based configuration |

---

## 📋 REMEDIATION CHECKLIST

### Phase 1: CRITICAL FIXES (Must Complete)
- [ ] Replace 50 hardcoded testnet references with env vars
  - [ ] Update `agents/trader/index.js` 
  - [ ] Update `agents/sui/integration/sui-blockchain.js`
  - [ ] Update config files
  
- [ ] Add mainnet framework support to Move.toml
  - [ ] Update `agents/onchain-registry/Move.toml`
  - [ ] Test both testnet and mainnet deployments
  
- [ ] Replace hardcoded package IDs in 7 locations
  - [ ] `demo/demo_predict_live.js`
  - [ ] `demo/demo_trading.js`
  - [ ] `frontend/tests/unit/wallet-integration.test.js`
  - [ ] Update all `.env.example` files
  - [ ] Deployment documentation

- [ ] Deploy to testnet with new config
- [ ] Test full flow on testnet
- [ ] Document mainnet deployment procedure

### Phase 2: HIGH PRIORITY (Before Mainnet)
- [ ] Verify gas budgets are >= 20M MIST and configurable
- [ ] Convert remaining console.log to structured logger
  - [ ] Run conversion: `grep -r "console\.log" agents/ --include="*.js"`
  - [ ] Replace with `logger.info()`, `logger.error()`, etc.
- [ ] Security audit of Move contracts
  - [ ] Verify access control on all public functions
  - [ ] Check for reentrancy guards
  - [ ] Validate error codes and assertions

### Phase 3: POLISH (Pre-Mainnet)
- [ ] Add Node.js engine specification to all package.json files
- [ ] Enable pre-commit hooks (Husky) for linting
- [ ] Add mainnet-specific deployment guide
- [ ] Update documentation with network switching guide
- [ ] Create runbook for emergency mainnet operations

---

## 🔄 NETWORK SWITCHING GUIDE (After Fixes)

### Development Workflow
```bash
# Testnet (default, for testing)
export SUI_NETWORK=testnet
export SUI_RPC=https://fullnode.testnet.sui.io:443
npm run docker:up  # Testnet services

# Local testing
export SUI_NETWORK=devnet
export SUI_RPC=http://localhost:9000
```

### Mainnet Deployment
```bash
# 1. Deploy Move contracts to mainnet
cd agents/onchain-registry
sui move publish --network mainnet
# Note: new SAPM_PACKAGE_ID = 0x<MAINNET_ID>

# 2. Update environment
export SUI_NETWORK=mainnet
export SUI_RPC=https://fullnode.mainnet.sui.io:443
export NEXT_PUBLIC_SUI_PACKAGE_ID=0x<MAINNET_ID>

# 3. Redeploy services
npm run docker:full

# 4. Update DeepBook Predict package ID (mainnet)
# From: NEXT_PUBLIC_DEEPBOOK_PREDICT_PACKAGE_ID (testnet)
# To: <MAINNET_DEEPBOOK_ID>

# 5. Update Walrus endpoints (if different)
# NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus.space
# NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus.space
```

---

## 📊 DETAILED FINDINGS

### Network Configuration (50 hardcoded references)

**Locations needing updates:**
```
agents/trader/index.js:45
  process.env.SUI_RPC || 'https://fullnode.testnet.sui.io:443'
  
agents/sui/integration/sui-blockchain.js:8
  const SUI_RPC_URL = getFullnodeUrl('testnet')
  
config/network-allowlist.json (multiple)
  "testnet": { "allowedNetworks": ["testnet"] }
  
.env.example:2
  SUI_RPC=https://fullnode.testnet.sui.io:443
  
.env.example:37
  NEXT_PUBLIC_SUI_NETWORK=testnet
  
frontend/.env.example (similar)
```

### Package ID Hardcoding (7 instances)
```
✗ demo/demo_predict_live.js
✗ demo/demo_trading.js (2 locations)
✗ frontend/tests/unit/wallet-integration.test.js (2 locations)
✗ .env.example (NEXT_PUBLIC_SUI_PACKAGE_ID)
✗ frontend/.env.example
```

### Logging Issues (470 console.log calls)
- Primarily in agent services
- Impact: No structured logs for monitoring/debugging
- Recommendation: Migrate to winston/bunyan logger pattern

### Move Contract Issues
- **Registry.move**: 30 lines, minimal validation
- **prediction_market.move**: 312 lines, good structure but verify access control
- **incentives.move**: 282 lines, needs validation audit

---

## 🎯 ESTIMATED TIMELINE

| Phase | Task | Effort | Blocker |
|-------|------|--------|---------|
| 1 | Fix hardcoded endpoints | 2-3h | YES |
| 1 | Fix Move.toml | 1h | YES |
| 1 | Fix package IDs | 2h | YES |
| 1 | Testnet validation | 2h | YES |
| 2 | Gas budget verify | 30min | - |
| 2 | Convert logging | 3-4h | - |
| 2 | Security audit (Move) | 2-3h | - |
| 3 | Engine specs | 30min | - |
| 3 | Documentation | 2h | - |
| **TOTAL** | **Full Mainnet Ready** | **18-23h** | - |

---

## 📋 PRE-MAINNET VALIDATION CHECKLIST

Before deploying to Sui mainnet:

```bash
# 1. Verify no testnet references
grep -r "testnet" agents/ config/ frontend/ --include="*.js" --include="*.ts" --include="*.move"
# Should return only .env.example and comments

# 2. Verify package ID is configurable
grep -r "process.env.SUI_PACKAGE_ID\|process.env.NEXT_PUBLIC_SUI_PACKAGE_ID" agents/ frontend/
# Should find env var usage, not hardcoded values

# 3. Verify network switching works
export SUI_NETWORK=mainnet
echo $SUI_NETWORK  # Should be 'mainnet'

# 4. Test Move contract on mainnet
cd agents/onchain-registry
sui move publish --network mainnet
# Save the Package ID

# 5. Run integration tests
npm run test:all
npm run test:e2e

# 6. Verify gas budgets
grep -r "gasBudget\|gasLimit" agents/ --include="*.js"
# Should show >= 20_000_000 MIST or configurable via env

# 7. Check logging output
npm run docker:full 2>&1 | grep -c "logger\."  # Should be high
npm run docker:full 2>&1 | grep -c "console\.log"  # Should be low/zero
```

---

## 🔐 Security Reminders

1. **Never commit .env files** with real keys/secrets
2. **Use hardware wallets** for mainnet AGG_SUI_SECRET
3. **Enable TLS** in production (AGG_USE_TLS=1)
4. **Validate all user inputs** before Move contract calls
5. **Rate limit agent endpoints** to prevent abuse
6. **Monitor gas spending** - set budget alerts
7. **Test with real gas costs** on mainnet testnet before production

---

## 📞 Support & Questions

- **Move contract deployment:** Sui documentation at https://docs.sui.io
- **Network switching:** See "Network Switching Guide" section above
- **Security concerns:** Review SECURITY.md and formal verification docs
- **Performance tuning:** See performance_optimization/ directory

---

## ✅ FINAL APPROVAL GATES

Before marking as "MAINNET READY":

- [ ] All 4 critical issues resolved and tested
- [ ] All 7 warnings addressed
- [ ] Full testnet deployment successful
- [ ] Security audit passed
- [ ] Performance benchmarks acceptable
- [ ] Monitoring & alerting configured
- [ ] Disaster recovery plan in place
- [ ] Stakeholder sign-off obtained

---

**Status:** ❌ NOT READY  
**Target:** All critical fixes + High priority warnings = READY  
**Next Steps:** Begin Phase 1 remediation

Generated: 2026-06-12T19:06:21.097Z
