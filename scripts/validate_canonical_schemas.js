#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const schemaDir = path.join(root, 'schemas');
const requiredSchemas = [
  'canonical-envelope.v1.schema.json',
  'agent-intention.v1.schema.json',
  'market-snapshot.v1.schema.json',
];

function fail(message) {
  console.error(`[schema-check] ${message}`);
  process.exitCode = 1;
}

if (!fs.existsSync(schemaDir)) {
  fail('schemas/ directory is missing.');
  process.exit(process.exitCode || 1);
}

for (const schemaName of requiredSchemas) {
  const schemaPath = path.join(schemaDir, schemaName);
  if (!fs.existsSync(schemaPath)) {
    fail(`required schema missing: schemas/${schemaName}`);
    continue;
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  } catch (error) {
    fail(`invalid JSON in schemas/${schemaName}: ${error.message}`);
    continue;
  }

  if (json.$schema !== 'https://json-schema.org/draft/2020-12/schema') {
    fail(`schemas/${schemaName} must use draft 2020-12.`);
  }

  if (typeof json.$id !== 'string' || json.$id.length < 10) {
    fail(`schemas/${schemaName} must define non-empty $id.`);
  }

  if (json.type !== 'object') {
    fail(`schemas/${schemaName} must have top-level type=object.`);
  }

  if (json.additionalProperties !== false) {
    fail(`schemas/${schemaName} must set additionalProperties=false at top level.`);
  }

  if (!Array.isArray(json.required) || json.required.length === 0) {
    fail(`schemas/${schemaName} must define non-empty required[] fields.`);
  }

  const schemaVersion = json.properties && json.properties.schemaVersion;
  if (!schemaVersion || schemaVersion.const !== '1.0.0') {
    fail(`schemas/${schemaName} must pin properties.schemaVersion.const to 1.0.0.`);
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('[schema-check] canonical schemas validated successfully.');