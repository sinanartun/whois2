const { Socket } = require("net");

const getWhoisServer = (tld) => {
  const whoisServers = {
    com: "whois.verisign-grs.com",
    net: "whois.verisign-grs.com",
    org: "whois.pir.org",
    io: "whois.nic.io",
    info: "whois.afilias.net",
    xyz: "whois.nic.xyz",
    dev: "whois.nic.google",
  };
  return whoisServers[tld] || "whois.iana.org";
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
  const whoisServer = getWhoisServer(tld);
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
  
  const result = {};
  const lines = whoisData.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('%') || line.startsWith('#') || !line.trim()) continue;
    
    const match = line.match(/^\s*([^:]+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      const cleanKey = key.trim().replace(/\s+/g, '_').toLowerCase();
      if (cleanKey && value.trim()) {
        result[cleanKey] = value.trim();
      }
    }
  }
  
  return result;
};

module.exports = { queryWhois, parseWhois };
