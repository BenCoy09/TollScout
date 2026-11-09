# TollScout

A Telegram bot that checks any Celo address and pays for its own data, a cent at a time, over HTTP 402 with the buy CLI. Every answer comes with an itemised receipt.

Built for Celo's Agents on Open Rails hackathon, Track 3: Build with buy. Independent project, not affiliated with or endorsed by Celo.

- Bot: https://t.me/TollScoutBot
- Site: https://tollscout.onrender.com/
- Demo video: https://youtu.be/SqdF9YDwbts?is=yrJmULFyxDPlERuI

## The problem

Checking an address normally needs an API key, an account or a subscription. An agent that holds its own small wallet can buy exactly one answer, pay for it, and show what it spent. No keys, no accounts.

## What it does

1. You send a Celo address to the bot. Any public address works.
2. The agent buys one batch of Celo RPC lookups (balance, transaction count, wallet or contract) through the buy gateway, https://gateway.usebuy.ai/chainstack/celo.
3. It signs a stablecoin payment locally, retries, and replies with the result plus an itemised receipt.

## Agent identity (ERC-8004)

- Registry on Celo mainnet: 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432
- Agent ID: 10047
- Registration file: agent.json in this repo
- Agent wallet: https://celoscan.io/address/0x890f8694e093cb98eD1CF6EA3bd1398C93Edf68a

## Proof of real payments (Celo mainnet)

From the registered agent wallet, 0.01 USDC each, confirmed:
- https://celoscan.io/tx/0x11435d81a368966421fa40c7cc665e88a66c0effa302e35a98ee53148e0df411
- https://celoscan.io/tx/0xb8c4b930aa7ec03e0750d07b21010c7a00dacd4c888070b2e4a15d8c8852c5e1

Earlier test payments, 0.01 USAT each, came from a first test wallet (0xd1CDdd47742B936345Ff96B1416DB09F8eDc3B45). Its key was lost when the Ubuntu keychain reset, so the identity and the payments above moved to the agent wallet.
- https://celoscan.io/tx/0x3664f85ead4361657da73de28448312e84fdcbc4f2b8630668196ace9d4506db
- https://celoscan.io/tx/0x0d51ceaac240f21def8a5e42546781b70bc435b71ec30517e8be41990799117a
- https://celoscan.io/tx/0xefa960ee42cd062a50dcca432294a65a37ad78af178dc739dd9deb2803e52484

## Safety

- The agent has its own wallet with a daily spend cap set in buy.
- Every paid call carries a hard cap of $0.01.
- Per-user and daily limits, a 30 second cooldown, and a 10 minute cache.
- Failures are never retried automatically, because a retry after settlement is charged again.

## What did not work, and why

We tried a second paid service, a plain-English summary through Cencori inference. The buy gateway accepted only the model maximo-atlas-1.3, while Cencori reported that model as retired, and two calls were refused after payment. The code is kept but switched off, and the bot says so in its receipts.

## Run it yourself

    npm install
    node gen-wallet.js
    BUY_IMPORT_KEY="$(grep '^AGENT_PRIVATE_KEY=' .env | cut -d= -f2)" npx @celo/buy@0.8.3 setup --import --name agent

Fund the printed address with a few cents of USDC on Celo, then add to .env: TELEGRAM_BOT_TOKEN, BUY_MODE=live, BUY_EXTRA_ARGS=--token USDC, DEMO_ADDRESS. Run `./start-bot.sh`. With BUY_MODE=mock nothing is paid. The docs folder is the landing page.

## Stack

Node.js, Telegraf, viem, @celo/buy 0.8.3, Celo mainnet, ERC-8004.
