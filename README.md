# TollScout

A Telegram bot that checks any Celo address and pays for its own data, one cent at a time, over HTTP 402 with the buy CLI. Every answer comes with an itemised receipt.

Built for Celo's Agents on Open Rails hackathon, Track 3: Build with buy. Independent project, not affiliated with or endorsed by Celo.

- Bot: https://t.me/TOLLSCOUT
- Site: https://toll-scout.vercel.app/
- Demo video: [ADD VIDEO LINK]

## The problem

Checking an address normally needs an API key, an account or a subscription. An agent that holds its own small wallet can buy exactly one answer, pay for it, and show what it spent. No keys, no accounts.

## What it does

1. You send a Celo address to the bot. No wallet needed, any public address works.
2. The agent buys one batch of Celo RPC lookups (balance, transaction count, wallet or contract) through the buy gateway.
3. It signs a USAT payment locally, retries the request, and replies with the result plus a receipt.

## Safety

- The agent has its own wallet, separate from any personal wallet. Its key is held in the OS keychain by the buy CLI.
- Every paid call carries a hard cap of $0.01.
- Per-user and daily limits, a 30 second cooldown, and a 10 minute cache so repeat checks cost nothing.
- Failures are never retried automatically, because a retry after settlement is charged again.

## Proof of real payments (Celo mainnet, USAT)

- https://celoscan.io/tx/0x3664f85ead4361657da73de28448312e84fdcbc4f2b8630668196ace9d4506db
- https://celoscan.io/tx/0x0d51ceaac240f21def8a5e42546781b70bc435b71ec30517e8be41990799117a

Each is a confirmed $0.01 payment to the Celo RPC route (HTTP 200). More are listed by `npx @celo/buy@0.8.3 receipts`.

## What did not work, and why

We tried a second paid service, a plain-English summary through Cencori inference. The buy gateway accepted only the model maximo-atlas-1.3, while Cencori reported that model as retired, and the call was refused. The code is kept but switched off, and the bot says so in its receipts. We would add it back when the provider fixes its model list.

## Run it yourself

    npm install
    npx --yes @celo/buy@0.8.3 setup --name demo
    npx --yes @celo/buy@0.8.3 whoami

Fund the printed address with a few cents of USAT on Celo, then create a `.env` file:

    TELEGRAM_BOT_TOKEN=your_token_from_BotFather
    BUY_MODE=live
    BUY_EXTRA_ARGS=--token USAT
    DEMO_ADDRESS=0x_any_public_address

Run `node bot.js`. With BUY_MODE=mock nothing is paid and replies are labelled as mock. The `docs` folder is the landing page.

## Stack

Node.js, Telegraf, @celo/buy 0.8.3, Celo mainnet, USAT.
