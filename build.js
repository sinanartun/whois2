import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createCjsVersion() {
  try {
    // Create dist/cjs directory
    await writeFile(join(__dirname, 'dist', 'cjs', 'package.json'), JSON.stringify({ type: 'commonjs' }, null, 2), 'utf8');
    console.log('✅ Created package.json for CJS directory');

    // Convert and copy index.js
    const indexEsmCode = await readFile(join(__dirname, 'index.js'), 'utf8');
    let indexCjsCode = indexEsmCode
      .replace(/import\s+\{\s*Socket\s*\}\s+from\s+['"]net['"];/, 'const { Socket } = require("net");')
      .replace(/import\s+\{\s*extractWhoisData\s*\}\s+from\s+['"]\.\/whois-regex\.js['"];/, 'const { extractWhoisData } = require("./whois-regex.js");')
      .replace(/export\s+\{\s*whois,\s*queryWhois,\s*parseWhois\s*\};/, 'module.exports = { whois, queryWhois, parseWhois };');
    await writeFile(join(__dirname, 'dist', 'cjs', 'index.js'), indexCjsCode, 'utf8');
    console.log('✅ Successfully built CommonJS index.js');

    // Convert and copy whois-regex.js
    const regexEsmCode = await readFile(join(__dirname, 'whois-regex.js'), 'utf8');
    let regexCjsCode = regexEsmCode
      .replace(/export\s+const\s+WHOIS_PATTERNS\s*=\s*/, 'const WHOIS_PATTERNS = ')
      .replace(/export\s+function\s+extractWhoisData/, 'function extractWhoisData')
      .replace(/export\s+function\s+extractAllFields/, 'function extractAllFields')
      .replace(/export\s+function\s+getRegexPatterns/, 'function getRegexPatterns')
      .replace(/export\s+\{\s*whois,\s*queryWhois,\s*parseWhois\s*\};/, 'module.exports = { WHOIS_PATTERNS, extractWhoisData, extractAllFields, getRegexPatterns };');
    await writeFile(join(__dirname, 'dist', 'cjs', 'whois-regex.js'), regexCjsCode, 'utf8');
    console.log('✅ Successfully built CommonJS whois-regex.js');

  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

createCjsVersion(); 