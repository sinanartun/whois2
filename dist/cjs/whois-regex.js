/**
 * Extract key WHOIS data from raw text using regex patterns
 * @param {string} whoisData - Raw WHOIS data text
 * @return {object} - JSON object with extracted fields
 */
const WHOIS_PATTERNS = {
  // Domain name patterns - handle various formats
  domain_name: /(?:Domain Name|Domain):\s*([^\s\n]+)/i,
  
  // Registrar patterns - handle various formats and multiline
  registrar: /(?:Registrar|Sponsoring Registrar):\s*([^\n]+(?:\n\s+[^\n]+)*)/i,
  
  // Creation date patterns - handle various formats
  creation_date: /(?:Creation Date|Created Date|Created On|Created):\s*([^\n]+)/i,
  
  // Expiration date patterns - handle various formats
  expiration_date: /(?:Registry Expiry Date|Registrar Registration Expiration Date|Expiration Date|Expires On|Expires|Expiration|Expiry Date|Valid Until|Valid Through|Renewal Date|Domain Expiration Date|Domain Expires):\s*([^\n]+)/i,
  
  // Updated date patterns - handle various formats
  updated_date: /(?:Updated Date|Last Updated|Last Modified|Last Updated On):\s*([^\n]+)/i,
  
  // Registrar WHOIS server patterns
  registrar_whois_server: /(?:Registrar WHOIS Server|WHOIS Server):\s*([^\n]+)/i,
  
  // Name server patterns - handle multiple entries
  name_servers: /(?:Name Server|Nameservers?):\s*([^\n]+(?:\n\s+[^\n]+)*)/i,
  
  // Status patterns - handle multiple entries
  status: /(?:Domain Status|Status):\s*([^\n]+(?:\n\s+[^\n]+)*)/i,
  
  // Registrar URL patterns
  registrar_url: /(?:Registrar URL|URL):\s*([^\n]+)/i,
  
  // Registrar ID patterns
  registrar_id: /(?:Registrar IANA ID|Registrar ID):\s*([^\n]+)/i,
  
  // Contact information patterns
  admin_name: /(?:Admin Name|Administrative Contact Name):\s*([^\n]+)/i,
  admin_organization: /(?:Admin Organization|Administrative Contact Organization):\s*([^\n]+)/i,
  admin_email: /(?:Admin Email|Administrative Contact Email):\s*([^\n]+)/i,
  admin_phone: /(?:Admin Phone|Administrative Contact Phone):\s*([^\n]+)/i,
  admin_country: /(?:Admin Country|Administrative Contact Country):\s*([^\n]+)/i,
  
  tech_name: /(?:Tech Name|Technical Contact Name):\s*([^\n]+)/i,
  tech_organization: /(?:Tech Organization|Technical Contact Organization):\s*([^\n]+)/i,
  tech_email: /(?:Tech Email|Technical Contact Email):\s*([^\n]+)/i,
  tech_phone: /(?:Tech Phone|Technical Contact Phone):\s*([^\n]+)/i,
  tech_country: /(?:Tech Country|Technical Contact Country):\s*([^\n]+)/i
};

function extractWhoisData(whoisData) {
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
  
  // Remove any timezone abbreviations or offsets
  dateStr = dateStr.replace(/\s+(?:UTC|GMT|EST|EDT|CST|CDT|MST|MDT|PST|PDT|[+-]\d{4})/i, '');
  
  // Handle common date formats
  const formats = [
    // YYYY-MM-DD
    /^(\d{4})-(\d{2})-(\d{2})/,
    // DD/MM/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/,
    // MM/DD/YYYY
    /^(\d{2})\/(\d{2})\/(\d{4})/,
    // DD.MM.YYYY
    /^(\d{2})\.(\d{2})\.(\d{4})/,
    // YYYY.MM.DD
    /^(\d{4})\.(\d{2})\.(\d{2})/,
    // DD-MM-YYYY
    /^(\d{2})-(\d{2})-(\d{4})/,
    // YYYY/MM/DD
    /^(\d{4})\/(\d{2})\/(\d{2})/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      const [_, year, month, day] = match;
      // If year is in 2-digit format, assume 20xx for years 00-29, 19xx for 30-99
      const fullYear = year.length === 2 
        ? (parseInt(year) < 30 ? '20' + year : '19' + year)
        : year;
      
      // Create date object and validate
      const date = new Date(`${fullYear}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
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
function extractAllFields(whoisData) {
  if (!whoisData) return {};
  
  const result = {};
  
  // First extract known fields using our specific patterns
  for (const [field, pattern] of Object.entries(WHOIS_PATTERNS)) {
    // Get all matches for patterns that might appear multiple times
    const regex = new RegExp(pattern.source, pattern.flags + 'g');
    const matches = [...whoisData.matchAll(regex)];
    
    if (matches.length > 0) {
      // If we have multiple matches, collect them in an array
      if (matches.length > 1 && (field === 'name_servers' || field === 'status')) {
        result[field] = matches.map(match => match[1].trim());
      } else {
        // Otherwise just take the first match
        const value = matches[0][1].trim();
        result[field] = field.includes('date') ? normalizeDate(value) : value;
      }
    }
  }

  // Extract any remaining key-value pairs that follow the pattern "Key: Value"
  const lines = whoisData.split('\n');
  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      const value = match[2].trim();
      if (value && !result[key]) {
        result[key] = value;
      }
    }
  }
  
  return result;
}

function getRegexPatterns() {
  return WHOIS_PATTERNS;
}

function getFieldDescription(field) {
  const descriptions = {
    domain_name: 'Domain name',
    registrar: 'Registrar name',
    creation_date: 'Domain creation date',
    expiration_date: 'Domain expiration date',
    updated_date: 'Last update date',
    registrar_whois_server: 'Registrar WHOIS server',
    name_servers: 'Domain name servers',
    status: 'Domain status',
    registrar_url: 'Registrar URL',
    registrar_id: 'Registrar ID',
    admin_name: 'Administrative contact name',
    admin_organization: 'Administrative contact organization',
    admin_email: 'Administrative contact email',
    admin_phone: 'Administrative contact phone',
    admin_country: 'Administrative contact country',
    tech_name: 'Technical contact name',
    tech_organization: 'Technical contact organization',
    tech_email: 'Technical contact email',
    tech_phone: 'Technical contact phone',
    tech_country: 'Technical contact country'
  };
  return descriptions[field] || field;
}

// Example usage:
// import { extractWhoisData } from './whois-regex.js';
// const whoisText = '...raw WHOIS data...';
// const parsedData = extractWhoisData(whoisText);
// console.log(JSON.stringify(parsedData, null, 2)); 