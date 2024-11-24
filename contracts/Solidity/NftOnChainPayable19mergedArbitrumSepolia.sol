// SPDX-License-Identifier: MIT

// NftOnChainPayable19merged.sol
// Contract address: 0x0853EAe8D58d508b03D044AA27B2Cf90150F7e29
// 0xFfAd3B33dCa5464605CE90C0794eb9b9044D1612
// 0x41b0f2230C0D3624BA1962DD2BBe943680681902
// 0xD0Eb817cDdcC0A81a2f8159dCefa894de22F4Fe7
// 0x4968bF6DAF8Ce3aE97B177Df462747389a8fF4E2
// 0xB4e03596C300fb72f1657208114d5075EB2421d9
// 0xF7516Dc21A6C6F5099ad6b62c5f9199871CC16aF

// GPT contract log for NOC15:
    // Contract address: 0x0853EAe8D58d508b03D044AA27B2Cf90150F7e29
    // 0xFfAd3B33dCa5464605CE90C0794eb9b9044D1612
    // 0x41b0f2230C0D3624BA1962DD2BBe943680681902
    // 0xD0Eb817cDdcC0A81a2f8159dCefa894de22F4Fe7

    // indicates that F4E2 is the correct address

pragma solidity >=0.7.0 <0.9.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
// import "@uniswap/swap-router-contracts/contracts/interfaces/ISwapRouter02.sol"; // this has mismatched versions
import "@uniswap/swap-router-contracts/contracts/interfaces/IV3SwapRouter.sol";


contract NftOnChainPayable19mergedArbitrumSepolia is
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

    address private constant SWAP_ROUTER_02 = (0x101F443B4d1b059569D643917553c771E1b9663E); // SwapRouter02
    IV3SwapRouter public immutable swapRouter = IV3SwapRouter(SWAP_ROUTER_02);


    // Address of the HDT token
    // address public constant HDT = 0x301944751abB2F5000C71B050b139e31AEaE4720; // Arb Sepolia
    address public constant HDT = 0x301944751abB2F5000C71B050b139e31AEaE4720; // Sepolia
    address public constant WETH = 0x67e197D575e7A350Ff3dE1A7eAd2aA06b19145B6; // Sepolia
    address private constant recipient1 = 0xfdA30F9d6A3864f092586Cf755Fc8FCdaF8BB5Ae; // Sepolia safe
    // address private constant recipient1 = 0xfdA30F9d6A3864f092586Cf755Fc8FCdaF8BB5Ae // sepolia safe
    address private constant recipient2 = 0x88b944E7E3D495B88cAa62FB0158F697C9A1561d; // dev

    // DynamicMultiHop2rep public dynamicMultiHop;

    constructor(
    ) ERC721("NftOnChainPayable19ArbitrumSepolia", "NOC19") {
        // dynamicMultiHop = DynamicMultiHop2rep(0x6fd1282D822837Bc6ffECD5279F64C8F026aa9C4);
    }
    // goerli: 0x49140f5435Eb447feFAa29D63147fFAe5C7365b3
    // hardhat mainnet fork: 0x15F2ea83eB97ede71d84Bd04fFF29444f6b7cd52
    uint256 public taxPercentage;

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

    uint256 public constant mintRate = 0.0001 ether;
    uint256 public fees;

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

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

    function setTaxPercentage(uint256 tax) external onlyOwner {
        // tax = 15 == 1.5%;
        taxPercentage = tax;
    }

    function getPercentage() external view returns (uint256) {
        return taxPercentage;
    }

    uint24 public constant poolFee = 3000;

// -----REMOVED FROM SEPOLIA CONTRACT-----
    // Define a struct to hold pool data including the fee tier
    // struct PoolData {
    //     address poolAddress;
    //     uint24 feeTier;
    // }

    // function fetchPoolData(address tokenIn) internal view returns (PoolData memory) {
    //     // Get the instance of the Uniswap V3 factory contract
    //     IUniswapV3Factory factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);
        
    //     // Define an array to store potential fee tiers to check
    //     uint24[] memory feeTiers = new uint24[](5); // Example: Check up to 5 fee tiers
    //     feeTiers[0] = 500; // You can add more fee tiers here as needed

    //     // Loop through the fee tiers and attempt to fetch the pool data
    //     for (uint256 i = 0; i < feeTiers.length; i++) {
    //         address pair = factory.getPool(tokenIn, WETH, feeTiers[i]);
    //         if (pair != address(0)) {
    //             return PoolData(pair, feeTiers[i]);
    //         }
    //     }

    //     revert("Pool not found");
    // }

    // function calculatePoolFee(address tokenIn) internal view returns (uint24) {
    //     // Fetch pool data to determine the fee tier
    //     PoolData memory poolData = fetchPoolData(tokenIn);

    //     // Get the tick spacing for the pair
    //     IUniswapV3Pool pool = IUniswapV3Pool(poolData.poolAddress);
    //     (, int24 tickSpacing, , , , , ) = pool.slot0();

    //     // Calculate the fee from the tick spacing
    //     int24 tickSpacingInt24 = int24(tickSpacing);
    //     uint24 denominator = 4295; // 2^32/1000
    //     uint24 numerator = 1000000; // 1e6
    //     uint24 fee = uint24((numerator * (denominator - uint24(tickSpacingInt24))) / denominator);

    //     // Ensure the fee is within the valid range (0 to 10000)
    //     require(fee >= 0 && fee <= 10000, "Invalid fee range");

    //     return fee;
    // }
// -----REMOVED FROM SEPOLIA CONTRACT-----


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
                    // deadline: block.timestamp,
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
        // address tokenOut,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {

        // uint256 amountIn = msg.value;
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

    function payTokenOwner(
        uint256 tokenId,
        address erc20Token,
        uint256 amount
    ) external payable nonReentrant {
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