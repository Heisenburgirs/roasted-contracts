// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.12;

// interfaces
import {
    ILSP8IdentifiableDigitalAsset
} from "../ILSP8IdentifiableDigitalAsset.sol";

/**
 * @dev Roasted contract interface with auto-incrementing tokenId mint function.
 */
interface IRoasted is ILSP8IdentifiableDigitalAsset {
    /**
     * @param to The address to mint tokens
     * @param force When set to TRUE, to may be any address but
     * when set to FALSE to must be a contract that supports LSP1 UniversalReceiver
     * @param data Additional data the caller wants included in the emitted event, and sent in the hooks to `from` and `to` addresses.
     * @dev Mints a token with auto-generated tokenId and transfers it to `to`.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `data` must contain properly encoded roastee address and IPFS hash.
     *
     * Emits a {Transfer} event and a {UserRoasted} event.
     * @return tokenId The ID of the minted token.
     */
    function mint(
        address to,
        bool force,
        bytes memory data
    ) external payable returns (bytes32 tokenId);
    
    /**
     * @notice Sets the price for being roasted
     * @param price The minimum price someone must pay to roast you
     */
    function setRoastPrice(uint256 price) external;
    
    /**
     * @notice Tip a roast that you like
     * @param tokenId The ID of the roast to tip
     */
    function tipRoast(bytes32 tokenId) external payable;
    
    /**
     * @notice Allows a user to withdraw their accumulated balance from being roasted
     */
    function withdraw() external;
    
    /**
     * @notice Get the metadata IPFS hash for a specific token
     * @param tokenId The ID of the token
     * @return The IPFS hash of the token's metadata
     */
    function getTokenMetadata(bytes32 tokenId) external view returns (bytes32);
    
    /**
     * @notice Get the current token ID counter value
     * @return The current token ID counter
     */
    function getCurrentTokenIdCounter() external view returns (uint256);
} 