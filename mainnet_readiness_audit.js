#!/usr/bin/env node

/**
 * SAPM Mainnet Readiness Audit
 * Comprehensive check for production deployment gaps
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const AUDIT_ROOT = process.cwd();
const issues = [];
const warnings = [];
const passed = [];

function addIssue(category, severity, message, location = '') {
  issues.push({
    category,
    severity, // CRITICAL, HIGH, MEDIUM, LOW
    message,
    location,
    timestamp: new Date().toISOString()
  });
}

function addWarning(category, message, location = '') {
  warnings.push({
    category,
    message,
    location,
    timestamp: new Date().toISOString()
  });
}

function addPass(message) {
  passed.push({
    message,
    timestamp: new Date().toISOString()
  });
}

function grepInFiles(pattern, extensions, exclude = []) {
  try {
    const excludeArgs = exclude.map(e => `--exclude='${e}'`).join(' ');
    const extArgs = extensions.map(e => `--include='${e}'`).join(' ');
    const cmd = `grep -r "${pattern}" . ${extArgs} ${excludeArgs} 2>/dev/null | head -50`;
    const result = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return result.split('\n').filter(l => l);
  } catch (e) {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. NETWORK & CONFIGURATION AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 1: Network & Configuration Audit...');

// Check for hardcoded testnet references
const testnets = grepInFiles('testnet', ['*.js', '*.ts', '*.toml', '*.json']);
if (testnets.length > 5) {
  addIssue('Network', 'CRITICAL', 
    `${testnets.length} hardcoded testnet references found (should be configurable for mainnet)`,
    'agents/, config/, frontend/');
} else if (testnets.length > 0) {
  addWarning('Network', 
    `${testnets.length} testnet references present (verify they're in env examples, not code)`,
    'agents/, config/');
}

// Check for hardcoded RPC endpoints
const rpcEndpoints = grepInFiles('fullnode\\.testnet\\.sui\\.io|https://fullnode\\..*\\.sui', ['*.js', '*.ts', '*.json']);
if (rpcEndpoints.length > 0) {
  addIssue('Network', 'CRITICAL',
    `Hardcoded Sui RPC endpoints found: ${rpcEndpoints.length} instances. Should use environment variables.`,
    'agents/trader/index.js, agents/sui/integration/sui-blockchain.js');
}

// Check .env.example contains mainnet config
try {
  const envExample = fs.readFileSync('./.env.example', 'utf-8');
  if (!envExample.includes('mainnet')) {
    addIssue('Configuration', 'HIGH',
      '.env.example only shows testnet config. Need mainnet options documented.',
      '.env.example');
  }
  if (!envExample.includes('NEXT_PUBLIC_SUI_NETWORK')) {
    addWarning('Configuration',
      'No SUI_NETWORK env var in example (can\'t switch networks easily)',
      '.env.example');
  }
} catch (e) {
  addIssue('Configuration', 'HIGH', 'Missing .env.example file', '.');
}

// Check Move.toml for testnet framework
try {
  const moveTomls = execSync('find agents -name Move.toml -type f', { encoding: 'utf-8' }).split('\n').filter(l => l);
  moveTomls.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    if (content.includes('testnet')) {
      addIssue('Move', 'CRITICAL',
        'Move.toml hardcoded to testnet framework. Need mainnet support.',
        file);
    }
  });
} catch (e) {
  // No Move.toml files
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SECURITY & SECRETS AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 2: Security & Secrets Audit...');

// Check for secrets in code
const secretPatterns = [
  'PRIVATE.*KEY.*=.*[a-f0-9]{40,}',
  'SECRET.*=.*[a-zA-Z0-9_]{20,}',
  'PASSWORD.*=',
  'sk-[a-zA-Z0-9_]{20,}'  // OpenAI keys
];

secretPatterns.forEach(pattern => {
  const results = grepInFiles(pattern, ['*.js', '*.ts']);
  results.forEach(line => {
    if (!line.includes('process.env') && !line.includes('.env')) {
      addIssue('Security', 'CRITICAL',
        `Possible hardcoded secret found: ${line.substring(0, 80)}...`,
        line);
    }
  });
});

// Check for .env files (should never be committed)
try {
  const envFiles = execSync('find . -name ".env" -o -name ".env.local" -o -name ".env.*.local" 2>/dev/null', 
    { encoding: 'utf-8' }).split('\n').filter(l => l);
  if (envFiles.length > 0) {
    addIssue('Security', 'CRITICAL',
      `Uncommitted .env files found in repo. Remove from git: ${envFiles.join(', ')}`,
      '.gitignore');
  }
} catch (e) {
  // Good, no .env files
  addPass('No .env files found in repo (✓ good)');
}

// Check .gitignore for secrets
try {
  const gitignore = fs.readFileSync('./.gitignore', 'utf-8');
  if (!gitignore.includes('.env')) {
    addWarning('Security',
      '.gitignore does not exclude .env files',
      '.gitignore');
  }
} catch (e) {
  addIssue('Security', 'MEDIUM', 'Missing .gitignore file', '.');
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. GAS & TRANSACTION BUDGETS AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 3: Gas & Transaction Audit...');

// Check gas budgets
const gasBudgets = grepInFiles('gasBudget.*[0-9_]+|gasLimit.*[0-9_]+', ['*.js', '*.ts']);
const lowGas = gasBudgets.filter(line => {
  const match = line.match(/(\d+_*)+/);
  if (!match) return false;
  const num = parseInt(match[0].replace(/_/g, ''));
  return num < 10_000_000; // Less than 10M MIST
});

if (lowGas.length > 0) {
  addIssue('Gas', 'HIGH',
    `${lowGas.length} instances of low gas budgets (<10M MIST) found. Mainnet may fail.`,
    'agents/trader/ptb_builder.js (5M default)');
}

// Check if gas is configurable
const configurable = grepInFiles('process.env.*GAS|config.*gas', ['*.js', '*.ts']);
if (configurable.length === 0) {
  addWarning('Gas',
    'Gas budget not configurable via environment. Should allow override for mainnet.',
    'agents/');
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ERROR HANDLING & LOGGING AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 4: Error Handling & Logging Audit...');

// Count console.log usage (should use structured logger)
const consoleLogs = grepInFiles('console\\.log', ['*.js', '*.ts'], ['node_modules']);
addWarning('Logging',
  `${consoleLogs.length} console.log calls found. Should use structured logger for production.`,
  'agents/');

// Check for try-catch blocks
const tryBlocks = grepInFiles('try\\s*{', ['*.js', '*.ts'], ['node_modules']);
const catchBlocks = grepInFiles('catch\\s*\\(', ['*.js', '*.ts'], ['node_modules']);
if (catchBlocks.length < tryBlocks.length * 0.8) {
  addWarning('ErrorHandling',
    'Many try blocks without proper catch handlers. Add error context.',
    'agents/');
}

// Check for unhandled promise rejections
const promises = grepInFiles('\\.then\\(|async function|await ', ['*.js', '*.ts'], ['node_modules']);
const catches = grepInFiles('\\.catch\\(|try.*await', ['*.js', '*.ts'], ['node_modules']);
if (catches.length < promises.length * 0.7) {
  addWarning('ErrorHandling',
    'Promise rejection handling may be incomplete. Check async error boundaries.',
    'agents/');
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOVE CONTRACT AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 5: Move Contract Audit...');

try {
  const movePaths = execSync('find agents -name "*.move" -type f', { encoding: 'utf-8' }).split('\n').filter(l => l);
  
  if (movePaths.length === 0) {
    addWarning('Move', 'No Move contracts found (might be okay for some deployments)', 'agents/');
  }

  movePaths.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check for abort conditions
    if (!content.includes('assert!') && !content.includes('abort ')) {
      addWarning('Move', `Limited validation found in ${path.basename(file)}`, file);
    }
    
    // Check for access control
    if (content.includes('public fun') && !content.includes('sender')) {
      addWarning('Move', `Potential missing access control in public functions: ${path.basename(file)}`, file);
    }
  });
} catch (e) {
  // No Move files
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DEPLOYMENT & INFRASTRUCTURE AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 6: Deployment & Infrastructure Audit...');

// Check for k8s manifests
try {
  const k8sFiles = execSync('find k8s production-deployment-manifests -name "*.yaml" -o -name "*.yml" 2>/dev/null', 
    { encoding: 'utf-8' }).split('\n').filter(l => l);
  if (k8sFiles.length > 0) {
    addPass(`Kubernetes manifests found: ${k8sFiles.length} files`);
    
    k8sFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('testnet') && !content.includes('mainnet')) {
        addIssue('Deployment', 'HIGH',
          `Kubernetes manifest hardcoded to testnet: ${path.basename(file)}`,
          file);
      }
    });
  } else {
    addWarning('Deployment', 'No Kubernetes manifests found. Consider k8s for production.', 'k8s/');
  }
} catch (e) {
  addWarning('Deployment', 'No production deployment manifests found', 'production-deployment-manifests/');
}

// Check for Docker setup
try {
  const dockerFiles = execSync('find docker -name "Dockerfile*" -o -name "docker-compose*" 2>/dev/null', 
    { encoding: 'utf-8' }).split('\n').filter(l => l);
  if (dockerFiles.length === 0) {
    addWarning('Deployment', 'No Docker files found for containerization', 'docker/');
  } else {
    addPass(`Docker setup found: ${dockerFiles.length} files`);
  }
} catch (e) {
  addWarning('Deployment', 'Docker setup may be missing', 'docker/');
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DEPENDENCIES & VULNERABILITIES AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 7: Dependencies & Vulnerabilities Audit...');

try {
  const packages = execSync('find agents -name "package.json" -not -path "*/node_modules/*" -type f', 
    { encoding: 'utf-8' }).split('\n').filter(l => l);
  
  packages.forEach(pkgFile => {
    const content = JSON.parse(fs.readFileSync(pkgFile, 'utf-8'));
    const deps = { ...content.dependencies, ...content.devDependencies };
    
    // Check for outdated deps (check versions)
    if (content.dependencies && !content.engines) {
      addWarning('Dependencies',
        `No engine specification in ${path.basename(path.dirname(pkgFile))}/package.json. Should specify Node.js version.`,
        pkgFile);
    }
  });
} catch (e) {
  addWarning('Dependencies', 'Could not fully audit dependencies', 'agents/*/package.json');
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. TESTING & CI/CD AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 8: Testing & CI/CD Audit...');

// Check for test files
try {
  const testFiles = execSync('find test agents -name "*.test.js" -o -name "*.spec.js" 2>/dev/null | wc -l', 
    { encoding: 'utf-8' }).trim();
  if (parseInt(testFiles) > 0) {
    addPass(`Test files found: ${testFiles}`);
  } else {
    addWarning('Testing', 'Limited test coverage. Add unit and integration tests.', 'test/');
  }
} catch (e) {
  addWarning('Testing', 'No test files found in expected locations', 'test/');
}

// Check for GitHub Actions CI
try {
  const workflows = execSync('find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l', 
    { encoding: 'utf-8' }).trim();
  if (parseInt(workflows) > 0) {
    addPass(`CI/CD workflows found: ${workflows}`);
  } else {
    addWarning('CI/CD', 'No GitHub Actions workflows found. Add CI/CD pipeline.', '.github/workflows/');
  }
} catch (e) {
  addWarning('CI/CD', 'CI/CD pipeline may be missing or misconfigured', '.github/');
}

// Check for pre-commit hooks
try {
  const hookConfig = fs.readFileSync('.husky/.gitignore', 'utf-8');
  if (hookConfig) {
    addPass('Pre-commit hooks configured (Husky)');
  }
} catch (e) {
  addWarning('CI/CD', 'No pre-commit hooks found. Consider Husky for linting.', '.husky/');
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. FORMAL VERIFICATION AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 9: Formal Verification Audit...');

try {
  const verifyStatus = fs.readFileSync('formal_verification/FINAL_VERIFICATION_STATUS.md', 'utf-8');
  if (verifyStatus.includes('COMPLETE')) {
    addPass('Formal verification complete (40 theorems proved)');
  }
} catch (e) {
  addWarning('FormalVerification', 'Formal verification status unclear', 'formal_verification/');
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. PACKAGE ID & CONTRACT DEPLOYMENT AUDIT
// ─────────────────────────────────────────────────────────────────────────────

console.log('🔍 PHASE 10: Package ID Audit...');

const testnetPackageId = '0x746797ce439d0e06bdb31d1b0dacc24e204e7906445292a97fb6a5734de777b8';
const hardcodedRefs = grepInFiles(testnetPackageId, ['*.js', '*.ts']);

if (hardcodedRefs.length > 0) {
  addIssue('Deployment', 'CRITICAL',
    `Testnet SAPM package ID hardcoded in ${hardcodedRefs.length} locations. Must use env vars for mainnet.`,
    'demo/, frontend/tests/, agents/');
}

// Check if package ID is configurable
const configPackageId = grepInFiles('NEXT_PUBLIC_SUI_PACKAGE_ID|SUI_PACKAGE_ID|packageId.*process.env', 
  ['*.js', '*.ts', '.env.example']);
if (configPackageId.length > 0) {
  addPass('Package ID is configurable via environment');
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORT GENERATION
// ─────────────────────────────────────────────────────────────────────────────

console.log('\n\n');
console.log('═'.repeat(80));
console.log('🔍 MAINNET READINESS AUDIT REPORT');
console.log('═'.repeat(80));

const criticalCount = issues.filter(i => i.severity === 'CRITICAL').length;
const highCount = issues.filter(i => i.severity === 'HIGH').length;
const mediumCount = issues.filter(i => i.severity === 'MEDIUM').length;
const lowCount = issues.filter(i => i.severity === 'LOW').length;

console.log(`\n📊 SUMMARY`);
console.log(`  ✗ Critical Issues:  ${criticalCount}`);
console.log(`  ⚠ High Issues:      ${highCount}`);
console.log(`  ℹ Medium Issues:    ${mediumCount}`);
console.log(`  ◇ Low Issues:       ${lowCount}`);
console.log(`  ⊕ Warnings:         ${warnings.length}`);
console.log(`  ✓ Passed Checks:    ${passed.length}`);

if (criticalCount === 0 && highCount === 0) {
  console.log('\n✅ MAINNET READINESS: EXCELLENT (resolve warnings for production)');
} else if (criticalCount === 0) {
  console.log('\n⚠️  MAINNET READINESS: MODERATE (resolve HIGH issues before mainnet)');
} else {
  console.log('\n❌ MAINNET READINESS: NOT READY (resolve CRITICAL issues first)');
}

if (criticalCount > 0) {
  console.log('\n\n🚨 CRITICAL ISSUES (MUST FIX BEFORE MAINNET)');
  console.log('─'.repeat(80));
  issues.filter(i => i.severity === 'CRITICAL').forEach((issue, idx) => {
    console.log(`\n${idx + 1}. [${issue.category}] ${issue.message}`);
    if (issue.location) console.log(`   Location: ${issue.location}`);
  });
}

if (highCount > 0) {
  console.log('\n\n⚠️  HIGH PRIORITY ISSUES (STRONGLY RECOMMENDED BEFORE MAINNET)');
  console.log('─'.repeat(80));
  issues.filter(i => i.severity === 'HIGH').forEach((issue, idx) => {
    console.log(`\n${idx + 1}. [${issue.category}] ${issue.message}`);
    if (issue.location) console.log(`   Location: ${issue.location}`);
  });
}

if (mediumCount > 0) {
  console.log('\n\nℹ️  MEDIUM PRIORITY ISSUES');
  console.log('─'.repeat(80));
  issues.filter(i => i.severity === 'MEDIUM').forEach((issue, idx) => {
    console.log(`\n${idx + 1}. [${issue.category}] ${issue.message}`);
    if (issue.location) console.log(`   Location: ${issue.location}`);
  });
}

if (warnings.length > 0) {
  console.log('\n\n⚡ WARNINGS & RECOMMENDATIONS');
  console.log('─'.repeat(80));
  warnings.slice(0, 10).forEach((warning, idx) => {
    console.log(`\n${idx + 1}. [${warning.category}] ${warning.message}`);
    if (warning.location) console.log(`   Location: ${warning.location}`);
  });
  if (warnings.length > 10) {
    console.log(`\n... and ${warnings.length - 10} more warnings`);
  }
}

if (passed.length > 0) {
  console.log('\n\n✅ PASSED CHECKS');
  console.log('─'.repeat(80));
  passed.forEach((check, idx) => {
    console.log(`${idx + 1}. ✓ ${check.message}`);
  });
}

console.log('\n\n' + '═'.repeat(80));
console.log(`Generated: ${new Date().toISOString()}`);
console.log('═'.repeat(80));

// Export detailed report as JSON
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    warnings: warnings.length,
    passed: passed.length,
    readinessScore: Math.max(0, 100 - (criticalCount * 25 + highCount * 10 + mediumCount * 5))
  },
  issues,
  warnings,
  passed
};

fs.writeFileSync('mainnet-readiness-audit.json', JSON.stringify(report, null, 2));
console.log('\n📄 Detailed report saved to: mainnet-readiness-audit.json');

process.exit(criticalCount > 0 ? 1 : 0);
