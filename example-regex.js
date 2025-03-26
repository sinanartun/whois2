import { queryWhois } from './index.js';
import { 
  extractWhoisData, 
  extractAllFields, 
  getRegexPatterns,
  WHOIS_PATTERNS 
} from './whois-regex.js';

// Display the regex patterns for .com domains
console.log('WHOIS Data Extraction Patterns for .COM Domains:');
console.log('=============================================\n');

const patterns = getRegexPatterns();
patterns.forEach(({ field, pattern, description }) => {
  console.log(`Field: ${field}`);
  console.log(`Description: ${description}`);
  console.log(`Pattern: ${pattern}`);
  console.log('------------------------------\n');
});

// Sample test data for a .com domain
const sampleWhoisData = `
Domain Name: EXAMPLE.COM
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.iana.org
Registrar URL: http://res-dom.iana.org
Updated Date: 2024-08-14T07:01:34Z
Creation Date: 1995-08-14T04:00:00Z
Registry Expiry Date: 2025-08-13T04:00:00Z
Registrar: RESERVED-Internet Assigned Numbers Authority
Registrar IANA ID: 376
Registrar Abuse Contact Email:
Registrar Abuse Contact Phone:
Domain Status: clientDeleteProhibited https://icann.org/epp#clientDeleteProhibited
Domain Status: clientTransferProhibited https://icann.org/epp#clientTransferProhibited
Domain Status: clientUpdateProhibited https://icann.org/epp#clientUpdateProhibited
Name Server: A.IANA-SERVERS.NET
Name Server: B.IANA-SERVERS.NET
DNSSEC: signedDelegation
`;

// Test extraction with sample data
console.log('Extraction Results from Sample .COM Data:');
console.log('======================================\n');

// Extract key fields (domain, registrar, dates)
const parsedSample = extractWhoisData(sampleWhoisData);
console.log('Key WHOIS Fields:');
console.log(JSON.stringify(parsedSample, null, 2));

// Extract all fields including name servers, status codes, etc.
const allSampleFields = extractAllFields(sampleWhoisData);
console.log('\nAll Extracted WHOIS Fields:');
console.log(JSON.stringify(allSampleFields, null, 2));

// Test with live data
async function testWithLiveData() {
  console.log('\nLive .COM Domain WHOIS Extraction:');
  console.log('================================\n');
  
  // Test popular .com domains
  const comDomains = ['google.com', 'microsoft.com', 'apple.com'];
  
  for (const domain of comDomains) {
    try {
      console.log(`\nQuerying WHOIS for: ${domain}\n`);
      
      const whoisData = await queryWhois(domain, { timeout: 10000 });
      
      // Extract key fields
      const keyFields = extractWhoisData(whoisData);
      console.log(`${domain} - Key WHOIS Fields:`);
      console.log(JSON.stringify(keyFields, null, 2));
      
      // Extract all fields
      const allFields = extractAllFields(whoisData);
      
      // Show specific important fields in a structured format
      console.log(`\n${domain} - Domain Details:`);
      
      if (allFields.name_servers) {
        console.log('\nName Servers:');
        const nameServers = Array.isArray(allFields.name_servers) 
          ? allFields.name_servers 
          : [allFields.name_servers];
        nameServers.forEach(ns => console.log(`- ${ns}`));
      }
      
      if (allFields.status) {
        console.log('\nDomain Status:');
        const statuses = Array.isArray(allFields.status) 
          ? allFields.status 
          : [allFields.status];
        statuses.forEach(status => console.log(`- ${status}`));
      }
      
      console.log('\n---------------------------------------');
    } catch (error) {
      console.error(`Error for ${domain}: ${error.message}`);
      console.log('---------------------------------------');
    }
  }
}

// Run the live test
testWithLiveData(); 