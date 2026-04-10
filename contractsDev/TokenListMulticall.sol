// SPDX-License-Identifier: MIT

// TokenListMulticall.sol

pragma solidity ^0.8.0;

contract TokenListMulticall {
    struct Call {
        address target;
        bytes callData;
    }

    /**
     * @notice Aggregates multiple read-only calls into a single call.
     * @param calls An array of Call structs, each containing a target contract and call data.
     * @return blockNumber The current block number.
     * @return returnData The aggregated results of the calls.
     */
    function aggregate(Call[] calldata calls)
        external
        view
        returns (uint256 blockNumber, bytes[] memory returnData)
    {
        blockNumber = block.number;
        returnData = new bytes[](calls.length);

        for (uint256 i = 0; i < calls.length; i++) {
            (bool success, bytes memory result) = calls[i].target.staticcall(
                calls[i].callData
            );
            require(success, "Multicall: call failed");
            returnData[i] = result;
        }
    }

    /**
     * @notice Helper function to get the balance of an ERC20 token for a user.
     * @param token The address of the ERC20 token contract.
     * @param account The address of the user.
     * @return balance The balance of the user.
     */
    function getTokenBalance(address token, address account)
        external
        view
        returns (uint256 balance)
    {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        require(success, "Multicall: balanceOf call failed");
        balance = abi.decode(data, (uint256));
    }
}
