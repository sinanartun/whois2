/**
 * Extract key WHOIS data from raw text using regex patterns
 * @param {string} whoisData - Raw WHOIS data text
 * @return {object} - JSON object with extracted fields
 */
export const WHOIS_PATTERNS = {
  domain_name: /Domain Name:\s*([^\s\n]+)/i,
  registrar: /Registrar:\s*([^\n]+)/i,
  creation_date: /Creation Date:\s*([^\n]+)/i,
  expiration_date: /(?:Registry Expiry Date|Registrar Registration Expiration Date):\s*([^\n]+)/i,
  updated_date: /Updated Date:\s*([^\n]+)/i,
  registrar_whois_server: /Registrar WHOIS Server:\s*([^\n]+)/i,
  name_servers: /Name Server:\s*([^\n]+)/i,
  status: /Domain Status:\s*([^\n]+)/i,
  registrar_url: /Registrar URL:\s*([^\n]+)/i,
  registrar_id: /Registrar IANA ID:\s*([^\n]+)/i
};

export function extractWhoisData(whoisData) {
  if (!whoisData) return {};
  
  const result = {
    domain_name: null,
    registrar: null,
    creation_date: null,
    expiration_date: null,
    updated_date: null
  };
  
  for (const [field, pattern] of Object.entries(WHOIS_PATTERNS)) {
    // We only extract the standard fields for the basic result
    if (!result.hasOwnProperty(field)) continue;
    
    const match = whoisData.match(pattern);
    if (match && match[1]) {
      result[field] = field.includes('date') 
        ? normalizeDate(match[1].trim()) 
        : match[1].trim();
    }
  }
  
  return result;
}

/**
 * Normalize date formats to ISO format when possible
 * @param {string} dateStr - Raw date string from WHOIS
 * @return {string} - Normalized date string
 */
function normalizeDate(dateStr) {
  // If it's already an ISO format, return as is
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) {
    return dateStr;
  }
  
  try {
    // Try to convert to a standard format
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // If conversion fails, return the original string
  }
  
  return dateStr;
}

/**
 * Extract all WHOIS key-value pairs using regex
 * @param {string} whoisData - Raw WHOIS data
 * @return {object} - All key-value pairs found
 */
export function extractAllFields(whoisData) {
  if (!whoisData) return {};
  
  const result = {};
  
  // First extract known fields using our specific patterns
  for (const [field, pattern] of Object.entries(WHOIS_PATTERNS)) {
    // Get all matches for patterns like Name Server that might appear multiple times
    const regex = new RegExp(pattern.source, pattern.flags + 'g');
    const matches = [...whoisData.matchAll(regex)];
    
    if (matches.length > 0) {
      // If we have multiple matches (like Name Server), collect them in an array
      if (matches.length > 1 && field === 'name_servers') {
        result[field] = matches.map(match => match[1].trim());
      } else if (matches.length > 1 && field === 'status') {
        result[field] = matches.map(match => match[1].trim());
      } else {
        // Otherwise just take the first match
        const value = matches[0][1].trim();
        result[field] = field.includes('date') ? normalizeDate(value) : value;
      }
    }
  }
  

  const lines = whoisData.split('\n');
  const keyValuePattern = /^\s*([^:]+):\s*(.*)$/;
  
  for (const line of lines) {
    if (line.startsWith('%') || line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(keyValuePattern);
    if (match && match[1] && match[2] !== undefined) {
      const [, key, value] = match;
      const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      
      const knownKeys = Object.keys(WHOIS_PATTERNS).map(k => k.toLowerCase());
      if (knownKeys.includes(cleanKey)) continue;
      
      if (cleanKey && value.trim()) {
        if (cleanKey.includes('date') || cleanKey.includes('expiry') || cleanKey.includes('created')) {
          result[cleanKey] = normalizeDate(value.trim());
        } else {
          result[cleanKey] = value.trim();
        }
      }
    }
  }
  
  return result;
}

export function getRegexPatterns() {
  return Object.entries(WHOIS_PATTERNS).map(([field, pattern]) => ({
    field,
    pattern: pattern.toString(),
    description: getFieldDescription(field)
  }));
}

function getFieldDescription(field) {
  const descriptions = {
    domain_name: "The registered domain name",
    registrar: "The domain registrar company",
    creation_date: "When the domain was first registered",
    expiration_date: "When the domain registration expires",
    updated_date: "When the domain record was last updated",
    registrar_whois_server: "The registrar's WHOIS server",
    name_servers: "The domain's name servers",
    status: "The domain's status codes",
    registrar_url: "The registrar's website URL",
    registrar_id: "The registrar's IANA ID"
  };
  
  return descriptions[field] || "No description available";
}

// Example usage:
// import { extractWhoisData } from './whois-regex.js';
// const whoisText = '...raw WHOIS data...';
// const parsedData = extractWhoisData(whoisText);
// console.log(JSON.stringify(parsedData, null, 2)); 