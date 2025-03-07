# LSP Smart Contracts &middot; [![npm version](https://img.shields.io/npm/v/@lukso/lsp-smart-contracts.svg?style=flat)](https://www.npmjs.com/package/@lukso/lsp-smart-contracts)

The smart contracts reference implementation of the [LUKSO Standard Proposals (LSPs)](https://github.com/lukso-network/LIPs/tree/main/LSPs), specifically focusing on LSP8 Identifiable Digital Assets and the Roasted social contract.

| :warning: | _This package is currently in early stages of development,<br/> use for testing or experimentation purposes only._ |
| :-------: | :----------------------------------------------------------------------------------------------------------------- |

## Packages

This repo contains the LSP8 Identifiable Digital Asset implementation and the Roasted social contract built on top of it.

| Package | NPM | Description |
| ------- | --- | ----------- |
| [`@lukso/lsp8-contracts`](./packages/lsp8-contracts) | [![npm version](https://img.shields.io/npm/v/@lukso/lsp8-contracts.svg?style=flat)](https://www.npmjs.com/package/@lukso/lsp8-contracts) | LSP8 Identifiable Digital Asset |

### Additional Contracts

| Package | Description |
| ------- | ----------- |
| [`Roasted`](./packages/lsp8-contracts/contracts/presets/Roasted.sol) | A fun social contract that lets users "roast" others on the blockchain |

## Roasted Contract

Roasted is a social NFT contract that allows users to playfully "roast" others on the blockchain. Each roast is minted as an NFT with associated metadata.

### Key Features

- **Roast NFTs**: Create and mint NFTs containing roasts with IPFS-backed metadata
- **Economic Model**: Users can set prices for being roasted (50% to roastee 50% to protocol)
- **Revenue Sharing**: Payments are split between roastee and protocol
- **Tipping System**: Users can tip roasts they enjoy (70% to roaster, 30% to protocol)
- **Withdrawal System**: Users can withdraw accumulated earnings from being roasted

### Deploying Roasted

1. Clone the repository and install dependencies:
```bash
git clone https://github.com/lukso-network/lsp-smart-contracts.git
cd lsp-smart-contracts
npm install
```

2. Create a `.env` file with your private key and Pinata JWT:
```env
CONTRACT_VERIFICATION_TESTNET_PK=your_private_key
PINATA_JWT=your_pinata_jwt
```

3. Deploy the contract:
```bash
cd packages/lsp8-contracts
npx hardhat run scripts/deploy-verify.ts --network lukso
```

The deployment script will:
- Deploy the Roasted contract through your Universal Profile
- Verify the contract on Lukso explorer
- Save deployment information to `deployment-info.json`

### Minting Roasts

To mint a new roast:

1. Prepare your roast metadata:
```bash
cd packages/lsp8-contracts
npx hardhat run scripts/mint-roast.ts --network lukso
```

The minting script will:
- Create LSP4-compliant metadata
- Upload metadata to IPFS via Pinata
- Mint the roast NFT with proper metadata
- Handle any required payments based on roastee's set price

### Contract Usage

```javascript
// Set a price for being roasted
await roastedContract.setRoastPrice(ethers.parseEther("0.1"));

// Mint a roast
await roastedContract.mint(
  recipient,
  true,
  encodedData,
  { value: ethers.parseEther("0.1") }
);

// Tip a roast you enjoy
await roastedContract.tipRoast(tokenId, {
  value: ethers.parseEther("0.01")
});

// Withdraw accumulated earnings
await roastedContract.withdraw();
```

For more details on contract functionality, see the [Roasted contract source](./packages/lsp8-contracts/contracts/presets/Roasted.sol).

## Installation

```bash
# Install LSP8 contracts
npm install @lukso/lsp8-contracts
```