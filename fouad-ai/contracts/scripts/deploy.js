const hre = require('hardhat');

async function main() {
  console.log('Deploying AnchorRegistry...');

  const AnchorRegistry = await hre.ethers.getContractFactory('AnchorRegistry');
  const registry = await AnchorRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log('✅ AnchorRegistry deployed to:', address);
  console.log('\nAdd this to your .env file:');
  console.log(`ANCHOR_CONTRACT_ADDRESS=${address}`);

  // Verify on Etherscan (if not localhost)
  if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
    console.log('\nWaiting for block confirmations...');
    await registry.deploymentTransaction().wait(5);
    
    console.log('Verifying contract...');
    try {
      await hre.run('verify:verify', {
        address: address,
        constructorArguments: [],
      });
      console.log('✅ Contract verified on Etherscan');
    } catch (e) {
      console.log('Verification failed:', e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
