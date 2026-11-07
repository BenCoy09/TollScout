const fs = require('fs');
const { generatePrivateKey, privateKeyToAccount } = require('viem/accounts');
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
if (/^AGENT_PRIVATE_KEY=/m.test(env)) {
  console.log('A key already exists in .env. Not overwriting.');
  process.exit(0);
}
const pk = generatePrivateKey();
const acct = privateKeyToAccount(pk);
fs.appendFileSync('.env', '\nAGENT_PRIVATE_KEY=' + pk + '\nAGENT_ADDRESS=' + acct.address + '\n');
console.log('New agent wallet address:', acct.address);
console.log('Private key saved to .env (not printed).');
