// SPDX-License-Identifier: Apache-2.0
'use strict';

const fs = require('fs');
const path = require('path');

function readSchema(fileName) {
  const schemaPath = path.join(__dirname, '..', '..', '..', 'schemas', fileName);
  return JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
}

class CanonicalEnvelopeValidator {
  constructor() {
    this.envelopeSchema = readSchema('canonical-envelope.v1.schema.json');
    this.payloadSchemas = {
      agent_intention: readSchema('agent-intention.v1.schema.json'),
      market_snapshot: readSchema('market-snapshot.v1.schema.json'),
    };
  }

  validateIngress(input) {
    const correlationId = this.extractCorrelationId(input);
    const errors = [];

    this.validateObject(input, 'envelope', errors);
    this.validateRequired(input, this.envelopeSchema.required || [], 'envelope', errors);
    this.validateConst(input, this.envelopeSchema.properties || {}, 'envelope', errors);
    this.validateEnums(input, this.envelopeSchema.properties || {}, 'envelope', errors);

    if (input && typeof input === 'object' && typeof input.payloadType === 'string') {
      const payloadSchema = this.payloadSchemas[input.payloadType];
      if (payloadSchema) {
        const payload = input.payload;
        this.validateObject(payload, `payload(${input.payloadType})`, errors);
        this.validateRequired(payload, payloadSchema.required || [], `payload(${input.payloadType})`, errors);
        this.validateConst(payload, payloadSchema.properties || {}, `payload(${input.payloadType})`, errors);
        this.validateEnums(payload, payloadSchema.properties || {}, `payload(${input.payloadType})`, errors);
      } else {
        errors.push(`envelope.payloadType unsupported at ingress: ${String(input.payloadType)}`);
      }
    }

    if (errors.length > 0) {
      return {
        ok: false,
        code: 'POLICY_ENVELOPE_REJECTED',
        correlationId,
        errors,
      };
    }

    return {
      ok: true,
      correlationId,
      envelope: input,
    };
  }

  extractCorrelationId(input) {
    if (input && typeof input === 'object' && typeof input.correlationId === 'string' && input.correlationId.trim()) {
      return input.correlationId;
    }
    return 'missing-correlation-id';
  }

  validateObject(value, label, errors) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      errors.push(`${label} must be an object.`);
    }
  }

  validateRequired(value, requiredFields, label, errors) {
    if (!value || typeof value !== 'object') {
      return;
    }
    for (const field of requiredFields) {
      if (value[field] === undefined || value[field] === null) {
        errors.push(`${label}.${field} is required.`);
      }
    }
  }

  validateConst(value, properties, label, errors) {
    if (!value || typeof value !== 'object') {
      return;
    }
    for (const [field, config] of Object.entries(properties)) {
      if (config && Object.prototype.hasOwnProperty.call(config, 'const') && value[field] !== undefined) {
        if (value[field] !== config.const) {
          errors.push(`${label}.${field} must equal ${JSON.stringify(config.const)}.`);
        }
      }
    }
  }

  validateEnums(value, properties, label, errors) {
    if (!value || typeof value !== 'object') {
      return;
    }
    for (const [field, config] of Object.entries(properties)) {
      if (config && Array.isArray(config.enum) && value[field] !== undefined) {
        if (!config.enum.includes(value[field])) {
          errors.push(`${label}.${field} must be one of: ${config.enum.join(', ')}`);
        }
      }
    }
  }
}

module.exports = { CanonicalEnvelopeValidator };