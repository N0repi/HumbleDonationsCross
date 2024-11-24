// SPDX-License-Identifier: MIT

// NFTOnChainPayable8.sol
// Contract address: 0xCD90F0b737Ad0183a515cA171D2E6f0a1c7F4352

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/utils/Counters.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol"; // Import ReentrancyGuard
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract NftOnChainPayable8 is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard {
    mapping(uint256 => string) public tokenIdToProjectTitle;
    mapping(uint256 => address) public tokenIdToOwner;

    // Reverse mapping for projectTitle to tokenId
    mapping(string => uint256) public projectTitleToTokenId;

    // Reverse mapping for owner address to tokenId
    mapping(address => uint256) public ownerToTokenId;

    uint256 public constant mintRate = 0.05 ether;
    uint256 public fees;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    constructor() ERC721("NftOnChainPayable8", "NOC8") {}

    function safeMint(address to, string memory uri, string memory projectTitle) external payable {
        require(msg.value >= fees + mintRate, "Not enough ETH sent");
        require(projectTitleToTokenId[projectTitle] == 0, "Project title already exists");
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        tokenIdToProjectTitle[tokenId] = projectTitle;
        tokenIdToOwner[tokenId] = to;

        // Update reverse mappings
        projectTitleToTokenId[projectTitle] = tokenId;
        ownerToTokenId[to] = tokenId;

        payable(owner()).transfer(mintRate);
    }

    function getOwnerByProjectTitle(string memory projectTitle) external view returns (address) {
        uint256 tokenId = projectTitleToTokenId[projectTitle];
        if (tokenId != 0) {
            return tokenIdToOwner[tokenId];
        }
        return address(0);
    }

    function getProjectTitleByOwner(address owner) external view returns (string memory) {
        uint256 tokenId = ownerToTokenId[owner];
        if (tokenId != 0) {
            return tokenIdToProjectTitle[tokenId];
        }
        return "";
    }

    function payTokenOwner(
        uint256 tokenId,
        address erc20Token,
        uint256 amount
    ) external payable nonReentrant {
        address tokenOwner = ownerOf(tokenId);
        require(tokenOwner != address(0), "Token does not exist");
        require(msg.sender != tokenOwner, "Cannot pay yourself");

        // Ensure that the project title is available before making payments
        require(bytes(tokenIdToProjectTitle[tokenId]).length > 0, "Project title not set");

        uint256 paymentAmount;
        uint256 taxAmount;

        if (msg.value == 0) {
            // Check if the payment is in ERC-20 tokens
            require(erc20Token != address(0), "Invalid ERC-20 token address");

            // Interact with the ERC-20 token contract to transfer tokens
            IERC20 tokenContract = IERC20(erc20Token);

            // Ensure the sender has a sufficient token balance and has approved the transfer
            require(
                tokenContract.allowance(msg.sender, address(this)) >= amount,
                "Insufficient allowance"
            );
            require(tokenContract.balanceOf(msg.sender) >= amount, "Insufficient balance");

            // Calculate tax amount (1.5%)
            taxAmount = (amount * 15) / 1000;

            // Set the payment amount for ERC-20 transfer (excluding tax)
            paymentAmount = amount - taxAmount;

            // Transfer the ERC-20 tokens to the token owner
            require(
                tokenContract.transferFrom(msg.sender, tokenOwner, paymentAmount),
                "Token transfer failed"
            );
        } else {
            // Calculate tax amount (1.5%)
            taxAmount = (msg.value * 15) / 1000;

            // Set the payment amount for ETH transfer (excluding tax)
            paymentAmount = msg.value - taxAmount;

            // Transfer payment in ETH to the token owner
            require(paymentAmount == amount, "Incorrect ETH payment amount");
            payable(tokenOwner).transfer(paymentAmount);
        }

        // Apply tax unless the ERC-20 token address is exempt
        if (erc20Token != address(0x301944751abB2F5000C71B050b139e31AEaE4720)) {
            // Retain tax within the contract
            fees += taxAmount;
        }

        // Additional logic can be added here if needed, based on the payment amount
    }

    // The following functions are overrides required by Solidity.

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer Failed");
    }
}
