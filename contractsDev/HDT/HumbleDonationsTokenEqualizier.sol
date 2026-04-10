// // SPDX-License-Identifier: MIT

// // HumbleDonationsToken.sol

// pragma solidity ^0.8.0;


// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// contract HumbleDonationsToken is

// Initializable, ERC20Upgradeable, ERC20BurnableUpgradeable, ERC20PausableUpgradeable, OwnableUpgradeable, ERC20PermitUpgradeable, ERC20VotesUpgradeable
// {
//         // Internal variables to hold the name and symbol


//     // Initialize function for upgradeable pattern
//     // constructor(address initialOwner);


//     function initialize(address initialOwner) initializer public {
//         __ERC20_init(name, symbol);
//         __ERC20Burnable_init();
//         __ERC20Pausable_init();
//         __Ownable_init(initialOwner);
//         __ERC20Permit_init(name);
//         __ERC20Votes_init();
//         // Mint initial supply of tokens
//         _mint(msg.sender, 100000000 * 10 ** decimals());
//     }


//    // Name and symbol functions as pure (hardcoded)
//     function name() public pure override returns (string memory) {

//     }

//     function symbol() public pure override returns (string memory) {

//     }

    



//     function pause() public onlyOwner {
//         _pause();
//     }

//     function unpause() public onlyOwner {
//         _unpause();
//     }

//     function mint(address to, uint256 amount) public onlyOwner {
//         _mint(to, amount);
//     }

//     // The following functions are overrides required by Solidity.

//     function _update(address from, address to, uint256 value) onlyOwner
//         internal
//         override(ERC20Upgradeable, ERC20PausableUpgradeable, ERC20VotesUpgradeable)
//     {
//         super._update(from, to, value);
//     }

//     function nonces(
//         address owner
//     ) public view override(ERC20PermitUpgradeable, NoncesUpgradeable) returns (uint256) {
//         return super.nonces(owner);
//     }

//     // function _burn(address account, uint256 amount) internal override(ERC20) {
//     // super._burn(account, amount);
//     // }
// }
