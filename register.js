require('dotenv').config();
const { createPublicClient, createWalletClient, http, parseEventLogs, formatEther } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { celo } = require('viem/chains');

const REGISTRY = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const abi = [
  { type: 'function', name: 'register', stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }] },
  { type: 'event', name: 'Registered', inputs: [
    { name: 'agentId', type: 'uint256', indexed: true },
    { name: 'agentURI', type: 'string' },
    { name: 'owner', type: 'address', indexed: true }] },
];

async function main() {
  const uri = process.argv[2];
  const send = process.argv.includes('--send');
  if (!uri || !uri.startsWith('https://')) {
    console.log('Usage: node register.js https://URL/agent.json [--send]');
    process.exit(1);
  }
  if (!process.env.AGENT_PRIVATE_KEY) { console.log('AGENT_PRIVATE_KEY missing in .env'); process.exit(1); }
  const account = privateKeyToAccount(process.env.AGENT_PRIVATE_KEY);
  const pub = createPublicClient({ chain: celo, transport: http() });
  const wallet = createWalletClient({ account, chain: celo, transport: http() });
  const feeCurrency = process.env.FEE_CURRENCY || undefined;

  console.log('Registering from:', account.address);
  console.log('Agent file:', uri);
  console.log('CELO balance:', formatEther(await pub.getBalance({ address: account.address })));

  const { request } = await pub.simulateContract({
    account, address: REGISTRY, abi, functionName: 'register', args: [uri],
  });
  console.log('Simulation OK.');
  try {
    const gas = await pub.estimateContractGas({ account, address: REGISTRY, abi, functionName: 'register', args: [uri] });
    const price = await pub.getGasPrice();
    console.log('Estimated gas:', gas.toString(), '= about', formatEther(gas * price), 'CELO. Ask for double.');
  } catch (e) {
    console.log('Could not estimate the fee. Allow about 0.05 CELO.');
  }
  if (!send) { console.log('Dry run only. Add --send to register for real.'); return; }

  const hash = await wallet.writeContract({ ...request, ...(feeCurrency ? { feeCurrency } : {}) });
  console.log('Sent:', 'https://celoscan.io/tx/' + hash);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  const [reg] = parseEventLogs({ abi, eventName: 'Registered', logs: receipt.logs });
  console.log('Registered as agent ID:', reg ? reg.args.agentId.toString() : '(see the transaction)');
}
main().catch((e) => { console.error('Failed:', e.shortMessage || e.message); process.exit(1); });
