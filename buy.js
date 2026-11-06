const { execFile } = require('child_process');

const CALL_URL = 'https://gateway.usebuy.ai/chainstack/celo';

// calls = [['eth_getBalance', [addr, 'latest']], ...]
function paidRpc(calls, maxAmount = '0.01') {
  if (process.env.BUY_MODE !== 'live') {
    return Promise.resolve({ mock: true, data: null });
  }
  // Token option (USAT vs default USDC) goes in BUY_EXTRA_ARGS once we know it.
  const extra = (process.env.BUY_EXTRA_ARGS || '').split(' ').filter(Boolean);
  const body = JSON.stringify(
    calls.map((c, i) => ({ jsonrpc: '2.0', id: i + 1, method: c[0], params: c[1] }))
  );
  const args = ['--yes', '@celo/buy@0.8.3', 'curl', ...extra,
    '--max-amount', maxAmount, '-X', 'POST', '--data', body, CALL_URL];
  return new Promise((resolve, reject) => {
    execFile('npx', args, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) return reject(new Error((stderr || err.message).slice(0, 300)));
      try { resolve({ mock: false, data: JSON.parse(stdout), raw: stdout }); }
      catch (e) { resolve({ mock: false, data: null, raw: stdout }); }
    });
  });
}

module.exports = { paidRpc };
