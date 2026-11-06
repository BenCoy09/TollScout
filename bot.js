require('dotenv').config();
const { Telegraf } = require('telegraf');
const { paidRpc } = require('./buy');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const isAddr = (s) => /^0x[a-fA-F0-9]{40}$/.test(s);

bot.start((ctx) =>
  ctx.reply('Send a Celo address (0x...) and I will check it. I pay for each data call myself.'));

bot.on('text', async (ctx) => {
  const q = ctx.message.text.trim();
  if (!isAddr(q)) return ctx.reply('Send a Celo address: 0x followed by 40 characters.');
  await ctx.reply('Checking ' + q + ' ...');
  try {
    const r = await paidRpc([
      ['eth_getBalance', [q, 'latest']],
      ['eth_getTransactionCount', [q, 'latest']],
      ['eth_getCode', [q, 'latest']],
    ]);
    if (r.mock) {
      return ctx.reply('[MOCK - no real payment]\nLive mode reports CELO balance, tx count, wallet vs contract.\nReceipt: $0 (mock)');
    }
    if (!Array.isArray(r.data)) {
      return ctx.reply('Unexpected response: ' + String(r.raw).slice(0, 300));
    }
    const by = {};
    for (const x of r.data) by[x.id] = x.result;
    const bal = Number(BigInt(by[1] || '0x0')) / 1e18;
    const txs = Number(BigInt(by[2] || '0x0'));
    const kind = by[3] && by[3] !== '0x' ? 'Smart contract' : 'Regular wallet';
    await ctx.reply(
      '[LIVE]\n' + kind + '\nCELO balance: ' + bal + '\nOutgoing txs: ' + txs +
      '\n\nReceipt: 1 paid batch (3 lookups) via buy, capped at $0.01');
  } catch (e) {
    await ctx.reply('Payment call failed: ' + e.message);
  }
});

bot.launch();
console.log('Bot running');
