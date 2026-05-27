const fs = require('node:fs/promises')
const path = require('node:path')

const BYZANTINE_REPORT = process.env.BYZANTINE_REPORT || '/tmp/sapm-agg-sim/byzantine_report.json'
const SECURITY_REPORT = process.env.SECURITY_REPORT || '/tmp/sapm-agg-security-sim/security_attack_report.json'
const IDENTITY_REPORT = process.env.IDENTITY_REPORT || '/tmp/sapm-agg-identity-sim/identity_attack_report.json'
const OUT_DIR = process.env.SIM_REPORT_DIR || path.resolve(process.cwd(), '../../artifacts/phase2')
const OUT_FILE = process.env.SIM_REPORT_FILE || 'phase2_profiles_report.json'

async function readJson(filePath) {
  try {
    const txt = await fs.readFile(filePath, 'utf8')
    return { ok: true, path: filePath, data: JSON.parse(txt) }
  } catch (e) {
    return { ok: false, path: filePath, error: e?.message || String(e) }
  }
}

function normalizeProfile(name, rec) {
  if (!rec.ok) {
    return {
      name,
      path: rec.path,
      found: false,
      pass: false,
      error: rec.error,
    }
  }
  const data = rec.data || {}
  return {
    name,
    path: rec.path,
    found: true,
    profile: data.profile || name,
    timestamp: data.timestamp || null,
    pass: Boolean(data.pass),
    checks: data.checks || null,
    error: data.error || null,
  }
}

async function run() {
  const [b, s, i] = await Promise.all([
    readJson(BYZANTINE_REPORT),
    readJson(SECURITY_REPORT),
    readJson(IDENTITY_REPORT),
  ])

  const profiles = [
    normalizeProfile('byzantine', b),
    normalizeProfile('security', s),
    normalizeProfile('identity', i),
  ]

  const overallPass = profiles.every((p) => p.found && p.pass)
  const summary = {
    report: 'phase2-profiles-index',
    generatedAt: new Date().toISOString(),
    overallPass,
    profileCount: profiles.length,
    profiles,
  }

  await fs.mkdir(OUT_DIR, { recursive: true })
  const outPath = path.join(OUT_DIR, OUT_FILE)
  await fs.writeFile(outPath, JSON.stringify(summary, null, 2), 'utf8')
  console.log(`Combined profile report: ${outPath}`)

  if (!overallPass) {
    process.exitCode = 1
  }
}

run().catch((e) => {
  console.error('Failed to build profile report index:', e?.message || e)
  process.exit(1)
})
