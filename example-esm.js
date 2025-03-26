import { queryWhois, parseWhois } from './index.js';

console.log('Looking up example.com...');
try {

  const whoisData = await queryWhois('example.com');
  const { domain_name, registrar, creation_date, expiration_date } = parseWhois(whoisData);
  
  console.log(`Domain: ${domain_name || 'example.com'}`);
  console.log(`Registrar: ${registrar || 'Unknown'}`);
  console.log(`Created: ${creation_date || 'Unknown'}`);
  console.log(`Expires: ${expiration_date || 'Unknown'}`);
} catch (error) {
  console.error(`Error: ${error.message}`);
}

const domains = ['google.com', 'microsoft.com', 'apple.com'];
console.log('\nLooking up multiple domains concurrently...');

const domainPromises = domains.map(async (domain) => {
  try {
    const data = await queryWhois(domain);
    return {
      domain,
      data: parseWhois(data),
      success: true
    };
  } catch (error) {
    return {
      domain,
      error: error.message,
      success: false
    };
  }
});

const results = await Promise.all(domainPromises);

results.forEach(result => {
  if (result.success) {
    console.log(`\n--- ${result.domain} ---`);
    console.log(`Registrar: ${result.data.registrar || 'Unknown'}`);
    console.log(`Creation Date: ${result.data.creation_date || 'Unknown'}`);
  } else {
    console.log(`\n--- ${result.domain} ---`);
    console.log(`Error: ${result.error}`);
  }
}); 
