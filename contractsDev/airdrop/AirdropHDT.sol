// SPDX-License-Identifier: MIT

// AirdropHDT.sol

pragma solidity >=0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AirdropHDT is Ownable {
    IERC20 public token;
    bytes32 public merkleRoot;
    mapping(address => bool) public hasClaimed;

    event TokensClaimed(address indexed claimant, uint256 amount);

    // The constructor correctly calls the Ownable constructor
    constructor(IERC20 _token, bytes32 _merkleRoot) Ownable(msg.sender) {
        token = _token;
        merkleRoot = _merkleRoot;
    }

    function claimTokens(uint256 amount, bytes32[] calldata merkleProof) external {
        // *Add a require for insufficient contract balance*
        require(!hasClaimed[msg.sender], "Tokens already claimed");

        // Compute the leaf node hash (the hash of the recipient's address and the amount)
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));

        // Verify the proof against the stored Merkle root
        require(MerkleProof.verify(merkleProof, merkleRoot, leaf), "Invalid Merkle proof");

        // Mark the recipient as having claimed their tokens
        hasClaimed[msg.sender] = true;

        // Transfer the tokens to the recipient
        require(token.transfer(msg.sender, amount), "Token transfer failed");

        emit TokensClaimed(msg.sender, amount);
    }

    function withdrawToken(
        address erc20Token,
        uint256 amount
    ) external onlyOwner {
        require(erc20Token != address(0), "Invalid ERC-20 token address");
        // Interact with the ERC-20 token contract to transfer tokens
        IERC20 tokenContract = IERC20(erc20Token);
        // Ensure the contract has a sufficient token balance
        require(
            tokenContract.balanceOf(address(this)) >= amount,
            "Insufficient token balance"
        );

        // Transfer the ERC-20 tokens to the contract owner
        require(
            tokenContract.transfer(msg.sender, amount),
            "Token transfer failed"
        );
    }
    // Function to get the current Merkle Root
    function getMerkleRoot() external view returns (bytes32) {
        return merkleRoot;
    }
}
