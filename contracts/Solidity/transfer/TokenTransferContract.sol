// SPDX-License-Identifier: MIT

// TokenTransferContract.sol

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenTransferContract {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function transferTokens(
        address tokenAddress,
        address to,
        uint256 amount
    ) external {
        require(msg.sender == owner, "Only owner can initiate transfer");

        IERC20 token = IERC20(tokenAddress);
        token.transfer(to, amount);
    }
}
