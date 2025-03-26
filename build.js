import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function createCjsVersion() {
  try {
    const esmCode = await readFile(join(__dirname, 'index.js'), 'utf8');
    
    let cjsCode = esmCode
      .replace(/import\s+\{\s*Socket\s*\}\s+from\s+['"]net['"];/, 'const { Socket } = require("net");')
      .replace(/export\s+\{\s*queryWhois,\s*parseWhois\s*\};/, 'module.exports = { queryWhois, parseWhois };');
    
    await writeFile(join(__dirname, 'dist', 'cjs', 'index.js'), cjsCode, 'utf8');
    console.log('✅ Successfully built CommonJS version');
    
    const cjsPackageJson = JSON.stringify({ type: 'commonjs' }, null, 2);
    await writeFile(join(__dirname, 'dist', 'cjs', 'package.json'), cjsPackageJson, 'utf8');
    console.log('✅ Created package.json for CJS directory');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

createCjsVersion(); 