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
  // For .com domains, use Verisign's RDAP server
  return `https://rdap.verisign.com/com/v1/domain/${domain}`;
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
    handleRateLimit = true
  } = options;
  
  try {
    let attempts = 0;
    let lastError = null;
    
    while (attempts < retryCount) {
      try {
        const whoisData = await queryWhoisServer(domain, whoisServer, timeout);
        
        // Check for rate limiting
        const rateLimitDelay = extractRateLimit(whoisData);
        if (rateLimitDelay && handleRateLimit && attempts < retryCount - 1) {
          const delayMs = rateLimitDelay * 1000;
          console.warn(`WHOIS rate limit hit. Waiting ${rateLimitDelay} seconds before retry.`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          attempts++;
          continue;
        }
        
        // Check if RDAP is recommended
        if (isRdapRecommended(whoisData)) {
          const rdapUrl = getRdapUrl(domain);
          console.warn(`WHOIS service for ${domain} is being retired. Consider switching to RDAP: ${rdapUrl}`);
          // Still return the WHOIS data even if it suggests using RDAP
        }
        
        if (follow) {
          const referralMatch = whoisData.match(/Registrar WHOIS Server:\s+([^\s]+)/i);
          if (referralMatch && referralMatch[1] && referralMatch[1] !== whoisServer) {
            const referralServer = referralMatch[1];
            if (!referralServer.startsWith('http')) {
              return await queryWhoisServer(domain, referralServer, timeout);
            }
          }
        }
        
        return whoisData;
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
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
  const rawData = await queryWhois(domain, options);
  const parsedData = parseWhois(rawData);
  
  // Check for rate limiting and RDAP
  const rateLimit = extractRateLimit(rawData);
  const rdapRecommended = isRdapRecommended(rawData);
  
  return {
    ...parsedData,
    raw: rawData,
    rate_limited: !!rateLimit,
    rate_limit_seconds: rateLimit || 0,
    rdap_recommended: rdapRecommended,
    rdap_url: rdapRecommended ? getRdapUrl(domain) : null
  };
};

export { whois, queryWhois, parseWhois };
