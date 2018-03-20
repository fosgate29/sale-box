pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/math/SafeMath.sol";
import "zeppelin-solidity/contracts/math/Math.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";


// Adapted from OpenZeppelin's RefundVault

/**
 * @title Vault
 * @dev This contract is used for storing funds while a crowdsale
 * is in progress. Supports refunding the money if crowdsale fails,
 * and forwarding it if crowdsale is successful.
 */
contract Vault is Ownable {
    using SafeMath for uint256;

    enum State { Active, Success, Refunding, Closed }

    uint256 public DISBURSEMENT_DURATION = 4 weeks;

    mapping (address => uint256) public deposited;
    uint256 public disbursementAmount; // The amount to be disbursed to the wallet every month
    address public trustedWallet; // Wallet from the project team

    uint256 public initialAmount; // The eth amount the team will get initially if the sale is successful

    uint256 public lastDisbursement; // Timestamp of the last disbursement made

    uint256 public totalDeposited; // Total amount that was deposited
    uint256 public refundable; // Amount that can be refunded

    uint256 public closingDuration;
    uint256 public closingDeadline; // Vault can't be closed before this deadline

    State public state;

    event Closed();
    event RefundsEnabled();
    event Refunded(address indexed contributor, uint256 amount);

    modifier atState(State _state) {
        require(state == _state);
        _;
    }

    function Vault(
        address wallet,
        uint256 _initialAmount,
        uint256 _disbursementAmount,
        uint256 _closingDuration
    ) 
        public 
    {
        require(wallet != address(0));
        require(_disbursementAmount != 0);
        require(_closingDuration != 0);
        trustedWallet = wallet;
        initialAmount = _initialAmount;
        disbursementAmount = _disbursementAmount;
        closingDuration = _closingDuration;
        state = State.Active;
    }

    /// @dev Called by the sale contract to deposit ether for a contributor.
    function deposit(address contributor) onlyOwner external payable {
        require(state == State.Active || state == State.Success);
        // TODO: maybe optimize this by lowering the amount of sums
        totalDeposited = totalDeposited.add(msg.value);
        refundable = refundable.add(msg.value);
        deposited[contributor] = deposited[contributor].add(msg.value);
    }

    /// @dev Sends initial funds to the wallet.
    function saleSuccessful() onlyOwner external atState(State.Active){
        state = State.Success;
        refundable = refundable.sub(initialAmount);
        trustedWallet.transfer(initialAmount);
    }

    /// @dev Called by the owner if the project didn't deliver the testnet contracts or if we need to stop disbursements for any reasone.
    function enableRefunds() onlyOwner external {
        state = State.Refunding;
        RefundsEnabled();
    }

    /// @dev Refunds ether to the contributors if in the Refunding state.
    function refund(address contributor) external atState(State.Refunding) {
        uint256 refundAmount = deposited[contributor].mul(refundable).div(totalDeposited);
        deposited[contributor] = 0;
        contributor.transfer(refundAmount);
        Refunded(contributor, refundAmount);
    }

    /// @dev Sets the closingDeadline variable
    function beginClosingPeriod() external onlyOwner atState(State.Success) {
        require(closingDeadline == 0);
        closingDeadline = now.add(closingDuration);
    }

    /// @dev Called by anyone if the sale was successful and the project delivered.
    function close() external atState(State.Success) {
        require(closingDeadline != 0 && closingDeadline <= now);
        state = State.Closed;
        Closed();
    }

    /// @dev Sends the disbursement amount to the wallet after the disbursement period has passed. Can be called by anyone.
    function sendFundsToWallet() external atState(State.Closed) {
        require(lastDisbursement.add(DISBURSEMENT_DURATION) <= now);

        lastDisbursement = now;
        uint256 amountToSend = Math.min256(this.balance, disbursementAmount);
        refundable = refundable.sub(amountToSend);
        trustedWallet.transfer(amountToSend);
    }
}
