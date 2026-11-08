#!/bin/bash
cd ~/celo-agent
KEY="$(grep '^AGENT_PRIVATE_KEY=' .env | cut -d= -f2)"
BUY_IMPORT_KEY="$KEY" npx --yes @celo/buy@0.8.3 setup --import --name agent --force > /dev/null 2>&1
npx --yes @celo/buy@0.8.3 account use agent > /dev/null 2>&1
npx --yes @celo/buy@0.8.3 account cap agent 0.30 > /dev/null 2>&1
npx --yes @celo/buy@0.8.3 --account agent whoami
while true; do node bot.js; echo "restarting in 5s"; sleep 5; done
