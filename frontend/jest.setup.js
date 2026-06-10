globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { TextDecoder, TextEncoder } = require('util');

require('@testing-library/jest-dom');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
