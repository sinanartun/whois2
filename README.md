# whois2

A modern WHOIS lookup library for Node.js that supports both ESM and CommonJS modules.

[![npm version](https://img.shields.io/npm/v/@sinanartun/whois2.svg)](https://www.npmjs.com/package/@sinanartun/whois2)

## Features

- 🌐 Support for all TLDs (Top Level Domains)
- 🔄 Dual module support (ESM and CommonJS)
- 🚀 Modern async/await API
- 📊 Clean JSON output
- 🔍 Built-in WHOIS data parsing
- ⚡ Fast and lightweight

## Installation

```bash
npm install @sinanartun/whois2
```

## Usage

### ESM (ECMAScript Modules)

```javascript
import { whois } from '@sinanartun/whois2';

// Basic usage
const result = await whois('example.com');
console.log(result);

// With options
const resultWithOptions = await whois('example.com', {
  timeout: 5000,
  follow: true
});
```

### CommonJS

```javascript
const { whois } = require('@sinanartun/whois2');

// Basic usage
whois('example.com')
  .then(result => console.log(result))
  .catch(error => console.error(error));
```

## API

### whois(domain, options?)

Query WHOIS information for a domain.

#### Parameters

- `domain` (string): The domain name to query
- `options` (object, optional):
  - `timeout` (number): Connection timeout in milliseconds (default: 5000)
  - `follow` (boolean): Whether to follow registrar referrals (default: false)

#### Returns

- Promise<string>: Raw WHOIS data
- Promise<object>: Parsed WHOIS data (if using the parser)

## Examples

### Basic Lookup

```javascript
import { whois } from '@sinanartun/whois2';

try {
  const result = await whois('google.com');
  console.log(result);
} catch (error) {
  console.error('Error:', error.message);
}
```

### With Custom Options

```javascript
import { whois } from '@sinanartun/whois2';

const options = {
  timeout: 10000, // 10 seconds
  follow: true    // Follow registrar referrals
};

const result = await whois('example.com', options);
```

## Requirements

- Node.js >= 14.16.0

## License

MIT

## Author

Sinan Artun

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 