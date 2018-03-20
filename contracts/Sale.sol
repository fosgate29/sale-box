pragma solidity 0.4.19;
 
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";

import "@tokenfoundry/state-machine/contracts/TimedStateMachine.sol";
import "@tokenfoundry/token-contracts/contracts/Token.sol";

import "./Vault.sol";
import "./Whitelistable.sol";
import "./Disburser.sol";


/// @title Sale base contract
contract Sale is Ownable, Whitelistable, TimedStateMachine, Disburser, TokenControllerI {
    using SafeMath for uint256;

    // State machine stages
    bytes32 private constant FREEZE = 'freeze';
    bytes32 private constant SALE_IN_PROGRESS = 'saleInProgress';
    bytes32 private constant SALE_ENDED = 'saleEnded';
    bytes32[] public stages = [FREEZE, SALE_IN_PROGRESS, SALE_ENDED];

    // Stores the contribution for each user
    mapping(address => uint256) public contributions;
    // Records which users have contributed throughout the sale
    mapping(address => bool) public hasContributed;

    uint256 public weiContributed = 0;
    uint256 public totalSaleCap;
    uint256 public minContribution;
    uint256 public minThreshold;

    // How many tokens a user will receive per each wei contributed
    uint256 public tokensPerWei;
    uint256 public tokensForSale;

    Token public trustedToken;
    Vault public trustedVault;

    event LogContribution(address indexed contributor, uint256 value, uint256 excess);
    event LogTokensAllocated(address indexed contributor, uint256 amount);

    function Sale(
        uint256 _totalSaleCap,
        uint256 _minContribution,
        uint256 _minThreshold,
        uint256 _maxTokens,
        address whitelistAdmin,
        address wallet,
        uint256 closingDuration,
        uint256 vaultInitialAmount,
        uint256 vaultDisbursementAmount,
        uint256 startTime
    ) 
        Whitelistable(whitelistAdmin)
        public 
    {
        require(_totalSaleCap != 0);
        require(_maxTokens != 0);
        require(wallet != 0);
        require(now < startTime);

        totalSaleCap = _totalSaleCap;
        minContribution = _minContribution;
        minThreshold = _minThreshold;

        // Setup the necessary contracts
        trustedToken = createToken(_maxTokens);
        createDisbursementHandler(trustedToken);

        trustedToken.setController(this);

        trustedVault = new Vault(
            wallet,
            vaultInitialAmount,
            vaultDisbursementAmount, // disbursement amount
            closingDuration
        );

        setupDisbursements();
        tokensForSale = trustedToken.balanceOf(this);       

        // Set the stages
        state.setStages(stages);

        // state.allowFunction(SETUP, this.setup.selector);
        state.allowFunction(SALE_IN_PROGRESS, this.setEndTime.selector);
        state.allowFunction(SALE_IN_PROGRESS, this.contribute.selector);
        state.allowFunction(SALE_IN_PROGRESS, this.endSale.selector);
        state.allowFunction(SALE_ENDED, this.allocateTokens.selector);

        // End the sale when the cap is reached
        setStageStartCondition(SALE_ENDED, wasCapReached);

        // Set the onSaleEnded callback (will be called when the sale ends)
        setStageCallback(SALE_ENDED, onSaleEnded);

        // Set the start and end times for the sale
        setStageStartTime(SALE_IN_PROGRESS, startTime);
    }

    /// @dev Called by users to contribute ETH to the sale.
    function contribute(uint256 contributionLimit, uint256 currentSaleCap, uint8 v, bytes32 r, bytes32 s) 
        external 
        payable
        checkAllowed 
    {
        // Check that the signature is valid
        require(currentSaleCap <= totalSaleCap);
        require(weiContributed < currentSaleCap);
        require(checkWhitelisted(msg.sender, contributionLimit, currentSaleCap, v, r, s));

        uint256 current = contributions[msg.sender];
        require(current < contributionLimit);

        uint256 contribution = msg.value;

        // Check if it goes over the contribution limit of the user. 
        if (current.add(contribution) > contributionLimit) {
            contribution = contributionLimit.sub(current);
        }

        // Check if it goes over the eth cap for the sale.
        if (weiContributed.add(contribution) > currentSaleCap) {
            contribution = currentSaleCap.sub(weiContributed);
        }

        // Get the total contribution for the contributor after the previous checks
        uint256 totalContribution = current.add(contribution);
        require(totalContribution >= minContribution);
        contributions[msg.sender] = totalContribution;
        hasContributed[msg.sender] = true;

        weiContributed = weiContributed.add(contribution);

        trustedVault.deposit.value(contribution)(msg.sender);

        if (weiContributed >= minThreshold && trustedVault.state() != Vault.State.Success) trustedVault.saleSuccessful();

        // If there is an excess, return it to the user
        uint256 excess = msg.value.sub(contribution);
        if (excess > 0) msg.sender.transfer(excess);


        assert(totalContribution <= contributionLimit);
        LogContribution(msg.sender, contribution, excess);
    }

    function setEndTime(uint256 endTime) external onlyOwner checkAllowed {
        require(now < endTime);
        require(getStageStartTime(SALE_ENDED) == 0);
        setStageStartTime(SALE_ENDED, endTime);
    }

    /// @dev Called to allocate the tokens depending on eth contributed by the end of the sale.
    /// @param contributor The address of the contributor.
    function allocateTokens(address contributor) external checkAllowed {
        require(contributions[contributor] != 0);

        // Transfer the respective tokens to the contributor
        uint256 amount = contributions[contributor].mul(tokensPerWei);

        // Set contributions to 0
        contributions[contributor] = 0;

        require(trustedToken.transfer(contributor, amount));

        LogTokensAllocated(contributor, amount);
    }

    function endSale() external onlyOwner checkAllowed {
        goToNextStage();
    }

    /// @dev Since Sale is TokenControllerI, it has to implement transferAllowed() function
    /// @notice _to is not used, but it is necessary because this function is inherited from TokenControllerI.sol
    /// @notice only the Sale can disburse the initial tokens to their future owners
    function transferAllowed(address _from, address _to) external view returns (bool) {
        return _from == address(this);
    }

    function createToken(uint256 _maxTokens) internal returns (Token) {
        return new Token(_maxTokens);
    }
   
    /// @dev Returns true if the cap was reached.
    function wasCapReached() internal returns (bool) {
        return totalSaleCap <= weiContributed;
    }

    /// @dev Callback that gets called when entering the SALE_ENDED stage.
    function onSaleEnded() internal {
        // If the minimum threshold wasn't reached, enable refunds
        if (weiContributed < minThreshold) {
            trustedVault.enableRefunds();
        } else {
            trustedVault.beginClosingPeriod();
            tokensPerWei = tokensForSale.div(weiContributed);
        }

        trustedToken.transferOwnership(owner); 
        trustedVault.transferOwnership(owner);
    }

}
