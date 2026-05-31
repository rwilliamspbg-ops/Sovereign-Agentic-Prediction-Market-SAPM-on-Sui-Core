const fs = require('fs');
const path = require('path');
const { modelHash } = require('./fl_client');

const STORE_FILE = path.resolve(process.cwd(), 'model.json');

function defaultModel() {
  return Array.from({ length: 10 }, () => 0);
}

async function loadModel() {
  try {
    const txt = await fs.promises.readFile(STORE_FILE, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    return defaultModel();
  }
}

async function saveModel(model) {
  await fs.promises.writeFile(STORE_FILE, JSON.stringify(model, null, 2), 'utf8');
}

async function commitModel(model) {
  const hash = modelHash(model);
  // Placeholder: in Phase 1 we just persist the hash to a local file for audit
  const meta = { hash, ts: new Date().toISOString() };
  await fs.promises.writeFile(path.resolve(process.cwd(), 'model.meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  return meta;
}

module.exports = { loadModel, saveModel, commitModel };
