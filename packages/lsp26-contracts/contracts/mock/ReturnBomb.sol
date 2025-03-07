// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.17;

// interfaces
import {
    ILSP1UniversalReceiver
} from "@lukso/lsp1-contracts/contracts/ILSP1UniversalReceiver.sol";

contract ReturnBomb is ILSP1UniversalReceiver {
    uint256 public counter;

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }

    function universalReceiver(
        bytes32,
        bytes memory
    ) external payable returns (bytes memory) {
        ++counter;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            revert(0, 10000)
        }
    }
}
