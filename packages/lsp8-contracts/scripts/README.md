# LSP8 Deployment Scripts

This directory contains scripts for deploying and verifying LSP8 contracts on the Lukso testnet.

## Prerequisites

Before running any deployment scripts, make sure you have:

1. Node.js and npm installed
2. Created a `.env` file in the root of the `lsp8-contracts` package with your private key:

```
CONTRACT_VERIFICATION_TESTNET_PK=your_private_key_here
```

**WARNING:** Never commit your actual private key to git!

3. Ensure your account has sufficient LYX tokens for deployment on the Lukso testnet
   - You can get testnet LYX from the [Lukso Testnet Faucet](https://faucet.testnet.lukso.network/)

## Available Scripts

### `deploy-and-verify-roasted.ts`

This script deploys the `Roasted` contract to the Lukso testnet and verifies it on the Lukso testnet explorer.

#### Usage

1. First, compile the contracts to generate the necessary artifacts:

```bash
npx hardhat compile
```

2. Run the deployment script:

```bash
npx hardhat run scripts/deploy-and-verify-roasted.ts --network luksoTestnet
```

3. The script will:
   - Deploy the `Roasted` contract with the following parameters:
     - Name: "Roasted"
     - Symbol: "ROAST"
     - Owner: Your deployer address
     - LSP4 Token Type: 1 (NFT)
     - LSP8 Token ID Format: 0 (Mixed)
   - Wait for the deployment to be confirmed
   - Verify the contract on the Lukso testnet explorer
   - Display a summary of the deployment

4. If verification fails, you can manually verify the contract using the command provided in the error message.

## Customizing Deployment Parameters

If you want to customize the deployment parameters (e.g., name, symbol), you can modify the constants at the beginning of the script:

```typescript
// Contract constructor parameters
const name = "Roasted";
const symbol = "ROAST";
const lsp4TokenType = 1; // NFT type (1 = NFT)
const lsp8TokenIdFormat = 0; // Default format (0 = Mixed)
```

## Troubleshooting

- **Artifact not found**: Make sure you've compiled the contracts with `npx hardhat compile`
- **Insufficient funds**: Ensure your account has enough LYX tokens for deployment
- **Verification fails**: The contract might still be deployed successfully. You can try manual verification using the command provided in the error message.

### `mint-roast.ts`

This script mints a new Roast token on the deployed Roasted contract.

#### Usage

1. Make sure you've already deployed the Roasted contract using the `deploy-verify.ts` script.

2. Run the minting script:

```bash
npx hardhat run scripts/mint-roast.ts --network luksoTestnet
```

Or use the npm script:

```bash
npm run mint:roast
```

3. The script will:
   - Connect to the deployed Roasted contract
   - Encode the data with the specified address and IPFS hash
   - Call the mint function with the required parameters
   - Display a summary of the minting operation

#### Parameters

The script uses the following parameters for minting:

- **to**: The address of the caller (derived from the private key in .env)
- **tokenId**: A bytes32 value starting with 0
- **force**: true
- **data**: Encoded data containing:
  - Roastee address: 0xcebD62B64dcB774DB432FA32f4523a34AFDD220f
  - IPFS hash: bafkreicchsim53jru7ubiwdz5yahbzqxpsdilnngqxno6uknzlifkdwvdu

#### Customizing Parameters

If you want to customize the minting parameters, you can modify the constants in the script:

```typescript
// Address and IPFS hash to encode
const roasteeAddress = "0xcebD62B64dcB774DB432FA32f4523a34AFDD220f";
const ipfsHash = "bafkreicchsim53jru7ubiwdz5yahbzqxpsdilnngqxno6uknzlifkdwvdu";

// Token ID (incremented for each mint)
const tokenIdNumber = 0;
```
```

## How to Use These Scripts

1. First, deploy the contract:
   ```bash
   npm run deploy:roasted
   ```
   This will deploy the Roasted contract to the Lukso testnet, verify it, and save the deployment information to `deployment-info.json`.

2. Then, mint a new Roast token:
   ```bash
   npm run mint:roast
   ```
   This will mint a new token with the specified parameters.

### Important Notes

1. **IPFS Hash Conversion**: The script converts the IPFS hash to a bytes32 format. This is a simplified approach and might not work for all IPFS hash formats. If you encounter issues, you might need to adjust the conversion logic.

2. **Token ID**: The script uses a token ID of 0. If you want to mint multiple tokens, you'll need to increment this value for each mint.

3. **Value Sent**: The script checks if the roastee has set a price and sends at least that amount. If no price is set, it sends 0.01 LYX as a default value.

4. **Error Handling**: The script includes basic error handling, but you might need to adjust it based on your specific requirements.

Let me know if you need any clarification or have any questions about these scripts! 