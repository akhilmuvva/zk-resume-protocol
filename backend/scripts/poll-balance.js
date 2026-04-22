const { ethers } = require('ethers');

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/GWRU1a2NL0UVF6M5Svygb');
const addr = '0x25F6C8ed995C811E6c0ADb1D66A60830E8115e9A';

async function poll() {
  for (let i = 0; i < 40; i++) {
    const b = await provider.getBalance(addr);
    const eth = ethers.formatEther(b);
    console.log('[' + new Date().toISOString() + '] Balance: ' + eth + ' ETH');
    if (b > 0n) {
      console.log('ETH received! Ready to deploy.');
      process.exit(0);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
  console.log('Timeout — ETH not received yet.');
  process.exit(1);
}

poll().catch(e => { console.error(e.message); process.exit(1); });
