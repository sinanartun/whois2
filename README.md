# whois2

A modern WHOIS lookup library for Node.js that supports both ESM and CommonJS modules.

[![npm version](https://img.shields.io/npm/v/@sinanartun/whois2.svg)](https://www.npmjs.com/package/@sinanartun/whois2)
[![npm downloads](https://img.shields.io/npm/dm/@sinanartun/whois2.svg)](https://www.npmjs.com/package/@sinanartun/whois2)
[![npm downloads](https://img.shields.io/npm/dt/@sinanartun/whois2.svg)](https://www.npmjs.com/package/@sinanartun/whois2)

## Features

- 🌐 Support for all TLDs (Top Level Domains)
- 🔄 Dual module support (ESM and CommonJS)
- 🚀 Modern async/await API
- 📊 Clean JSON output
- 🔍 Built-in WHOIS data parsing
- ⚡ Fast and lightweight
- 📝 Includes raw WHOIS data in response
- 🛡️ Automatic rate limit detection and handling
- 🔄 Automatic RDAP fallback when WHOIS is rate-limited
- 🚨 RDAP support and notification when WHOIS is deprecated

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
  follow: true,
  retryCount: 3,
  handleRateLimit: true,
  useRdapOnRateLimit: true
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
  - `retryCount` (number): Number of retry attempts for failed requests (default: 3)
  - `retryDelay` (number): Delay between retries in milliseconds (default: 1000)
  - `handleRateLimit` (boolean): Automatically wait and retry when rate limited (default: true)
  - `useRdapOnRateLimit` (boolean): Automatically switch to RDAP when WHOIS is rate-limited (default: true)

#### Returns

Returns a Promise that resolves to an object containing:
- `domain_name` (string): The domain name
- `registrar` (string): The registrar name
- `creation_date` (string): Domain creation date in ISO format
- `expiration_date` (string): Domain expiration date in ISO format
- `updated_date` (string): Last update date in ISO format
- `raw` (string): Complete raw WHOIS or RDAP response
- `rate_limited` (boolean): Whether the request was rate limited
- `rate_limit_seconds` (number): Seconds to wait if rate limited
- `rdap_recommended` (boolean): Whether RDAP is recommended instead of WHOIS
- `rdap_url` (string): RDAP URL if recommended
- `protocol` (string): The protocol used for the response (`whois` or `rdap`)
- `name_servers` (array): List of nameservers (when using RDAP)
- `status` (array): List of domain status codes (when using RDAP)

### fetchRdapData(domain)

Directly fetch RDAP data for a domain.

```javascript
import { fetchRdapData } from '@sinanartun/whois2';

const rdapData = await fetchRdapData('example.com');
console.log(rdapData);
```

### parseRdapData(rdapData)

Parse raw RDAP data into a standardized format.

```javascript
import { fetchRdapData, parseRdapData } from '@sinanartun/whois2';

const rawData = await fetchRdapData('example.com');
const parsedData = parseRdapData(rawData);
console.log(parsedData);
```

## Examples

### Basic Lookup

```javascript
import { whois } from '@sinanartun/whois2';

try {
  const result = await whois('google.com');
  console.log(result);
  
  // Check which protocol was used
  console.log(`Data retrieved using: ${result.protocol}`);
} catch (error) {
  console.error('Error:', error.message);
}
```

### With Custom Options

```javascript
import { whois } from '@sinanartun/whois2';

const options = {
  timeout: 10000,          // 10 seconds
  follow: true,            // Follow registrar referrals
  retryCount: 5,           // Retry up to 5 times
  retryDelay: 2000,        // Wait 2 seconds between retries
  handleRateLimit: true,   // Auto-handle rate limits
  useRdapOnRateLimit: true // Switch to RDAP if rate limited
};

const result = await whois('example.com', options);
```

### Handling Rate Limits Manually

```javascript
import { whois } from '@sinanartun/whois2';

// Disable automatic rate limit handling and RDAP fallback
const result = await whois('example.com', { 
  handleRateLimit: false,
  useRdapOnRateLimit: false 
});

if (result.rate_limited) {
  console.log(`Rate limited! Try again in ${result.rate_limit_seconds} seconds`);
  // Implement your own retry logic
}
```

### Working with RDAP Directly

```javascript
import { fetchRdapData, parseRdapData } from '@sinanartun/whois2';

// Fetch raw RDAP data
const rawData = await fetchRdapData('example.com');

// Parse into standardized format
const parsedData = parseRdapData(rawData);
console.log(parsedData);
```

### Example Output

#### WHOIS Response
```json
{
  "domain_name": "EXAMPLE.COM",
  "registrar": "RESERVED-Internet Assigned Numbers Authority",
  "creation_date": "1995-08-14T04:00:00Z",
  "expiration_date": "2025-08-13T04:00:00Z",
  "updated_date": "2024-08-14T07:01:34Z",
  "raw": "Domain Name: EXAMPLE.COM\nRegistry Domain ID: 2336799_DOMAIN_COM-VRSN\n...",
  "rate_limited": false,
  "rate_limit_seconds": 0,
  "rdap_recommended": false,
  "rdap_url": null,
  "protocol": "whois"
}
```

#### RDAP Response
```json
{
  "domain_name": "EXAMPLE.COM",
  "registrar": "GoDaddy.com, LLC",
  "creation_date": "2013-03-02T19:18:14Z",
  "expiration_date": "2026-03-02T19:18:14Z",
  "updated_date": "2024-08-31T05:09:26Z",
  "name_servers": [
    "NS5.AFTERNIC.COM",
    "NS6.AFTERNIC.COM"
  ],
  "status": [
    "client delete prohibited",
    "client renew prohibited",
    "client transfer prohibited",
    "client update prohibited"
  ],
  "raw": "{\"objectClassName\":\"domain\",\"handle\":\"1783775921_DOMAIN_COM-VRSN\",...}",
  "rate_limited": false,
  "rate_limit_seconds": 0,
  "rdap_recommended": true,
  "rdap_url": "https://rdap.verisign.com/com/v1/domain/EXAMPLE.COM",
  "protocol": "rdap",
  "source": "rdap"
}
```

## Requirements

- Node.js >= 14.16.0

## License

MIT

## Author

Sinan Artun

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 