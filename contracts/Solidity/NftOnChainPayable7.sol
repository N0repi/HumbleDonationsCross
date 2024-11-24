// SPDX-License-Identifier: MIT

// NFTOnChainPayable7.sol
// Contract address: 0xE9CD77D88C73b0B221eec6E161c10e2240DC0aC4

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/utils/Counters.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "../node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol"; // Import ReentrancyGuard

contract NftOnChainPayable7 is
    ERC721,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard
{
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

    constructor() ERC721("NftOnChainPayable7", "NOC7") {}

    function safeMint(
        address to,
        string memory uri,
        string memory projectTitle
    ) external payable {
        require(msg.value >= fees + mintRate, "Not enough ETH sent");
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

    function getOwnerByProjectTitle(
        string memory projectTitle
    ) external view returns (address) {
        uint256 tokenId = projectTitleToTokenId[projectTitle];
        if (tokenId != 0) {
            return tokenIdToOwner[tokenId];
        }
        return address(0);
    }

    function getProjectTitleByOwner(
        address owner
    ) external view returns (string memory) {
        uint256 tokenId = ownerToTokenId[owner];
        if (tokenId != 0) {
            return tokenIdToProjectTitle[tokenId];
        }
        return "";
    }

    function payTokenOwner(uint256 tokenId) external payable {
        address tokenOwner = ownerOf(tokenId);
        require(tokenOwner != address(0), "Token does not exist");
        require(msg.sender != tokenOwner, "Cannot pay yourself");

        // Ensure that the project title is available before making payments
        require(
            bytes(tokenIdToProjectTitle[tokenId]).length > 0,
            "Project title not set"
        );

        // Calculate the payment amount (you may customize this logic)
        uint256 paymentAmount = msg.value / 2;

        // Transfer payment to the token owner
        payable(tokenOwner).transfer(paymentAmount);
    }

    // The following functions are overrides required by Solidity.

    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
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
