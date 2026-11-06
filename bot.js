require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { paidRpc, paidSummary } = require('./buy');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const DEMO = process.env.DEMO_ADDRESS || '';
const MAX_DAY = Number(process.env.MAX_PAID_PER_DAY || 10);
const MAX_USER_DAY = Number(process.env.MAX_PER_USER_DAY || 3);
const isAddr = (s) => /^0x[a-fA-F0-9]{40}$/.test(s);
const today = () => new Date().toISOString().slice(0, 10);
const cache = new Map();
const users = new Map();
const stats = { day: today(), checks: 0, total: 0, cents: 0 };
let aiOff = true; // flips on after one AI failure so we never keep burning cents
function roll() { if (stats.day !== today()) { stats.day = today(); stats.checks = 0; users.clear(); } }

const HELP = 'How to get a Celo address: MiniPay or MetaMask create one for free. It is the 0x... text, public and safe to share. Never share your seed phrase or private key with anyone, including this bot. No wallet? Tap "Try a sample address".';

async function check(ctx, addr) {
  roll();
  const key = addr.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 600000) return ctx.reply(hit.text + '\n\n(Cached from a real paid check. No new payment.)');
  const u = users.get(ctx.from.id) || { last: 0, n: 0 };
  if (Date.now() - u.last < 30000) return ctx.reply('Please wait a few seconds between checks.');
  if (u.n >= MAX_USER_DAY) return ctx.reply('Daily limit reached. Every check spends real money, so it is capped.');
  if (stats.checks >= MAX_DAY) return ctx.reply('TollScout reached its daily spending cap. Try again tomorrow.');
  u.last = Date.now();
  users.set(ctx.from.id, u);
  await ctx.reply('Checking ' + addr + ' ...');

  const r = await paidRpc([
    ['eth_getBalance', [addr, 'latest']],
    ['eth_getTransactionCount', [addr, 'latest']],
    ['eth_getCode', [addr, 'latest']],
  ]);
  if (r.mock) return ctx.reply('[MOCK - no real payment]');
  if (!r.ok) { console.error('RPC call failed:', r.error); return ctx.reply('Payment call failed: ' + r.error.slice(0, 250)); }
  if (!Array.isArray(r.data)) return ctx.reply('Unexpected response: ' + String(r.raw).slice(0, 300));

  const by = {};
  for (const x of r.data) by[x.id] = x.result;
  const bal = Number(BigInt(by[1] || '0x0')) / 1e18;
  const txs = Number(BigInt(by[2] || '0x0'));
  const kind = by[3] && by[3] !== '0x' ? 'Smart contract' : 'Regular wallet';
  u.n++; stats.checks++; stats.total++; stats.cents += 1;

  let aiText = null;
  let aiNote = '';
  if (aiOff) {
    aiNote = 'AI summary: not offered right now (provider fault, nothing charged)';
  } else {
    const s = await paidSummary('Address ' + addr + '. Type: ' + kind + '. CELO balance: ' + bal + '. Outgoing transactions: ' + txs + '.');
    if (s.ok && s.text) { aiText = s.text.trim(); stats.cents += 1; }
    else { aiOff = true; console.error('AI call failed:', s.error); aiNote = 'AI summary: failed (it may have been charged $0.01)'; }
  }

  let text = '[LIVE]\n' + kind + '\nCELO balance: ' + bal + '\nOutgoing txs: ' + txs + '\n\n';
  if (aiText) text += 'AI read: ' + aiText + '\n\n';
  text += 'Receipt\n1. Celo RPC batch (3 lookups): $0.01\n';
  text += aiText ? '2. Cencori AI summary: $0.01\nTotal: $0.02' : '2. ' + aiNote + '\nTotal: $0.01';
  text += '\n(USAT via buy, capped at $0.01 per call)';
  if (aiText) cache.set(key, { at: Date.now(), text });
  return ctx.reply(text);
}

const demo = (ctx) => DEMO ? check(ctx, DEMO) : ctx.reply('No sample address set. Paste any Celo address. /help');

bot.start((ctx) => ctx.reply(
  'Welcome to TollScout.\n\nSend me any Celo address (0x...) and I will check it. I pay for each data call myself, one cent at a time, and show you the receipt.\n\nNo wallet needed: any public address works.',
  Markup.inlineKeyboard([
    [Markup.button.callback('Try a sample address', 'demo')],
    [Markup.button.callback('I do not have an address', 'help')],
  ])
));
bot.command('demo', demo);
bot.command('help', (ctx) => ctx.reply(HELP));
bot.command('check', (ctx) => ctx.reply('Send me a Celo address (0x followed by 40 characters). No address? Tap /demo.'));
bot.command('stats', (ctx) => { roll(); ctx.reply('Paid checks today: ' + stats.checks + ' / ' + MAX_DAY + '\nSince start: ' + stats.total + '\nSpent since start: about $' + (stats.cents / 100).toFixed(2) + '\nAI summary: ' + (aiOff ? 'paused' : 'on')); });
bot.action('demo', async (ctx) => { await ctx.answerCbQuery(); return demo(ctx); });
bot.action('help', async (ctx) => { await ctx.answerCbQuery(); return ctx.reply(HELP); });
bot.on('text', (ctx) => {
  const q = ctx.message.text.trim();
  if (!isAddr(q)) return ctx.reply('Send a Celo address: 0x followed by 40 characters. Need one? /help or /demo');
  return check(ctx, q);
});
bot.catch((err) => console.error('Bot error:', err.message));
bot.launch();
console.log('Bot running');
