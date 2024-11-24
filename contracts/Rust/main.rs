#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;


// Declare modules for the Rust files in the current directory
mod erc721;
mod ownable;
mod erc20;

use stylus_sdk::{alloy_primitives::U256, prelude::*};
use erc721::ERC721;
// use erc721::ERC721URIStorage;
use ownable::Ownable;
use erc20::ERC20Params;
use std::collections::HashMap;
use std::convert::TryInto;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use erc721::ERC721Params;

struct NOC19SepoliaParsedStylus {
    erc721: ERC721,
    ownable: Ownable,
    router: Mutex<NOC19SepoliaParsedRouter>,
    token_balances: Mutex<HashMap<u64, HashMap<String, u64>>>,
    num_donations: Mutex<HashMap<u64, u64>>,
    donation_amounts: Mutex<HashMap<u64, HashMap<u64, u64>>>,
    token_id_to_project_title: Mutex<HashMap<u64, String>>,
    token_id_to_owner: Mutex<HashMap<u64, String>>,
    project_title_to_token_id: Mutex<HashMap<String, u64>>,
    owner_to_token_id: Mutex<HashMap<String, u64>>,
    donations_per_project_per_month: Mutex<HashMap<u64, HashMap<u64, u64>>>,
    highest_donations_per_month: Mutex<HashMap<u64, u64>>,
    current_month: Mutex<u64>,
    tax_percentage: Mutex<u64>,
    mint_rate: u64,
    fees: u64,
}

struct MyERC721Params;

impl ERC721Params for MyERC721Params {
    const NAME: &'static str = "NftOnChainPayable19Sepolia";
    const SYMBOL: &'static str = "NOC19";

    fn token_uri(id: U256) -> String {
        // Implement this function if needed
        unimplemented!()
    }
}

impl NOC19SepoliaParsedStylus {
    fn new(router: NOC19SepoliaParsedRouter) -> Self {
        NOC19SepoliaParsedStylus {
            erc721: ERC721::new::<MyERC721Params>(),
            ownable: Ownable::new(),
            router: Mutex::new(router),
            token_balances: Mutex::new(HashMap::new()),
            num_donations: Mutex::new(HashMap::new()),
            donation_amounts: Mutex::new(HashMap::new()),
            token_id_to_project_title: Mutex::new(HashMap::new()),
            token_id_to_owner: Mutex::new(HashMap::new()),
            project_title_to_token_id: Mutex::new(HashMap::new()),
            owner_to_token_id: Mutex::new(HashMap::new()),
            donations_per_project_per_month: Mutex::new(HashMap::new()),
            highest_donations_per_month: Mutex::new(HashMap::new()),
            current_month: Mutex::new(0),
            tax_percentage: Mutex::new(0),
            mint_rate: 0.0001,
            fees: 0,
        }
    }

    fn safe_mint(&self, to: String, uri: String, project_title: String) {
        let mut router = self.router.lock().unwrap();
        let mut token_balances = self.token_balances.lock().unwrap();
        let mut num_donations = self.num_donations.lock().unwrap();
        let mut donation_amounts = self.donation_amounts.lock().unwrap();
        let mut token_id_to_project_title = self.token_id_to_project_title.lock().unwrap();
        let mut token_id_to_owner = self.token_id_to_owner.lock().unwrap();
        let mut project_title_to_token_id = self.project_title_to_token_id.lock().unwrap();
        let mut owner_to_token_id = self.owner_to_token_id.lock().unwrap();
        
        assert!(msg.value >= self.fees + self.mint_rate, "Not enough ETH sent");
        assert!(project_title_to_token_id.get(&project_title).is_none(), "Project title already exists");

        let tokenId = self._token_id_counter();
        self._increment_token_id_counter();

        self.erc721.safe_mint(to.clone());
        self.erc721_uri_storage.set_token_uri(tokenId, uri.clone());

        token_id_to_project_title.insert(tokenId, project_title.clone());
        token_id_to_owner.insert(tokenId, to.clone());

        // Update reverse mappings
        project_title_to_token_id.insert(project_title, tokenId);
        owner_to_token_id.insert(to, tokenId);

        payable(recipient2).transfer(self.mint_rate.try_into().unwrap());
    }

    fn update_highest_donations(&self) {
        let mut highest_donations_per_month = self.highest_donations_per_month.lock().unwrap();
        let mut current_month = self.current_month.lock().unwrap();

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
        let current_month_timestamp = now / (30 * 24 * 60 * 60); // assuming a month is 30 days

        if current_month_timestamp > *current_month {
            // Update the highest donations for the previous month
            highest_donations_per_month.insert(*current_month, 0);
            *current_month = current_month_timestamp;
        }
    }

    fn pay_token_owner(&self, tokenId: u64, erc20_token: String, amount: u64) {
        let mut router = self.router.lock().unwrap();
        let mut token_balances = self.token_balances.lock().unwrap();
        let mut num_donations = self.num_donations.lock().unwrap();
        let mut donation_amounts = self.donation_amounts.lock().unwrap();
        
        // Update the highest donations for the current month
        self.update_highest_donations();
    
        let mut donations_per_project_per_month = self.donations_per_project_per_month.lock().unwrap();
        let mut highest_donations_per_month = self.highest_donations_per_month.lock().unwrap();
        let mut current_month = self.current_month.lock().unwrap();
    
        // Update the number of donations for the project for the current month
        let entry = donations_per_project_per_month.entry(tokenId).or_insert(HashMap::new());
        let month_entry = entry.entry(*current_month).or_insert(0);
        *month_entry += 1;
    
        // Update the highest donations for the current month if needed
        if *month_entry > *highest_donations_per_month.get(current_month).unwrap_or(&0) {
            highest_donations_per_month.insert(*current_month, *month_entry);
        }
    
        // Ensure the sender is not the token owner
        let token_owner = self.token_id_to_owner.lock().unwrap().get(&tokenId).unwrap().clone();
        assert!(token_owner != msg.sender, "Cannot pay yourself");
    
        // Ensure that the project title is available before making payments
        assert!(!self.token_id_to_project_title.lock().unwrap().get(&tokenId).unwrap_or(&"".to_string()).is_empty(), "Project title not set");
    
        let mut total: u64;
        let tax_amount: u64 = (amount * *self.tax_percentage.lock().unwrap()) / 1000;
    
        let token_contract = IERC20(erc20_token.clone());
        if erc20_token != HDT {
            total = amount - tax_amount;
            if erc20_token == address(0) {
                // If the input token is ETH, ensure the sender has sent exactly the required amount
                assert!(msg.value >= amount, "Incorrect amount of ETH sent");
    
                // Perform the multihop swap, including wrapping of ETH if needed
                router.swap_exact_input_single_eth(tax_amount.try_into().unwrap());
    
                payable(token_owner.clone()).transfer(total.try_into().unwrap());
            } else {
                assert!(token_contract.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
    
                router.swap_exact_input_multihop(erc20_token.clone(), tax_amount.try_into().unwrap());
                assert!(token_contract.transfer_from(msg.sender, token_owner.clone(), total.try_into().unwrap()), "Transfer total failed");
            }
        } else {
            total = amount;
    
            // Ensure the sender has a sufficient token balance
            assert!(token_contract.allowance(msg.sender, address(this)) >= amount, "Insufficient allowance");
            assert!(token_contract.transfer_from(msg.sender, token_owner.clone(), total.try_into().unwrap()), "Transfer total failed");
        }
    
        token_balances.get_mut(&tokenId).unwrap().insert(erc20_token.clone(), total);
        let num_donations_entry = num_donations.entry(tokenId).or_insert(0);
        *num_donations_entry += 1;
        donation_amounts.get_mut(&tokenId).unwrap().insert(*num_donations_entry, total);
    }
    fn get_token_balance(&self, tokenId: u64, erc20_token: String) -> u64 {
        let token_balances = self.token_balances.lock().unwrap();
        *token_balances.get(&tokenId).unwrap().get(&erc20_token).unwrap_or(&0)
    }

    // Function to retrieve the number of donations for a specific tokenId
    fn get_num_donations(&self, tokenId: u64) -> u64 {
        let num_donations = self.num_donations.lock().unwrap();
        *num_donations.get(&tokenId).unwrap_or(&0)
    }

    // Function to retrieve the donation amount for a specific tokenId and donation index
    fn get_donation_amount(&self, tokenId: u64, donation_index: u64) -> u64 {
        let donation_amounts = self.donation_amounts.lock().unwrap();
        *donation_amounts.get(&tokenId).unwrap().get(&donation_index).unwrap_or(&0)
    }

    // Function to delete a project
    fn burn(&self, tokenId: u64) {
        self.erc721.burn(tokenId); // Call _burn from ERC721
        self.erc721_uri_storage.burn(tokenId); // Call _burn from ERC721URIStorage
    }
    // ##########################################################
    // **** need ERC721URIStorage crate to make uri function ****
    // ##########################################################

    // Function to withdraw ETH from the contract
    fn withdraw(&self) {
        assert_eq!(msg.sender, self.ownable.owner(), "Only owner can withdraw");
        payable(msg.sender).transfer(address(this).balance);
    }

    // Function to withdraw ERC-20 tokens from the contract
    fn withdraw_token(&self, erc20_token: String, amount: u64) {
        assert!(erc20_token != address(0), "Invalid ERC-20 token address");
        
        let token_contract = IERC20(erc20_token.clone());
        let token_balance = token_contract.balance_of(address(this));
        assert!(token_balance >= amount, "Insufficient token balance");
        
        assert!(token_contract.transfer(msg.sender, amount), "Token transfer failed");
    }
}    
