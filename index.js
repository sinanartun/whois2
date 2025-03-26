import { Socket } from 'net';
import { extractWhoisData } from './whois-regex.js';

const getWhoisServer = () => {
  // For .com domains, always use the official Verisign WHOIS server
  return "whois.verisign-grs.com";
};

/**
 * Extract rate limit information from WHOIS response
 * @param {string} data - WHOIS response
 * @returns {number|null} - Seconds to wait or null if no rate limit
 */
const extractRateLimit = (data) => {
  if (!data) return null;
  
  // Check for common rate limit patterns
  const rateLimitMatch = data.match(/Rate limit exceeded\.\s+Try again after:\s+(\d+)s/i) || 
                         data.match(/Too many requests\.\s+Please wait (\d+) seconds/i) ||
                         data.match(/Query rate limit exceeded\.\s+Wait for (\d+) seconds/i);
  
  if (rateLimitMatch && rateLimitMatch[1]) {
    return parseInt(rateLimitMatch[1], 10);
  }
  
  return null;
};

/**
 * Check if WHOIS is being retired in favor of RDAP
 * @param {string} data - WHOIS response
 * @returns {boolean} - True if RDAP recommendation is found
 */
const isRdapRecommended = (data) => {
  if (!data) return false;
  
  return /This WHOIS server is being retired\.\s+Please use our RDAP service instead/i.test(data) ||
         /RDAP has replaced WHOIS/i.test(data) ||
         /WHOIS service is deprecated\.\s+Please use RDAP instead/i.test(data);
};

/**
 * Get the RDAP URL for a domain
 * @param {string} domain - Domain name
 * @returns {string} - RDAP URL
 */
const getRdapUrl = (domain) => {
  const tld = domain.split('.').pop().toLowerCase();
  // For .com domains, use Verisign's RDAP server
  if (tld === 'com') {
    return `https://rdap.verisign.com/com/v1/domain/${domain}`;
  }
  // For other TLDs, you would add their RDAP servers here
  return `https://rdap.verisign.com/${tld}/v1/domain/${domain}`;
};

/**
 * Fetch data from RDAP server
 * @param {string} domain - Domain name 
 * @returns {Promise<Object>} - Parsed RDAP data
 */
const fetchRdapData = async (domain) => {
  try {
    const rdapUrl = getRdapUrl(domain);
    const response = await fetch(rdapUrl);
    
    if (!response.ok) {
      throw new Error(`RDAP server responded with status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to fetch RDAP data: ${error.message}`);
  }
};

/**
 * Parse RDAP data into standardized format
 * @param {Object} rdapData - Raw RDAP response
 * @returns {Object} - Parsed RDAP data in standardized format
 */
const parseRdapData = (rdapData) => {
  if (!rdapData) return {};
  
  const result = {
    domain_name: null,
    registrar: null,
    creation_date: null,
    expiration_date: null,
    updated_date: null,
    name_servers: [],
    status: [],
    source: 'rdap'
  };
  
  // Extract domain name
  if (rdapData.ldhName) {
    result.domain_name = rdapData.ldhName;
  }
  
  // Extract registrar
  if (rdapData.entities && rdapData.entities.length > 0) {
    for (const entity of rdapData.entities) {
      if (entity.roles && entity.roles.includes('registrar')) {
        if (entity.vcardArray && entity.vcardArray[1] && entity.vcardArray[1].length > 0) {
          for (const vcardEntry of entity.vcardArray[1]) {
            if (vcardEntry[0] === 'fn') {
              result.registrar = vcardEntry[3];
              break;
            }
          }
        }
      }
    }
  }
  
  // Extract dates
  if (rdapData.events && rdapData.events.length > 0) {
    for (const event of rdapData.events) {
      if (event.eventAction === 'registration' && event.eventDate) {
        result.creation_date = event.eventDate;
      } else if (event.eventAction === 'expiration' && event.eventDate) {
        result.expiration_date = event.eventDate;
      } else if ((event.eventAction === 'last changed' || event.eventAction === 'last update') && event.eventDate) {
        result.updated_date = event.eventDate;
      }
    }
  }
  
  // Extract nameservers
  if (rdapData.nameservers && rdapData.nameservers.length > 0) {
    result.name_servers = rdapData.nameservers.map(ns => ns.ldhName);
  }
  
  // Extract status
  if (rdapData.status && rdapData.status.length > 0) {
    result.status = rdapData.status;
  }
  
  // Extract the raw JSON as a string
  result.raw = JSON.stringify(rdapData);
  
  return result;
};

const queryWhois = async (domain, options = {}) => {
  if (!domain || typeof domain !== 'string') {
    throw new Error('Domain name is required and must be a string');
  }
  
  const domainParts = domain.split(".");
  if (domainParts.length < 2) {
    throw new Error('Invalid domain format');
  }
  
  const tld = domainParts[domainParts.length - 1];
  if (tld.toLowerCase() !== 'com') {
    throw new Error('This library only supports .com domains');
  }
  
  const whoisServer = getWhoisServer();
  const { 
    timeout = 5000, 
    follow = false,
    retryCount = 3,
    retryDelay = 1000,
    handleRateLimit = true,
    useRdapOnRateLimit = true
  } = options;
  
  try {
    let attempts = 0;
    let lastError = null;
    
    while (attempts < retryCount) {
      try {
        const whoisData = await queryWhoisServer(domain, whoisServer, timeout);
        
        // Check for rate limiting
        const rateLimitDelay = extractRateLimit(whoisData);
        const rdapRecommended = isRdapRecommended(whoisData);
        
        // If rate limited and we're configured to use RDAP on rate limit
        if ((rateLimitDelay || rdapRecommended) && useRdapOnRateLimit) {
          console.warn(`WHOIS rate limited or deprecated. Switching to RDAP for ${domain}`);
          try {
            const rdapData = await fetchRdapData(domain);
            return { 
              data: parseRdapData(rdapData), 
              protocol: 'rdap',
              raw: JSON.stringify(rdapData)
            };
          } catch (rdapError) {
            console.warn(`RDAP fetch failed: ${rdapError.message}. Falling back to WHOIS.`);
          }
        }
        
        // If rate limited and we should handle it with retries
        if (rateLimitDelay && handleRateLimit && attempts < retryCount - 1) {
          const delayMs = rateLimitDelay * 1000;
          console.warn(`WHOIS rate limit hit. Waiting ${rateLimitDelay} seconds before retry.`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          attempts++;
          continue;
        }
        
        if (follow) {
          const referralMatch = whoisData.match(/Registrar WHOIS Server:\s+([^\s]+)/i);
          if (referralMatch && referralMatch[1] && referralMatch[1] !== whoisServer) {
            const referralServer = referralMatch[1];
            if (!referralServer.startsWith('http')) {
              return { 
                data: whoisData, 
                protocol: 'whois',
                raw: whoisData
              };
            }
          }
        }
        
        return { 
          data: whoisData, 
          protocol: 'whois',
          raw: whoisData
        };
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // If all WHOIS attempts failed, try RDAP as a last resort
    if (useRdapOnRateLimit) {
      try {
        console.warn(`All WHOIS attempts failed. Trying RDAP as fallback for ${domain}`);
        const rdapData = await fetchRdapData(domain);
        return { 
          data: parseRdapData(rdapData), 
          protocol: 'rdap',
          raw: JSON.stringify(rdapData)
        };
      } catch (rdapError) {
        // If RDAP fails too, throw the original error
        console.warn(`RDAP fallback failed: ${rdapError.message}`);
      }
    }
    
    throw lastError || new Error('Maximum retry attempts reached');
  } catch (error) {
    throw new Error(`WHOIS lookup failed: ${error.message}`);
  }
};

const queryWhoisServer = (domain, server, timeout) => {
  return new Promise((resolve, reject) => {
    let whoisData = '';
    const client = new Socket();
    
    client.setTimeout(timeout);
    
    client.connect(43, server, () => {
      client.write(`${domain}\r\n`);
    });

    client.on("data", (data) => {
      whoisData += data.toString();
    });

    client.on("end", () => {
      resolve(whoisData);
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error(`Connection to ${server} timed out`));
    });

    client.on("error", (err) => {
      reject(new Error(`Error querying ${server}: ${err.message}`));
    });
  });
};

const parseWhois = (whoisData) => {
  return extractWhoisData(whoisData);
};

const whois = async (domain, options = {}) => {
  const result = await queryWhois(domain, options);
  
  if (result.protocol === 'rdap') {
    // RDAP data is already parsed
    return {
      ...result.data,
      raw: result.raw,
      rate_limited: false,
      rate_limit_seconds: 0,
      rdap_recommended: true,
      rdap_url: getRdapUrl(domain),
      protocol: 'rdap'
    };
  } else {
    // Parse WHOIS data
    const parsedData = parseWhois(result.data);
    const rateLimit = extractRateLimit(result.data);
    const rdapRecommended = isRdapRecommended(result.data);
    
    return {
      ...parsedData,
      raw: result.data,
      rate_limited: !!rateLimit,
      rate_limit_seconds: rateLimit || 0,
      rdap_recommended: rdapRecommended,
      rdap_url: rdapRecommended ? getRdapUrl(domain) : null,
      protocol: 'whois'
    };
  }
};

export { whois, queryWhois, parseWhois, fetchRdapData, parseRdapData };
