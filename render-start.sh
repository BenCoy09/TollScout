#!/bin/bash
if [ -z "$AGENT_PRIVATE_KEY" ]; then echo "AGENT_PRIVATE_KEY missing"; fi
BUY_IMPORT_KEY="$AGENT_PRIVATE_KEY" npx --yes @celo/buy@0.8.3 setup --import --name agent --force
npx --yes @celo/buy@0.8.3 account use agent
npx --yes @celo/buy@0.8.3 account cap agent 0.30
npx --yes @celo/buy@0.8.3 --account agent whoami
exec node bot.js
