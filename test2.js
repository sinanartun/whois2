import { queryWhois } from './index.js';
import { extractWhoisData, extractAllFields } from './whois-regex.js';
import fs from 'fs/promises';

// List of domains to look up
const domains = [
  'bzat.com',
  'qhnu.com',
  'dztu.com',
  'giyc.com',
  'wwyp.com',
  'zduo.com',
  'coez.com',
  'zmwg.com',
  'eput.com',
  'xebs.com',
  'ljom.com',
  'guib.com',
  'aayq.com',
  'gtxp.com',
  'vgzj.com',
  'bthu.com'
];

// Function to process a single domain with retry logic
async function processDomain(domain, retries = 2) {
  console.log(`Processing ${domain}...`);
  
  try {
    // Query the WHOIS server with referral following enabled
    const whoisData = await queryWhois(domain, { 
      timeout: 10000,
      follow: true
    });
    
    // Extract both basic and full information
    const basicInfo = extractWhoisData(whoisData);
    const fullInfo = extractAllFields(whoisData);
    
    // Create a combined result with the most important fields
    const result = {
      domain: domain,
      registrar: basicInfo.registrar || null,
      creation_date: basicInfo.creation_date || null,
      expiration_date: basicInfo.expiration_date || null,
      updated_date: basicInfo.updated_date || null,
      name_servers: fullInfo.name_servers || null,
      status: fullInfo.status || null,
      raw_data: whoisData // Store raw data for debugging or additional parsing
    };
    
    console.log(`✅ Successfully processed ${domain}`);
    return result;
  } catch (error) {
    if (retries > 0) {
      console.log(`⚠️ Error processing ${domain}, retrying (${retries} attempts left): ${error.message}`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 3000));
      return processDomain(domain, retries - 1);
    } else {
      console.error(`❌ Failed to process ${domain} after multiple attempts: ${error.message}`);
      return {
        domain: domain,
        error: error.message,
        status: 'failed'
      };
    }
  }
}

// Main function to process all domains and save results
async function processAllDomains() {
  console.log(`Starting WHOIS lookup for ${domains.length} domains...\n`);
  
  const results = [];
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = `domain-whois-results-${timestamp}.json`;
  
  // Process domains with a small delay between each to avoid rate limiting
  for (const domain of domains) {
    const result = await processDomain(domain);
    results.push(result);
    
    // Brief pause between requests to be respectful to WHOIS servers
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Save intermediate results after each domain
    try {
      await fs.writeFile(
        outputFile, 
        JSON.stringify(results, null, 2)
      );
      console.log(`Saved intermediate results to ${outputFile}\n`);
    } catch (error) {
      console.error(`Error saving intermediate results: ${error.message}`);
    }
  }
  
  // Save final results
  try {
    await fs.writeFile(
      outputFile, 
      JSON.stringify(results, null, 2)
    );
    console.log(`\nAll done! Results saved to ${outputFile}`);
    
    // Also save a summary file with just the key information
    const summary = results.map(r => ({
      domain: r.domain,
      registrar: r.registrar,
      creation_date: r.creation_date,
      expiration_date: r.expiration_date,
      status: r.error ? 'failed' : 'success'
    }));
    
    await fs.writeFile(
      `domain-summary-${timestamp}.json`, 
      JSON.stringify(summary, null, 2)
    );
    console.log(`Summary saved to domain-summary-${timestamp}.json`);
    
  } catch (error) {
    console.error(`Error saving final results: ${error.message}`);
  }
  
  // Print a summary
  const successful = results.filter(r => !r.error).length;
  console.log(`\nProcessed ${domains.length} domains: ${successful} successful, ${domains.length - successful} failed`);
}

// Run the main function
processAllDomains().catch(error => {
  console.error(`Fatal error: ${error.message}`);
}); 