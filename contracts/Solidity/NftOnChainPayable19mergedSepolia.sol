// SPDX-License-Identifier: MIT

// NftOnChainPayable19mergedSepolia.sol
// Contract address: 0xe38205b1810E8d44a9f1fD78A70909d92B4cf212
// new counter function: 0xCbAcC836872F38fD93C826de25A0D87a569c2870

pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
// import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";


contract NftOnChainPayable19mergedSepolia is
    ERC721,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard
{
    // SwapRouter Sepolia self-deployed: 0x448496c01C65805AB2146d5Bad79c39524e16F08
    // SwapRouter02 Sepolia: 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E
    // SwapRouter02 Arbitrum Sepolia: 0x101F443B4d1b059569D643917553c771E1b9663E

    // ISwapRouter public immutable swapRouter = ISwapRouter(SWAP_ROUTER);
    // IV3SwapRouter public immutable swapRouter02 = IV3SwapRouter(SWAP_ROUTER_02);



    // -----CONSTANTS-----
    address private constant SWAP_ROUTER_02 = (0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E); // SwapRouter02
    IV3SwapRouter public immutable swapRouter = IV3SwapRouter(SWAP_ROUTER_02);

    address public constant HDT = 0x9707Be4129F68B767aF550fe1c631BF1779623Cb; // Sepolia
    address public constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // Sepolia
    address private constant recipient1 = 0xfdA30F9d6A3864f092586Cf755Fc8FCdaF8BB5Ae; // Sepolia safe
    address private constant recipient2 = 0x88b944E7E3D495B88cAa62FB0158F697C9A1561d; // dev
    // -----CONSTANTS-----


    constructor(
    ) ERC721("NftOnChainPayable19Sepolia", "NOC19") {}


    // -----MAPPINGS-----
    // Mapping to store ERC-20 token balances for each tokenId
    mapping(uint256 => mapping(address => uint256)) public tokenBalances;

    // Mapping to store the number of donations for each tokenId
    mapping(uint256 => uint256) public numDonations;

    // Mapping to store tokenBalances correlated with numDonations
    mapping(uint256 => mapping(uint256 => uint256)) public donationAmounts;

    mapping(uint256 => string) public tokenIdToProjectTitle;
    mapping(uint256 => address) public tokenIdToOwner;

    // Reverse mapping for projectTitle to tokenId
    mapping(string => uint256) public projectTitleToTokenId;

    // Reverse mapping for owner address to tokenId
    mapping(address => uint256) public ownerToTokenId;

    // Mapping to store the number of donations per project per month
    mapping(uint256 => mapping(uint256 => uint256)) public donationsPerProjectPerMonth;

    // Mapping to store the project with the highest donations for each month
    mapping(uint256 => uint256) public highestDonationsPerMonth;

    // Variable to track the current month
    uint256 public currentMonth;
    // -----MAPPINGS-----


    // -----DECLARATIONS-----
    uint256 public taxPercentage;
    uint256 public constant mintRate = 0.0001 ether;
    uint256 public fees;
    uint24 public constant poolFee = 3000; // uni pool fee med
    // -----DECLARATIONS-----


    // -----TIME-----
    // ------RANDOM PROJECT-----
    uint256 internal constant ONE_HOUR = 3600; // seconds/hour
    
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Function to retrieve the current token ID counter
    function latestTokenId() external view returns (uint256) {
        return _tokenIdCounter.current();
    }
    // ------RANDOM PROJECT-----

    uint256 month = block.timestamp + (30 days);

    // Function to update the highest donations for the current month
    function updateHighestDonations() internal {
        // Get the current month
        uint256 currentMonthTimestamp = block.timestamp / 30 days;
        if (currentMonthTimestamp > currentMonth) {
            // Update the highest donations for the previous month
            highestDonationsPerMonth[currentMonth] = 0;
            currentMonth = currentMonthTimestamp;
        }
    }
    // -----TIME-----


    // -----CREATE PROJECT-----
    function safeMint(
        address to,
        string memory uri,
        string memory projectTitle
    ) external payable {
        require(msg.value >= fees + mintRate, "Not enough ETH sent");
        require(
            projectTitleToTokenId[projectTitle] == 0,
            "Project title already exists"
        );
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        tokenIdToProjectTitle[tokenId] = projectTitle;
        tokenIdToOwner[tokenId] = to;

        // Update reverse mappings
        projectTitleToTokenId[projectTitle] = tokenId;
        ownerToTokenId[to] = tokenId;

        payable(recipient2).transfer(mintRate);
    }
    // -----CREATE PROJECT-----


    // -----CHECKS FOR OWNERSHIP-----
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
    // -----CHECKS FOR OWNERSHIP-----


    function setTaxPercentage(uint256 tax) external onlyOwner {
        // tax = 15 == 1.5%;
        taxPercentage = tax;
    }

    function getPercentage() external view returns (uint256) {
        return taxPercentage;
    }


    // -----ROUTER LOGIC-----
    function swapExactInputMultihop(
        address tokenIn,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        // IERC20 tokenContract = IERC20(tokenIn);
        // uint24 dynamicPoolFee = calculatePoolFee(tokenIn);
        // Transfer `amountIn` of tokenIn to this contract.

        // uint256 test = msg.value;
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );
        // Approve(tokenIn);
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        // Check if the input token is already WETH
        if (tokenIn == WETH) {
            // Single hop - for ETH & WETH
            IV3SwapRouter.ExactInputSingleParams memory params =
                IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: WETH,
                    tokenOut: HDT,
                    fee: poolFee,
                    recipient: address(this),
                    // deadline: block.timestamp, // no deadline using 02
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                });
            // Executes the swap.
            amountOut = swapRouter.exactInputSingle(params);
        } else {
            // Multi hop - for everything else
            IV3SwapRouter.ExactInputParams memory params =
                IV3SwapRouter.ExactInputParams({
                    path: abi.encodePacked(tokenIn, poolFee, WETH, poolFee, HDT),
                    recipient: address(this),
                    // deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: 0
                });
            // Executes the swap.
            amountOut = swapRouter.exactInput(params);
        }

        // Now, distribute the output tokens among the specified recipients
        uint256 halfAmount = amountOut / 2;
        TransferHelper.safeTransfer(HDT, recipient1, halfAmount);
        TransferHelper.safeTransfer(HDT, recipient2, halfAmount);
    }

    // For Ether -> can probably merge with first `if WETH` of `swapExactInputMultihop`
    function swapExactInputSingleETH(
        uint256 amountIn
    ) internal returns (uint256 amountOut) {

        uint256 minOut = /* Calculate min output */ 0;
        uint160 priceLimit = /* Calculate price limit */ 0;

        IV3SwapRouter.ExactInputSingleParams memory params = IV3SwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: HDT,
                fee: poolFee,
                recipient: address(this),
                // deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: priceLimit
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle{value: amountIn}(params);

        uint256 halfAmount = amountOut / 2;
        TransferHelper.safeTransfer(HDT, recipient1, halfAmount);
        TransferHelper.safeTransfer(HDT, recipient2, halfAmount);
        }
    // -----ROUTER LOGIC-----


    // -----DONATION LOGIC-----
    function payTokenOwner(
        uint256 tokenId,
        address erc20Token,
        uint256 amount
    ) external payable nonReentrant {
        // Update the highest donations for the current month
        updateHighestDonations();

        // Update the number of donations for the project for the current month
        donationsPerProjectPerMonth[tokenId][currentMonth] += 1;

        // Update the highest donations for the current month if needed
        if (donationsPerProjectPerMonth[tokenId][currentMonth] > highestDonationsPerMonth[currentMonth]) {
            highestDonationsPerMonth[currentMonth] = donationsPerProjectPerMonth[tokenId][currentMonth];
        }
        // Ensure the sender is not the token owner
        address tokenOwner = ownerOf(tokenId);
        require(msg.sender != tokenOwner, "Cannot pay yourself");
        // Ensure that the project title is available before making payments
        require(
            bytes(tokenIdToProjectTitle[tokenId]).length > 0,
            "Project title not set"
        );
        uint256 total;
        uint256 taxAmount = (amount * taxPercentage) / 1000;

        IERC20 tokenContract = IERC20(erc20Token);
        if (erc20Token != address(HDT)) {
            total = amount - taxAmount;
            if (erc20Token == address(0)) {
                // If the input token is ETH, ensure the sender has sent exactly the required amount
                require(msg.value >= amount, "Incorrect amount of ETH sent");

                
                // Perform the multihop swap, including wrapping of ETH if needed
                swapExactInputSingleETH(taxAmount); 
                // {value: taxAmount}

                payable(tokenOwner).transfer(total);


            } else {
                require(
                    tokenContract.allowance(msg.sender, address(this)) >= amount,
                    "Insufficient allowance"
                    
                );

                swapExactInputMultihop(
                    erc20Token,
                    taxAmount
                );
                require(
                    // Transfer total amount to the contract | eg. 98.5%
                    tokenContract.transferFrom(msg.sender, tokenOwner, total),
                    "Transfer total failed"
                );
            }
        } else {
            total = amount;

            // Ensure the sender has a sufficient token balance
            require(
                tokenContract.allowance(msg.sender, address(this)) >= amount,
                "Insufficient allowance"
            );

            require(
                // Transfer total amount to the contract | eg. 100%
                tokenContract.transferFrom(msg.sender, tokenOwner, total),
                "Transfer total failed"
            );
        }
        tokenBalances[tokenId][erc20Token] += total;
        numDonations[tokenId]++; // Increment the number of donations
        donationAmounts[tokenId][numDonations[tokenId]] = total;
    }
    // -----DONATION LOGIC-----


    // -----METRICS-----
    // Function to retrieve the ERC-20 token balance for a specific tokenId
    function getTokenBalance(
        uint256 tokenId,
        address erc20Token
    ) external view returns (uint256) {
        return tokenBalances[tokenId][erc20Token];
    }

    function getNumDonations(uint256 tokenId) external view returns (uint256) {
        return numDonations[tokenId];
    }

    function getDonationAmount(
        uint256 tokenId,
        uint256 donationIndex
    ) external view returns (uint256) {
        return donationAmounts[tokenId][donationIndex];
    }
    // -----METRICS-----


    // -----DELETE PROJECT-----
    function _burn(
        uint256 tokenId
    ) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }
    // -----DELETE PROJECT-----


    // -----URI-----
    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    // -----URI-----

    function withdraw() external onlyOwner {
        (bool success, ) = msg.sender.call{value: address(this).balance}("");
        require(success, "Transfer Failed");
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
}