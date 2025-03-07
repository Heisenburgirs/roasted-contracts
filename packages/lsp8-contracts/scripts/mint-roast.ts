import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { Roasted } from "../typechain";
import { ERC725 } from "@erc725/erc725.js";
import { PinataSDK } from "pinata-web3";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// LSP4 Metadata key
const LSP4_METADATA_KEY = "0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e";

// Define the schema for LSP4Metadata
const schema = [
  {
    name: 'LSP4Metadata',
    key: LSP4_METADATA_KEY,
    keyType: 'Singleton',
    valueType: 'bytes',
    valueContent: 'VerifiableURI',
  },
];

async function main() {
  console.log("Preparing to mint a Roast token with proper metadata...");

  // Get the signer from the private key in .env
  const [signer] = await ethers.getSigners();
  console.log(`Using account: ${signer.address}`);

  // Initialize Pinata client
  if (!process.env.PINATA_JWT) {
    console.error("PINATA_JWT environment variable is not set");
    process.exit(1);
  }
  
  const pinata = new PinataSDK({ pinataJwt: process.env.PINATA_JWT });
  console.log("Pinata client initialized");

  // Step 1: Create metadata JSON
  console.log("\nStep 1: Creating metadata JSON...");
  
  // Create a directory for assets if it doesn't exist
  const assetsDir = path.join(__dirname, "../assets");
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Define metadata according to LSP4 standard
  const name = "Roast NFT";
  const description = "A token that roasts someone on the blockchain";
  const links = [{ title: "Website", url: "https://lukso.network" }];
  const attributes = [
    { key: "Roaster", value: signer.address, type: "string" },
    { key: "Roastee", value: "", type: "string" },
    { key: "Timestamp", value: Math.floor(Date.now() / 1000), type: "number" }
  ];
  
  // For simplicity, we're using placeholder image URLs
  // In a real application, you would upload actual images to IPFS first
  const images = [
    [
      {
        width: 1024,
        height: 1024,
        url: "ipfs://QmVfYb9D6x5hNuAaMa1qmoS2LmGi9Z78B1JKKaMyedv7wv/roast.png",
        verification: {
          method: "keccak256(bytes)",
          data: "0x01299df007997de92a820c6c2ec1cb2d3f5aa5fc1adf294157de563eba39bb6f"
        }
      }
    ]
  ];
  
  const icon = [
    {
      width: 256,
      height: 256,
      url: "ipfs://QmPS3n3xe5gQsGpUnpaYWvzug44JknBZbUv6cv8yKJ7Gsi/icon.png",
      verification: {
        method: "keccak256(bytes)",
        data: "0x01299df007997de92a820c6c2ec1cb2d3f5aa5fc1adf294157de563eba39bb6f"
      }
    }
  ];
  
  const metadata = {
    LSP4Metadata: {
      name,
      description,
      links,
      attributes,
      images,
      icon,
      assets: []
    }
  };

  // Save metadata to a file
  const metadataPath = path.join(assetsDir, "metadata.json");
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`Metadata saved to: ${metadataPath}`);

  // Step 2: Upload metadata JSON to IPFS via Pinata
  console.log("\nStep 2: Uploading metadata to IPFS...");
  
  const metadataResult = await pinata.upload.json(metadata);
  
  const metadataIpfsHash = metadataResult.IpfsHash;
  console.log(`Metadata uploaded to IPFS with hash: ${metadataIpfsHash}`);
  const metadataIpfsUrl = `ipfs://${metadataIpfsHash}`;

  // Step 3: Encode the metadata with ERC725.js
  console.log("\nStep 3: Encoding metadata with ERC725.js...");
  const erc725 = new ERC725(schema);
  
  const encodedData = erc725.encodeData([
    {
      keyName: 'LSP4Metadata',
      value: {
        json: metadata,
        url: metadataIpfsUrl,
      },
    },
  ]);
  
  console.log("Encoded metadata:", encodedData);
  console.log("Encoded metadata key:", encodedData.keys[0]);
  console.log("Encoded metadata value:", encodedData.values[0]);

  // Step 4: Mint the token with the encoded metadata
  console.log("\nStep 4: Minting token with encoded metadata...");
  
  // Load the deployment info
  const deploymentInfoPath = path.join(__dirname, "../deployment-info.json");
  
  if (!fs.existsSync(deploymentInfoPath)) {
    console.error(`Deployment info not found at ${deploymentInfoPath}`);
    console.error("Please run the deployment script first and ensure it creates a deployment-info.json file");
    process.exit(1);
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;
  
  console.log(`Connecting to Roasted contract at: ${contractAddress}`);

  // Connect to the deployed contract
  const roastedContract = await ethers.getContractAt("Roasted", contractAddress) as Roasted;

  // Parameters for mint function
  const to = signer.address; // Mint to the caller (ourselves)
  const force = true; // Force parameter

  // Address to encode for the mint function
  const roasteeAddress = "";
  
  // Use the encoded metadata value directly
  const encodedMetadataValue = encodedData.values[0];
  console.log(`Full encoded metadata value: ${encodedMetadataValue}`);
  console.log(`Roastee Address: ${roasteeAddress}`);

  // Encode the data for the mint function
  const mintData = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes"],
    [roasteeAddress, encodedMetadataValue]
  );
  
  console.log(`Mint Data: ${mintData}`);

  try {
    // Check if roastee has set a price
    const roasteePrice = await roastedContract.roastPrices(roasteeAddress);
    console.log(`Roastee price: ${ethers.formatEther(roasteePrice)} LYX`);
    
    // Set value to at least the roastee price
    const valueToSend = roasteePrice > BigInt(0) ? roasteePrice : ethers.parseEther("0.01");
    
    console.log(`Sending ${ethers.formatEther(valueToSend)} LYX with the mint transaction`);
    
    // Call the mint function - note we're using the new version that doesn't require tokenId
    console.log("Calling mint function...");
    const tx = await roastedContract.mint(
      to,
      force,
      mintData,
      { value: valueToSend }
    );
    
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for transaction to be mined...");
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt?.blockNumber}`);
    
    // Get the current token ID counter to determine which token was minted
    const currentCounter = await roastedContract.getCurrentTokenIdCounter();
    const mintedTokenId = ethers.zeroPadValue(ethers.toBeHex(Number(currentCounter.toString()) - 1), 32);
    console.log(`Minted token ID: ${mintedTokenId}`);
    
    // Check if the token was minted successfully
    const tokenOwner = await roastedContract.tokenOwnerOf(mintedTokenId);
    console.log(`Token ${mintedTokenId} is now owned by: ${tokenOwner}`);
    
    // Verify the metadata was set correctly
    console.log("\nVerifying metadata...");
    const tokenMetadata = await roastedContract.getDataForTokenId(mintedTokenId, LSP4_METADATA_KEY);
    console.log(`Token metadata: ${tokenMetadata}`);
    
    // Decode the metadata
    const decodedMetadata = erc725.decodeData([
      {
        keyName: 'LSP4Metadata',
        value: tokenMetadata,
      },
    ]);
    
    console.log("\nDecoded Metadata:");
    console.log(JSON.stringify(decodedMetadata, null, 2));
    
    console.log("\nMinting Summary:");
    console.log("---------------");
    console.log(`Token ID: ${mintedTokenId}`);
    console.log(`Owner: ${tokenOwner}`);
    console.log(`Roastee: ${roasteeAddress}`);
    console.log(`Metadata IPFS URL: ${metadataIpfsUrl}`);
    console.log(`Transaction: https://explorer.execution.testnet.lukso.network/tx/${tx.hash}`);
    
  } catch (error) {
    console.error("Error minting token:", error);
  }
}

// Execute the minting
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 