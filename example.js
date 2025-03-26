import { queryWhois, parseWhois } from './index.js';

console.log('Looking up example.com...');
try {
  const data = await queryWhois('example.com');
  console.log('WHOIS data for example.com:');
  console.log(data);
  
  const parsedData = parseWhois(data);
  console.log('\nParsed WHOIS data:');
  console.log(JSON.stringify(parsedData, null, 2));
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\nLooking up github.com with referral following...');
try {
  const data = await queryWhois('github.com', { 
    timeout: 10000,
    follow: true
  });
  console.log('WHOIS data for github.com:');
  console.log(data);
} catch (error) {
  console.error('Error:', error.message);
}

const domains = ['google.com', 'facebook.com', 'twitter.com'];
console.log('\nLooking up multiple domains...');

const results = await Promise.allSettled(
  domains.map(domain => queryWhois(domain))
);

results.forEach((result, index) => {
  const domain = domains[index];
  if (result.status === 'fulfilled') {
    console.log(`\n✅ Successfully looked up ${domain}`);
    const parsed = parseWhois(result.value);
    console.log(`Registrar: ${parsed.registrar || 'Unknown'}`);
    console.log(`Creation Date: ${parsed.creation_date || 'Unknown'}`);
  } else {
    console.log(`\n❌ Failed to look up ${domain}: ${result.reason.message}`);
  }
}); 