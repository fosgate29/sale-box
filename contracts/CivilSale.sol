pragma solidity 0.4.19;

import "@tokenfoundry/sale-contracts/contracts/Sale.sol";

import "./CivilToken.sol";

contract CivilSale is Sale {
    uint256 public constant TOTAL_SALE_CAP = 200000 ether;
    uint256 public constant MIN_CONTRIBUTION = 0.1 ether;
    uint256 public constant MIN_THRESHOLD = 6000 ether;
    uint256 public constant MAX_TOKENS = 500000000;

    uint256 public constant CLOSING_DURATION = 28 days;
    uint256 public constant VAULT_INITIAL_AMOUNT = 100 ether;
    uint256 public constant VAULT_DISBURSEMENT_AMOUNT = 10 ether;

    uint256 public constant START_TIME = 100000000;

    address public constant WALLET = 0x10a6eeb986b9094f0a131a28b0c57d2e66eecc3a;

    function CivilSale(address whitelistAdmin) 
        Sale(
            TOTAL_SALE_CAP,
            MIN_CONTRIBUTION,
            MIN_THRESHOLD,
            MAX_TOKENS,
            whitelistAdmin,
            WALLET,
            CLOSING_DURATION,
            VAULT_INITIAL_AMOUNT,
            VAULT_DISBURSEMENT_AMOUNT,
            START_TIME
        ) 
        public 
    {
        
    }

    function createToken(uint256 _maxTokens) internal returns (Token) {
        return new CivilToken(_maxTokens);
    }
 
    function getDisbursements() internal pure returns(Disbursement[] disbursements) {
        disbursements = new Disbursement[](3);
        disbursements[0] = Disbursement(0, MAX_TOKENS.mul(2).div(100), 1 years);
        disbursements[1] = Disbursement(1, MAX_TOKENS.mul(2).div(100), 1 years);
        disbursements[2] = Disbursement(2, MAX_TOKENS.mul(2).div(100), 1 years);
        
    }

}