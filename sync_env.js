const fs = require('fs');
const envStr = fs.readFileSync('.env', 'utf-8');
const match = envStr.match(/OPENROUTER_API_KEY=(.+)/);
if (match) {
  fs.writeFileSync('.env.local', 'VITE_OPENROUTER_API_KEY=' + match[1].trim());
  console.log('Synced .env to .env.local');
} else {
  console.log('No OPENROUTER_API_KEY found in .env');
}
