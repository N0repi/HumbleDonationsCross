// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Create2.sol"; // Ensure this path is correct
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleDeployer {
    address private constant TARGET_WALLET = 0x951204CB69C2e24572FeB727f9fCD837404eBf70; // Hardcoded recipient

    event Deployed(address addr);
    event TokensTransferred(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed token, address indexed newOwner);

    /**
     * @dev Deploys a contract using CREATE2 at a deterministic address.
     * @param amount Amount of ETH to send (use 0 if not needed).
     * @param salt Salt for deterministic address generation.
     * @param bytecode Bytecode of the contract to be deployed.
     */
    function deploy(uint256 amount, bytes32 salt, bytes memory bytecode) external returns (address) {
        address deployedAddress = Create2.deploy(amount, salt, bytecode);
        emit Deployed(deployedAddress);
        return deployedAddress;
    }

    /**
     * @dev Transfers all tokens of the specified ERC20 contract from this contract to the target wallet.
     * @param token The address of the ERC20 token contract.
     */
    function transferAllTokens(address token) external {
        IERC20 tokenContract = IERC20(token);
        uint256 balance = tokenContract.balanceOf(address(this));
        require(balance > 0, "No tokens to transfer");

        // Transfer all tokens to the target wallet
        bool success = tokenContract.transfer(TARGET_WALLET, balance);
        require(success, "Token transfer failed");

        emit TokensTransferred(token, TARGET_WALLET, balance);
    }

    /**
     * @dev Transfers ownership of the specified Ownable contract to the target wallet.
     * @param token The address of the Ownable contract to transfer ownership.
     */
    function transferTokenOwnership(address token) external {
        Ownable ownableToken = Ownable(token);
        address currentOwner = ownableToken.owner();
        require(currentOwner == address(this), "Not the owner");

        // Transfer ownership to the target wallet
        ownableToken.transferOwnership(TARGET_WALLET);

        emit OwnershipTransferred(token, TARGET_WALLET);
    }

    /**
     * @dev Computes the deterministic address for a contract to be deployed.
     * @param salt Salt for deterministic address generation.
     * @param bytecodeHash Hash of the bytecode of the contract.
     */
    function computeAddress(bytes32 salt, bytes32 bytecodeHash) external view returns (address) {
        return Create2.computeAddress(salt, bytecodeHash);
    }
}
