import fs from 'fs/promises';

// Get the file name from command line arguments
const resultFile = process.argv[2];

if (!resultFile) {
  console.error('Please provide the path to the domain-whois-results JSON file');
  console.error('Example: node analyze-domains.js domain-whois-results-2025-03-26T07-40-15-956Z.json');
  process.exit(1);
}

async function analyzeDomains() {
  try {
    // Read and parse the JSON file
    const data = await fs.readFile(resultFile, 'utf8');
    const domains = JSON.parse(data);
    
    console.log(`Analyzing ${domains.length} domains from ${resultFile}\n`);
    
    // Calculate statistics
    const stats = {
      total: domains.length,
      successful: domains.filter(d => !d.error).length,
      failed: domains.filter(d => d.error).length,
      registrars: {},
      expiryYears: {},
      ageGroups: {
        'Less than 5 years': 0,
        '5-10 years': 0,
        '10-15 years': 0,
        '15-20 years': 0,
        'More than 20 years': 0
      }
    };
    
    // Process each domain
    domains.forEach(domain => {
      if (domain.error) return;
      
      // Count registrars
      const registrar = domain.registrar || 'Unknown';
      stats.registrars[registrar] = (stats.registrars[registrar] || 0) + 1;
      
      // Calculate age groups
      if (domain.creation_date) {
        const creationDate = new Date(domain.creation_date);
        const currentDate = new Date();
        const ageInYears = (currentDate - creationDate) / (1000 * 60 * 60 * 24 * 365);
        
        if (ageInYears < 5) stats.ageGroups['Less than 5 years']++;
        else if (ageInYears < 10) stats.ageGroups['5-10 years']++;
        else if (ageInYears < 15) stats.ageGroups['10-15 years']++;
        else if (ageInYears < 20) stats.ageGroups['15-20 years']++;
        else stats.ageGroups['More than 20 years']++;
      }
      
      // Count expiry years
      if (domain.expiration_date) {
        const expiryYear = new Date(domain.expiration_date).getFullYear();
        stats.expiryYears[expiryYear] = (stats.expiryYears[expiryYear] || 0) + 1;
      }
    });
    
    // Print analysis results
    console.log('=== Domain Analysis ===\n');
    
    console.log(`Total domains: ${stats.total}`);
    console.log(`Successful lookups: ${stats.successful}`);
    console.log(`Failed lookups: ${stats.failed}`);
    
    console.log('\n=== Registrar Distribution ===');
    Object.entries(stats.registrars)
      .sort((a, b) => b[1] - a[1])
      .forEach(([registrar, count]) => {
        console.log(`${registrar}: ${count} domains (${(count/stats.successful*100).toFixed(1)}%)`);
      });
    
    console.log('\n=== Domain Age Distribution ===');
    Object.entries(stats.ageGroups)
      .forEach(([ageGroup, count]) => {
        if (count > 0) {
          console.log(`${ageGroup}: ${count} domains (${(count/stats.successful*100).toFixed(1)}%)`);
        }
      });
    
    console.log('\n=== Expiration Year Distribution ===');
    Object.entries(stats.expiryYears)
      .sort((a, b) => a[0] - b[0])
      .forEach(([year, count]) => {
        console.log(`${year}: ${count} domains`);
      });
      
    // Create a detailed table view of all domains
    console.log('\n=== Detailed Domain Information ===');
    console.log('Domain\tRegistrar\tCreated\tExpires');
    console.log('------\t---------\t-------\t-------');
    
    domains.forEach(domain => {
      if (domain.error) {
        console.log(`${domain.domain}\tError: ${domain.error}`);
      } else {
        const created = domain.creation_date ? new Date(domain.creation_date).toISOString().split('T')[0] : 'Unknown';
        const expires = domain.expiration_date ? new Date(domain.expiration_date).toISOString().split('T')[0] : 'Unknown';
        console.log(`${domain.domain}\t${domain.registrar || 'Unknown'}\t${created}\t${expires}`);
      }
    });
    
  } catch (error) {
    console.error(`Error analyzing domains: ${error.message}`);
  }
}

analyzeDomains(); 