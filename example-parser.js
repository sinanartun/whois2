import { queryWhois, parseWhois } from './index.js';

const domainSamples = [
  'example.com',
  'google.com',
  'github.com',
  'microsoft.com'
];

async function testParser() {
  console.log('Testing WHOIS Parser with Regex Extraction\n');
  
  for (const domain of domainSamples) {
    console.log(`Looking up ${domain}...`);
    
    try {
      // Get the raw WHOIS data
      const whoisData = await queryWhois(domain, { follow: true });
      
      // Parse the data using our regex patterns
      const parsedData = parseWhois(whoisData);
      
      // Output as formatted JSON
      console.log(JSON.stringify(parsedData, null, 2));
      console.log('---------------------------------------\n');
    } catch (error) {
      console.error(`Error for ${domain}: ${error.message}`);
      console.log('---------------------------------------\n');
    }
  }
}

// Run the parser test
testParser(); 