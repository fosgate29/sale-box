pragma solidity 0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


/// @title Disbursement handler - Manages time locked disbursements of ERC20 tokens
contract DisbursementHandler is Ownable {
    using SafeMath for uint256;

    struct Disbursement {
        // Tokens cannot be withdrawn before this timestamp
        uint256 timestamp;

        // Amount of tokens to be disbursed
        uint256 tokens;
    }

    event LogSetup(address indexed vestor, uint256 timestamp, uint256 tokens);
    event LogWithdraw(address indexed to, uint256 value);

    ERC20 public token;
    mapping(address => Disbursement[]) public disbursements;
    mapping(address => uint256) public withdrawnTokens;

    function DisbursementHandler(address _token) public {
        token = ERC20(_token);
    }

    /// @dev Called by the sale contract to create a disbursement.
    /// @param vestor The address of the beneficiary.
    /// @param tokens Amount of tokens to be locked.
    /// @param timestamp Funds will be locked until this timestamp.
    function setupDisbursement(
        address vestor,
        uint256 tokens,
        uint256 timestamp
    )
        external
        onlyOwner
    {
        require(block.timestamp < timestamp);
        disbursements[vestor].push(Disbursement(timestamp, tokens));
        LogSetup(vestor, timestamp, tokens);
    }

    /// @dev Transfers tokens to the withdrawer
    function withdraw()
        external
    {
        uint256 withdrawAmount = calcMaxWithdraw(msg.sender);
        withdrawnTokens[msg.sender] = withdrawnTokens[msg.sender].add(withdrawAmount);
        require(token.transfer(msg.sender, withdrawAmount));
        LogWithdraw(msg.sender, withdrawAmount);
    }

    /// @dev Calculates the maximum amount of vested tokens
    /// @return Number of vested tokens that can be withdrawn
    function calcMaxWithdraw(address beneficiary)
        public
        view
        returns (uint256)
    {
        uint256 maxTokens = 0;

        // Go over all the disbursements and calculate how many tokens can be withdrawn
        Disbursement[] storage temp = disbursements[beneficiary];
        uint256 tempLength = temp.length;
        for (uint256 i = 0; i < tempLength; i++) {
            if (block.timestamp > temp[i].timestamp) {
                maxTokens = maxTokens.add(temp[i].tokens);
            }
        }

        // Return the computed amount minus the tokens already withdrawn
        return maxTokens.sub(withdrawnTokens[beneficiary]);
    }
}
