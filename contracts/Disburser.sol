pragma solidity 0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "./DisbursementHandler.sol";


contract Disburser {
    using SafeMath for uint256;

    // Used to encapsulate info about the disbursements (time-locked token allocations made at the beginning of the sale)
    struct Disbursement {
        address beneficiary;
        uint256 amount;
        uint256 duration;
    }

    DisbursementHandler public disbursementHandler;

    function Disburser() public { }

    function createDisbursementHandler(ERC20 _token) internal {
        require(disbursementHandler == address(0));
        disbursementHandler = new DisbursementHandler(_token);
    }

    // Override in child sales to return the disbursements
    function getDisbursements() internal pure returns(Disbursement[]) {
        // ...
    }

    function setupDisbursements() internal {
        require(disbursementHandler != address(0));
        // Setup disbursements
        Disbursement[] memory disbursements = getDisbursements();
        ERC20 token = disbursementHandler.token();
        for (uint256 i = 0; i < disbursements.length; i++) {
          disbursementHandler.setupDisbursement(
            disbursements[i].beneficiary,
            disbursements[i].amount, 
            now.add(disbursements[i].duration)
          );
          require(token.transfer(disbursementHandler, disbursements[i].amount));
        }
    }


}
