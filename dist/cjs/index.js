const { Socket } = require("net");

const getWhoisServer = () => {
  // For .com domains, always use the official Verisign WHOIS server
  return "whois.verisign-grs.com";
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
    follow = false 
  } = options;
  
  try {
    const whoisData = await queryWhoisServer(domain, whoisServer, timeout);
    
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
  if (!whoisData) return {};
  
  const result = {
    domain_name: null,
    registrar: null,
    creation_date: null,
    expiration_date: null,
    updated_date: null
  };
  
  // Domain name pattern - .com specific format
  const domainNameMatch = whoisData.match(/Domain Name:\s*([^\s\n]+)/i);
  if (domainNameMatch && domainNameMatch[1]) {
    result.domain_name = domainNameMatch[1].trim();
  }
  
  // Registrar pattern - .com specific format
  const registrarPattern = /Registrar:\s*([^\n]+)/i;
  const registrarMatch = whoisData.match(registrarPattern);
  if (registrarMatch && registrarMatch[1]) {
    result.registrar = registrarMatch[1].trim();
  }
  
  // Creation date - .com specific format
  const creationPattern = /Creation Date:\s*([^\n]+)/i;
  const creationMatch = whoisData.match(creationPattern);
  if (creationMatch && creationMatch[1]) {
    result.creation_date = normalizeDate(creationMatch[1].trim());
  }
  
  // Expiration date - .com specific format
  const expirationPattern = /Registry Expiry Date:\s*([^\n]+)/i;
  const expirationMatch = whoisData.match(expirationPattern);
  if (expirationMatch && expirationMatch[1]) {
    result.expiration_date = normalizeDate(expirationMatch[1].trim());
  }
  
  // Updated date - .com specific format
  const updatedPattern = /Updated Date:\s*([^\n]+)/i;
  const updatedMatch = whoisData.match(updatedPattern);
  if (updatedMatch && updatedMatch[1]) {
    result.updated_date = normalizeDate(updatedMatch[1].trim());
  }
  
  return result;
};

const normalizeDate = (dateStr) => {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateStr)) {
    return dateStr;
  }
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (e) {
    // If conversion fails, return the original string
  }
  
  return dateStr;
};

const whois = async (domain, options = {}) => {
  const rawData = await queryWhois(domain, options);
  return parseWhois(rawData);
};

export { whois, queryWhois, parseWhois };
