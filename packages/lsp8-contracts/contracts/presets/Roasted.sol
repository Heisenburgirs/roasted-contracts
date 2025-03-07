// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.12;

// interfaces
import {IRoasted} from "./IRoasted.sol";

// modules
import {
    LSP8IdentifiableDigitalAsset
} from "../LSP8IdentifiableDigitalAsset.sol";

/**
 * @title Roasted smart contracts. Roast someone on the blockchain.
 */
contract Roasted is LSP8IdentifiableDigitalAsset, IRoasted {
    // Custom errors
    error DataTooShort();
    error InvalidRoasteeAddress();
    error PaymentTooLow(uint256 required, uint256 provided);
    error NoBalanceToWithdraw();
    error TransferFailed();
    error TokenDoesNotExist();
    error InvalidTipAmount();
    error InvalidDataFormat();
    
    // LSP4 Metadata key
    bytes32 constant LSP4_METADATA_KEY = keccak256("LSP4Metadata");
    
    // Mapping to track balances of users who are roasted
    mapping(address => uint256) public userBalances;
    
    // Mapping to track price per roast for each user
    mapping(address => uint256) public roastPrices;
    
    // Mapping to track roaster of each token
    mapping(bytes32 => address) public roastCreator;
    
    // Counter for token IDs
    uint256 private _tokenIdCounter;
    
    // Fixed tip amount
    uint256 public constant TIP_AMOUNT = 0.01 ether;
    
    // Event emitted when a user withdraws their balance
    event Withdrawal(address indexed user, uint256 amount);
    
    // Event emitted when a user is roasted
    event UserRoasted(address indexed roaster, address indexed roastee, uint256 amount);
    
    // Event emitted when a user sets their roast price
    event RoastPriceSet(address indexed user, uint256 price);
    
    // Event emitted when a roast is tipped
    event RoastTipped(bytes32 indexed tokenId, address indexed tipper, address indexed roaster, uint256 amount);

    /**
     * @notice Deploying a `LSP8Mintable` token contract with: token name = `name_`, token symbol = `symbol_`, and
     * address `newOwner_` as the token contract owner.
     *
     * @param name_ The name of the token.
     * @param symbol_ The symbol of the token.
     * @param newOwner_ The owner of the token contract.
     * @param lsp4TokenType_ The type of token this digital asset contract represents (`0` = Token, `1` = NFT, `2` = Collection).
     * @param lsp8TokenIdFormat_ The format of tokenIds (= NFTs) that this contract will create.
     */
    constructor(
        string memory name_,
        string memory symbol_,
        address newOwner_,
        uint256 lsp4TokenType_,
        uint256 lsp8TokenIdFormat_
    )
        LSP8IdentifiableDigitalAsset(
            name_,
            symbol_,
            newOwner_,
            lsp4TokenType_,
            lsp8TokenIdFormat_
        )
    {
        _tokenIdCounter = 1; // Start from 1
    }

    /**
     * @notice Sets the price for being roasted
     * @param price The minimum price someone must pay to roast you
     */
    function setRoastPrice(uint256 price) public override {
        roastPrices[msg.sender] = price;
        emit RoastPriceSet(msg.sender, price);
    }

    /**
     * @notice Minting a new token for address `to` with the additional data `data` (Note: allow non-LSP1 recipient is set to `force`).
     *
     * @dev Public {_mint} function callable by anyone who pays to roast someone.
     * The data parameter should be ABI encoded with (address roastee, bytes32 ipfsHash).
     * TokenId is automatically incremented.
     *
     * @param to The address that will receive the minted token.
     * @param force Set to `false` to ensure that you are minting for a recipient that implements LSP1, `false` otherwise for forcing the minting.
     * @param data ABI encoded data containing the roastee address and IPFS hash for metadata.
     * @return tokenId The ID of the minted token.
     */
    function mint(
        address to,
        bool force,
        bytes memory data
    ) public virtual override payable returns (bytes32 tokenId) {
        // Data should be at least the length of an encoded address and bytes32
        if (data.length < 64) revert DataTooShort();
        
        // Decode the roastee address and IPFS hash from data
        (address roastee, bytes memory bytesData) = abi.decode(data, (address, bytes));
        
        if (roastee == address(0)) revert InvalidRoasteeAddress();
        
        // Check if roastee has set a price and if the payment meets that price
        uint256 roasteePrice = roastPrices[roastee];
        if (roasteePrice > 0) {
            if (msg.value < roasteePrice) revert PaymentTooLow(roasteePrice, msg.value);
        }
        
        // If there's a payment, split it between roastee and owner
        if (msg.value > 0) {
            // Calculate the amount for the roastee (50% of the payment)
            uint256 roasteeAmount = msg.value / 2;
            uint256 ownerAmount = msg.value - roasteeAmount;
            
            // Add the roastee's share to their balance
            userBalances[roastee] += roasteeAmount;
            
            // Add the owner's share to their balance
            userBalances[owner()] += ownerAmount;
        }
        
        // Generate the next token ID
        uint256 newTokenId = _tokenIdCounter++;
        tokenId = bytes32(newTokenId);
        
        // Store the roast creator
        roastCreator[tokenId] = msg.sender;
        
        // Mint the token
        _mint(to, tokenId, force, data);
        
        // Set the metadata for the token
        if (bytesData.length > 0) {
            _setDataForTokenId(tokenId, LSP4_METADATA_KEY, bytesData);
        }
        
        emit UserRoasted(msg.sender, roastee, msg.value);
        
        return tokenId;
    }
    
    /**
     * @notice Tip a roast that you like
     * @param tokenId The ID of the roast to tip
     */
    function tipRoast(bytes32 tokenId) public override payable {
        // Check if the token exists
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        
        // Check if the tip amount is correct
        if (msg.value != TIP_AMOUNT) revert InvalidTipAmount();
        
        // Get the roaster (creator of the roast)
        address roaster = roastCreator[tokenId];
        
        // Calculate the split (70% to roaster, 30% to protocol)
        uint256 roasterAmount = (msg.value * 70) / 100;
        uint256 protocolAmount = msg.value - roasterAmount;
        
        // Add to roaster's balance
        userBalances[roaster] += roasterAmount;
        
        // Add to protocol owner's balance
        userBalances[owner()] += protocolAmount;
        
        // Emit event for indexer to track
        emit RoastTipped(tokenId, msg.sender, roaster, msg.value);
    }
    
    /**
     * @notice Allows a user to withdraw their accumulated balance from being roasted
     */
    function withdraw() public override {
        uint256 amount = userBalances[msg.sender];
        if (amount == 0) revert NoBalanceToWithdraw();
        
        // Reset the user's balance before transfer to prevent reentrancy
        userBalances[msg.sender] = 0;
        
        // Transfer the funds to the user
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit Withdrawal(msg.sender, amount);
    }
    
    /**
     * @notice Get the metadata IPFS hash for a specific token
     * @param tokenId The ID of the token
     * @return The IPFS hash of the token's metadata
     */
    function getTokenMetadata(bytes32 tokenId) public override view returns (bytes32) {
        if (!_exists(tokenId)) revert TokenDoesNotExist();
        
        bytes memory data = _getDataForTokenId(tokenId, LSP4_METADATA_KEY);
        if (data.length == 0) {
            return bytes32(0);
        }
        
        return abi.decode(data, (bytes32));
    }
    
    /**
     * @notice Get the current token ID counter value
     * @return The current token ID counter
     */
    function getCurrentTokenIdCounter() public override view returns (uint256) {
        return _tokenIdCounter;
    }
    
    // Make the contract payable
    receive() external payable virtual override {}
}
