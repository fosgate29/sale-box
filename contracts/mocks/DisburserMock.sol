pragma solidity 0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";

import "../Disburser.sol";


contract DisburserMock is Disburser {
    
    MintableToken public token;
    uint256 public timestamp;
    
    function DisburserMock() public {
        token = new MintableToken();
        token.mint(this, 15000);
    }

    function createDisbursementHandlerHelper() public {
        createDisbursementHandler(token);
    }

    function setupDisbursementsHelper() public {
        setupDisbursements();
        timestamp = now;
    }

    function getDisbursements() internal pure returns(Disbursement[] disbursements) {
        disbursements = new Disbursement[](5);
        disbursements[0] = Disbursement(address(1), 1000, 1 weeks);
        disbursements[1] = Disbursement(address(2), 2000, 2 weeks);
        disbursements[2] = Disbursement(address(3), 3000, 3 weeks);
        disbursements[3] = Disbursement(address(4), 4000, 4 weeks);
        disbursements[4] = Disbursement(address(5), 5000, 5 weeks);
    }
    

}
