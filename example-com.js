import { queryWhois, parseWhois } from './index.js';
import { extractWhoisData, extractAllFields } from './whois-regex.js';

// Function to check if a string is a valid .com domain
function isValidComDomain(domain) {
  return typeof domain === 'string' && 
         /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.com$/.test(domain);
}

// Function to extract and display WHOIS information
async function getComDomainInfo(domain) {
  if (!isValidComDomain(domain)) {
    console.error(`Error: "${domain}" is not a valid .com domain`);
    return null;
  }
  
  console.log(`Looking up WHOIS data for ${domain}...\n`);
  
  try {
    // Query the WHOIS server
    const whoisData = await queryWhois(domain, { 
      timeout: 8000,
      follow: true  // Follow referrals to registrar WHOIS servers
    });
    
    // Extract key information
    const info = extractWhoisData(whoisData);
    
    // Format the output
    const result = {
      domain: info.domain_name || domain,
      registrar: info.registrar || 'Unknown',
      registered: info.creation_date || 'Unknown',
      expires: info.expiration_date || 'Unknown',
      lastUpdated: info.updated_date || 'Unknown'
    };
    
    // Also extract additional info like name servers
    const fullInfo = extractAllFields(whoisData);
    
    // Add nameservers if available
    if (fullInfo.name_servers) {
      result.nameservers = Array.isArray(fullInfo.name_servers) 
        ? fullInfo.name_servers 
        : [fullInfo.name_servers];
    }
    
    // Add status codes if available
    if (fullInfo.status) {
      result.status = Array.isArray(fullInfo.status) 
        ? fullInfo.status 
        : [fullInfo.status];
    }
    
    return result;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Check if domain was provided as command line argument
const domainToLookup = process.argv[2] || 'example.com';

// Run the WHOIS lookup
getComDomainInfo(domainToLookup)
  .then(result => {
    if (result) {
      console.log('Domain Information:');
      console.log('===================\n');
      console.log(`Domain: ${result.domain}`);
      console.log(`Registrar: ${result.registrar}`);
      console.log(`Registration Date: ${result.registered}`);
      console.log(`Expiration Date: ${result.expires}`);
      console.log(`Last Updated: ${result.lastUpdated}`);
      
      if (result.nameservers) {
        console.log('\nName Servers:');
        result.nameservers.forEach(ns => console.log(`- ${ns}`));
      }
      
      if (result.status) {
        console.log('\nDomain Status:');
        result.status.forEach(status => console.log(`- ${status}`));
      }
      
      // Output as JSON
      console.log('\nJSON Format:');
      console.log(JSON.stringify(result, null, 2));
    }
  }); 