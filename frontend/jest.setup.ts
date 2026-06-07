import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
	// Jest + jsdom may not expose TextEncoder in all runtimes.
	(global as any).TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
	(global as any).TextDecoder = TextDecoder;
}
