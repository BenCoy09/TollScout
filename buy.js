const { execFile } = require('child_process');

const RPC_URL = 'https://gateway.usebuy.ai/chainstack/celo';
const AI_URL = 'https://gateway.usebuy.ai/cencori/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'maximo-atlas-1.5';

function paidPost(url, bodyObj, maxAmount, timeoutMs) {
  const extra = (process.env.BUY_EXTRA_ARGS || '').split(' ').filter(Boolean);
  const args = ['--yes', '@celo/buy@0.8.3', 'curl', ...extra,
    '--max-amount', maxAmount,
    '-H', 'Content-Type: application/json',
    '-X', 'POST', '--data', JSON.stringify(bodyObj), url];
  return new Promise((resolve) => {
    execFile('npx', args, { timeout: timeoutMs, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      const out = String(stdout || '');
      if (err) {
        return resolve({ ok: false, error: (String(stderr || '') + ' ' + out + ' ' + err.message).replace(/\s+/g, ' ').slice(0, 500) });
      }
      try { resolve({ ok: true, data: JSON.parse(out), raw: out }); }
      catch (e) { resolve({ ok: true, data: null, raw: out }); }
    });
  });
}

async function paidRpc(calls) {
  if (process.env.BUY_MODE !== 'live') return { mock: true };
  const body = calls.map((c, i) => ({ jsonrpc: '2.0', id: i + 1, method: c[0], params: c[1] }));
  return paidPost(RPC_URL, body, '0.01', 60000);
}

// One flat-price AI call. Never retried. Only a user message (no system role).
async function paidSummary(facts) {
  if (process.env.BUY_MODE !== 'live') return { mock: true };
  const body = {
    model: AI_MODEL,
    max_tokens: 256,
    messages: [{ role: 'user', content:
      'In two short plain sentences, describe this Celo wallet using ONLY these facts. Do not invent anything. If the data is thin, say so. ' + facts }],
  };
  const r = await paidPost(AI_URL, body, '0.01', 90000);
  if (!r.ok) return r;
  const text = r.data && r.data.choices && r.data.choices[0] && r.data.choices[0].message
    ? r.data.choices[0].message.content : null;
  if (!text) return { ok: false, error: String(r.raw || '').replace(/\s+/g, ' ').slice(0, 400) };
  return { ok: true, text };
}

module.exports = { paidRpc, paidSummary };
