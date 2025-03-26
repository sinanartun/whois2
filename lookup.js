#!/usr/bin/env node

import { queryWhois } from './index.js';
import { extractWhoisData, extractAllFields } from './whois-regex.js';

// Get domain from command line arguments
const domain = process.argv[2];

if (!domain) {
  console.error('Please provide a .com domain to look up');
  console.error('Usage: node lookup.js example.com');
  process.exit(1);
}

// Function to format dates in a readable way
function formatDate(dateStr) {
  if (!dateStr) return 'Unknown';
  
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
}

// Calculate domain age in years
function calculateAge(dateStr) {
  if (!dateStr) return 'Unknown';
  
  try {
    const creationDate = new Date(dateStr);
    const currentDate = new Date();
    const ageInYears = (currentDate - creationDate) / (1000 * 60 * 60 * 24 * 365);
    return `${Math.floor(ageInYears)} years, ${Math.floor((ageInYears % 1) * 12)} months`;
  } catch (e) {
    return 'Unknown';
  }
}

// Calculate time until expiration
function calculateTimeUntilExpiry(dateStr) {
  if (!dateStr) return 'Unknown';
  
  try {
    const expiryDate = new Date(dateStr);
    const currentDate = new Date();
    
    if (expiryDate < currentDate) {
      return 'Expired';
    }
    
    const daysUntilExpiry = Math.floor((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry > 365) {
      return `${Math.floor(daysUntilExpiry / 365)} years, ${Math.floor((daysUntilExpiry % 365) / 30)} months`;
    } else if (daysUntilExpiry > 30) {
      return `${Math.floor(daysUntilExpiry / 30)} months, ${daysUntilExpiry % 30} days`;
    } else {
      return `${daysUntilExpiry} days`;
    }
  } catch (e) {
    return 'Unknown';
  }
}

async function lookupDomain() {
  console.log(`\n🔍 Looking up WHOIS information for ${domain}...\n`);
  
  try {
    // Query the WHOIS server with referral following
    const whoisData = await queryWhois(domain, { 
      timeout: 10000,
      follow: true
    });
    
    // Extract data
    const info = extractWhoisData(whoisData);
    const allFields = extractAllFields(whoisData);
    
    // Display the results in a clean format
    console.log('=== DOMAIN INFORMATION ===');
    console.log(`Domain: ${info.domain_name || domain}`);
    console.log(`Registrar: ${info.registrar || 'Unknown'}`);
    
    if (allFields.registrar_url) {
      console.log(`Registrar URL: ${allFields.registrar_url}`);
    }
    
    console.log(`\n=== DATES ===`);
    console.log(`Created: ${formatDate(info.creation_date)}`);
    console.log(`Expires: ${formatDate(info.expiration_date)}`);
    console.log(`Last Updated: ${formatDate(info.updated_date)}`);
    console.log(`Domain Age: ${calculateAge(info.creation_date)}`);
    console.log(`Time Until Expiry: ${calculateTimeUntilExpiry(info.expiration_date)}`);
    
    if (allFields.name_servers) {
      console.log(`\n=== NAME SERVERS ===`);
      const nameServers = Array.isArray(allFields.name_servers) 
        ? allFields.name_servers 
        : [allFields.name_servers];
      
      nameServers.forEach(ns => console.log(`- ${ns}`));
    }
    
    if (allFields.status) {
      console.log(`\n=== DOMAIN STATUS ===`);
      const statuses = Array.isArray(allFields.status) 
        ? allFields.status 
        : [allFields.status];
      
      statuses.forEach(status => console.log(`- ${status}`));
    }
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.message.includes('only supports .com domains')) {
      console.log('This tool only works with .com domains. Please provide a valid .com domain.');
    }
  }
}

lookupDomain(); 