import { ethers, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Universal Profile ABI - we only need the execute function
const UP_ABI = [
  "function execute(uint256 operationType, address target, uint256 value, bytes calldata data) external returns (bytes)"
];

// Operation types for Universal Profile
const OPERATION_CALL = 0;
const OPERATION_CREATE = 1;
const OPERATION_CREATE2 = 2;
const OPERATION_STATICCALL = 3;
const OPERATION_DELEGATECALL = 4;

async function main() {
  console.log("Deploying Roasted contract via Universal Profile on Lukso...");
  
  // Contract constructor parameters
  const name = "Roasted";
  const symbol = "ROAST";
  const lsp4TokenType = 1; // NFT type (1 = NFT)
  const lsp8TokenIdFormat = 0; // Default format (0 = Mixed)

  // Get the private key from .env
  const privateKey = process.env.CONTRACT_VERIFICATION_TESTNET_PK;
  if (!privateKey) {
    throw new Error("Private key not found in .env file");
  }

  // Create a wallet from the private key
  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  console.log(`Using wallet address: ${wallet.address}`);

  // Universal Profile address
  const universalProfileAddress = "0x4dEd4822C09b850Fb0da640695a848D0C7267fb7";
  console.log(`Deploying through Universal Profile: ${universalProfileAddress}`);

  // Connect to the Universal Profile
  const universalProfile = new ethers.Contract(
    universalProfileAddress,
    UP_ABI,
    wallet
  );

  // Load the contract artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/presets/LSP8Mintable.sol/Roasted.json"
  );
  
  // Check if artifact exists
  if (!fs.existsSync(artifactPath)) {
    console.error(`Artifact not found at ${artifactPath}`);
    console.error("Make sure you've compiled the contracts with 'npx hardhat compile'");
    process.exit(1);
  }
  
  console.log(`Using artifact from: ${artifactPath}`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Get the contract factory
  const factory = await ethers.getContractFactory("Roasted");
  
  // Get the deployment bytecode with constructor arguments
  const deploymentData = factory.interface.encodeDeploy([
    name,
    symbol,
    universalProfileAddress, // Owner is the Universal Profile
    lsp4TokenType,
    lsp8TokenIdFormat
  ]);

  // Get the bytecode from the artifact
  const bytecode = artifact.bytecode;
  
  // Combine bytecode and constructor arguments
  const fullDeploymentData = bytecode + deploymentData.slice(2); // Remove '0x' from deploymentData
  
  console.log("Preparing deployment transaction...");
  
  // Execute the deployment through the Universal Profile
  // We use OPERATION_CREATE (1) to deploy a new contract
  const tx = await universalProfile.execute(
    OPERATION_CREATE, // operationType = CREATE
    ethers.ZeroAddress, // target = 0x0 for contract creation
    0, // value = 0 (no LYX sent)
    fullDeploymentData // data = contract bytecode + constructor args
  );
  
  console.log(`Deployment transaction sent: ${tx.hash}`);
  console.log("Waiting for transaction to be mined...");
  
  const receipt = await tx.wait();
  console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
  
  // Extract the deployed contract address from the logs
  // The contract address is emitted in the ContractCreated event
  // We need to find the contract address from the transaction receipt
  let contractAddress;
  
  // Look for contract creation in the logs
  for (const log of receipt?.logs || []) {
    // For contract creation, we can find the address in the topics
    if (log.topics[0] === ethers.id("ContractCreated(address,address,address)")) {
      // The contract address is the third topic (index 2)
      contractAddress = ethers.dataSlice(log.topics[2], 12); // Extract address from topic
      break;
    }
  }
  
  // If we couldn't find it in the logs, try to get it from the transaction receipt
  if (!contractAddress && receipt?.contractAddress) {
    contractAddress = receipt.contractAddress;
  }
  
  // If we still don't have it, we need to calculate it
  if (!contractAddress) {
    // Calculate the contract address (this is a simplified version)
    const nonce = await ethers.provider.getTransactionCount(universalProfileAddress, receipt.blockNumber);
    contractAddress = ethers.getCreateAddress({
      from: universalProfileAddress,
      nonce: nonce - 1 // The nonce used for this transaction
    });
  }
  
  console.log(`Roasted contract deployed to: ${contractAddress}`);

  // Save deployment info to a file
  const deploymentInfo = {
    contractAddress,
    name,
    symbol,
    owner: universalProfileAddress, // The UP is the owner
    lsp4TokenType,
    lsp8TokenIdFormat,
    deploymentTime: new Date().toISOString(),
    network: "lukso",
    deployedVia: universalProfileAddress
  };
  
  const deploymentInfoPath = path.join(__dirname, "../deployment-info.json");
  fs.writeFileSync(
    deploymentInfoPath,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment info saved to: ${deploymentInfoPath}`);

  // Wait for a few blocks to ensure the contract is properly deployed
  console.log("Waiting for contract deployment to be confirmed (30 seconds)...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds delay

  // Verify the contract on Lukso explorer
  console.log("Verifying contract on Lukso explorer...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [
        name,
        symbol,
        universalProfileAddress, // Owner is the UP
        lsp4TokenType,
        lsp8TokenIdFormat
      ],
      network: "lukso"
    });
    console.log("Contract verification successful!");
  } catch (error) {
    console.error("Error verifying contract:", error);
    console.error("You can manually verify the contract with:");
    console.error(`npx hardhat verify --network lukso ${contractAddress} "${name}" "${symbol}" ${universalProfileAddress} ${lsp4TokenType} ${lsp8TokenIdFormat}`);
  }
  
  console.log("\nDeployment Summary:");
  console.log("-------------------");
  console.log(`Contract Name: ${name}`);
  console.log(`Contract Symbol: ${symbol}`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Owner Address: ${universalProfileAddress} (Universal Profile)`);
  console.log(`Deployer Address: ${wallet.address}`);
  console.log(`LSP4 Token Type: ${lsp4TokenType} (NFT)`);
  console.log(`LSP8 Token ID Format: ${lsp8TokenIdFormat} (Mixed)`);
  console.log(`Explorer URL: https://explorer.execution.lukso.network/address/${contractAddress}`);
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 