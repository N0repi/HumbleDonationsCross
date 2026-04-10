// SPDX-License-Identifier: MIT

// IHumbleDonations.sol

pragma solidity >=0.7.0 <0.9.0;


interface IHumbleDonations {
    event DonationMade(uint256 indexed tokenId, address indexed donor, address erc20Token, uint256 amount, uint256 timestamp);
    event ProjectCreated(uint256 indexed tokenId, address indexed owner, string projectTitle, string uri, uint256 timestamp);
    event ProjectDeleted(uint256 indexed tokenId, address indexed previousOwner, address indexed burnAddress, uint256 timestamp);
}