import increaseTime, { duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import expectThrow from './helpers/expectThrow';
import PromisifyWeb3 from './helpers/promisifyWeb3';
import { bufferToHex, fromRpcSig } from 'ethereumjs-util';

PromisifyWeb3.promisify(web3);

const Sale = artifacts.require('Sale');
const DisbursementHandler = artifacts.require('DisbursementHandler');
const Token = artifacts.require('Token');
const Vault = artifacts.require('Vault');

const padInt = (value) => {
  return web3.padLeft(web3.toHex(value).slice(2), 64);
}

const contributionHash = (address, limit, cap) => {
  return web3.sha3(address + padInt(limit) + padInt(cap), { encoding: 'hex' });
};


contract('Sale', (accounts) => {
  const owner = accounts[0];
  const nonOwner = accounts[1];
  const whitelistAdmin = accounts[2];
  const whitelistedAddress = accounts[3];
  const nonWhitelistedAddress = accounts[4];
  const beneficiary = accounts[5];
  const wallet = accounts[6];
  const notController = accounts[7];
  const nonParticipant = accounts[8];

  let sale;
  let token;
  let disbursementHandler;
  let vault;

  let totalSaleCap;
  let minContribution;
  let minThreshold;
  let maxTokens;
  let waitingDuration;

  let vaultInitialAmount;
  let vaultDisbursementAmount;

  let contributionLimit;
  let contributionLimitBig;
  let currentSaleCap;
  let currentSaleCapBig;
  let hash;
  let hash2;
  let sig;
  let sig2;

  let startTime;
  let endTime;

  beforeEach(async () => {
    totalSaleCap = new web3.BigNumber(10000);
    minContribution = new web3.BigNumber(1);
    minThreshold = new web3.BigNumber(2000);
    maxTokens = new web3.BigNumber(100000000000);
    waitingDuration = new web3.BigNumber(duration.weeks(2));

    vaultInitialAmount = new web3.BigNumber(1000);
    vaultDisbursementAmount = new web3.BigNumber(1000);

    contributionLimit = new web3.BigNumber(5000);
    contributionLimitBig = totalSaleCap;
    currentSaleCap = contributionLimit.minus(1000);
    currentSaleCapBig = contributionLimitBig;
    hash = contributionHash(whitelistedAddress, contributionLimit, currentSaleCap);
    hash2 = contributionHash(whitelistedAddress, contributionLimitBig, currentSaleCapBig);
    sig = fromRpcSig(web3.eth.sign(whitelistAdmin, hash));
    sig2 = fromRpcSig(web3.eth.sign(whitelistAdmin, hash2));

    await increaseTime(duration.weeks(1));
    startTime = (await latestTime()) + duration.weeks(1);
    endTime = startTime + duration.weeks(1);

    sale = await Sale.new(
      totalSaleCap,
      minContribution,
      minThreshold,
      maxTokens,
      whitelistAdmin,
      wallet,
      waitingDuration,
      vaultInitialAmount,
      vaultDisbursementAmount,
      startTime,
      { from: owner }
    );

    const tokenAddress = await sale.trustedToken.call();
    token = await Token.at(tokenAddress);

    const disbursementHandlerAddress = await sale.disbursementHandler.call();
    disbursementHandler = await DisbursementHandler.at(disbursementHandlerAddress);

    const vaultAddress = await sale.trustedVault.call();
    vault = await Vault.at(vaultAddress);

  });

  describe('Check initial values', async () => {
    it('should create Sale with correct initial values', async () => {
      const saleContributionCap = await sale.totalSaleCap.call();
      assert.isTrue(saleContributionCap.equals(totalSaleCap), 'ContributionCap value isn\'t correct');

      const saleMinContribution = await sale.minContribution.call();
      assert.isTrue(saleMinContribution.equals(minContribution), 'MinContribution value isn\'t correct');

      const saleMinThreshold = await sale.minThreshold.call();
      assert.isTrue(saleMinThreshold.equals(minThreshold), 'MinThreshold value isn\'t correct');

      const saleWhitelistAdminAddress = await sale.whitelistAdmin.call();
      assert.equal(saleWhitelistAdminAddress, whitelistAdmin , 'Whitelist Admin address isn\'t correct');

      const saleWalletAddress = await vault.trustedWallet.call();
      assert.equal(saleWalletAddress, wallet , 'Vault wallet addres isn\'t correct');

      const saleWaitingDuration = await vault.closingDuration.call();
      assert.isTrue(saleWaitingDuration.equals(waitingDuration), 'Vault closing time isn\'t correct');
      
      const saleStartTime = await sale.getStageStartTime( 'saleInProgress' , { from: beneficiary });
      assert.isTrue(saleStartTime.equals(startTime), 'Sale in progress start time isn\'t correct');

    });
  });

  describe('FREEZE stage', async () => {
    it('should not be possible to call non-allowed functions', async () => {
      await expectThrow(sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: 10 }
      ));
      await expectThrow(sale.transferOwnership(accounts[1] ,{ from: accounts[1] }));
      await expectThrow(sale.changeAdmin(nonWhitelistedAddress, { from: whitelistedAddress }));
      await expectThrow(sale.allocateTokens(whitelistedAddress));
      const latest = await latestTime();
      await expectThrow(sale.setEndTime(latest + duration.weeks(1), { from: whitelistedAddress } ));
      await expectThrow(sale.setEndTime(latest + duration.weeks(1), { from: owner } ));
      await expectThrow(sale.endSale());
    });

    it('should not be possible to change the token controller if you aren\'t the sale)', async () => {
      await expectThrow(token.setController(notController, { from: nonOwner}));
    });

    it('should not be possible to contribute by sending ether (fallback function)', async () => {
      await expectThrow(sale.sendTransaction({ from: whitelistedAddress, value: 10 }));
    });

    it('should be possible to change whitelist admin', async () => {
      const actualAdmin = await sale.whitelistAdmin.call();
      assert.equal(actualAdmin, whitelistAdmin, 'whitelistAdmin isn\'t whitelist admin');

      await sale.changeAdmin(nonWhitelistedAddress, { from: whitelistAdmin });

      let newAdmin = await sale.whitelistAdmin.call();
      assert.equal(newAdmin, nonWhitelistedAddress, 'Whitelist admin wasn\'t transfered');

      // Transfer ownership back to initial owner
      await sale.changeAdmin(whitelistAdmin, { from: newAdmin });

      newAdmin = await sale.whitelistAdmin.call();
      assert.equal(newAdmin, whitelistAdmin, 'Ownership isnt back to initial admin');
    });

    it('should go to SALE_IN_PROGRESS stage when a week has passed', async () => {
      let stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'freeze');

      await increaseTime(duration.weeks(1.1));
      await sale.conditionalTransitions();

      stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleInProgress');
    });
  });

  describe('SALE_IN_PROGRESS stage', async () => {
    beforeEach(async () => {
      await increaseTime(duration.weeks(1.1));
      await sale.conditionalTransitions();
    });
        
    it('should not be possible to call non-allowed functions', async () => {
      await expectThrow(sale.transferOwnership(accounts[1], { from: nonOwner }));
      await expectThrow(sale.changeAdmin(nonWhitelistedAddress, { from: whitelistedAddress }));
      await expectThrow(sale.allocateTokens(whitelistedAddress));
    });

    it('should not be possible to change the token controller if you aren\'t the sale', async () => {
      await expectThrow(token.setController(notController, { from: nonOwner }));
    });

    it('should allow a transfer from the sale', async () => {
      const isTransferAllowed = await sale.transferAllowed.call(sale.address, beneficiary);
      assert.isTrue(isTransferAllowed);
    });

    it('should not allow a transfer from an account that is not the sale', async () => {
      const isTransferAllowed = await sale.transferAllowed.call(nonOwner, beneficiary);
      assert.isFalse(isTransferAllowed);
    });
    
    it('should not be possible to contribute with value < minContribution', async () => {
      await expectThrow(sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: minContribution.sub(1) }
      ));
    });

    it('should not be possible to contribute if the signature doesn\'t match the sender', async () => {
      await expectThrow(sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: nonWhitelistedAddress, value: 1 }
      ));
    });

    it('should be possible to contribute with minContribution < value < contributionLimit', async () => {
      let contribution = Math.round((contributionLimit.add(minContribution)) / 2);

      const result = await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      const { value, excess } = result.logs[0].args;

      assert.isTrue(value.equals(contribution), 'Amount sent is wrong.');
      assert.isTrue(excess.equals(0), 'Excess value is not correct.');
    });

    it('should not be possible to contribute if the currentSaleCap was reached', async () => {
      let contribution = currentSaleCap;

      await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      await expectThrow(
        sale.contribute(
          contributionLimit,
          currentSaleCap,
          sig.v,
          bufferToHex(sig.r),
          bufferToHex(sig.s),
          { from: whitelistedAddress, value: 1 }
        )
      );
    });

    it('should revert if the currentSaleCap is bigger than the totalSaleCap', async () => {
      currentSaleCap = totalSaleCap.add(1);
      const invalid = contributionHash(whitelistedAddress, contributionLimit, currentSaleCap);
      sig = fromRpcSig(web3.eth.sign(whitelistAdmin, invalid));

      await expectThrow(
        sale.contribute(
          contributionLimit,
          currentSaleCap,
          sig.v,
          bufferToHex(sig.r),
          bufferToHex(sig.s),
          { from: whitelistedAddress, value: 1 }
        )
      );
    });

    it('should not be possible to allocate tokens during the sale, even to a contributor', async () => {
      await expectThrow(sale.allocateTokens(nonParticipant, { from: whitelistedAddress }));

      //someone contributes
      let contribution = Math.round((contributionLimit.add(minContribution)) / 2);

      const result = await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );
      await expectThrow(sale.allocateTokens(whitelistedAddress, { from: whitelistedAddress }));
    });

    it('should be possible to contribute with excess and get the excess refunded', async () => {
      let _excess = 23;

      let contribution = currentSaleCap.add(_excess);

      const result = await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      const { value, excess } = result.logs[0].args;

      assert.isTrue(value.equals(contribution.minus(_excess)), 'Amount sent is wrong.');
      assert.isTrue(excess.equals(_excess), 'Excess value is not correct.');
    });

    it('should not be possible to contribute by sending ether (fallback function)', async () => {
      await expectThrow(sale.sendTransaction({ value: 10, from: whitelistedAddress }));
    });

    it('should be possible to set the end time for the sale', async () => {
      const saleEndTime = startTime + duration.weeks(4.5);
      await sale.setEndTime(saleEndTime, { from: owner });

      const actualEndTime = await sale.getStageStartTime.call('saleEnded');

      assert.isTrue(actualEndTime.equals(saleEndTime), 'End time was not correctly set');
    });

    it('should not be possible to set the end time for the sale in the past', async () => {
      const pastEndTime = await latestTime();
      await expectThrow(sale.setEndTime(pastEndTime));
    });

    it('should not be possible to set the end time if one has already been set', async () => {
      const saleEndTime = startTime + duration.weeks(4.5);
      await sale.setEndTime(saleEndTime);
      // the end time has now been set

      const newSaleEndTime = saleEndTime + duration.weeks(1);
      await expectThrow(sale.setEndTime(newSaleEndTime));
    });

    it('should end the sale immediately if endSale is called by the sale owner', async () => {
      await sale.endSale({ from: owner });
      const stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleEnded');
    });

    it('should not end the sale someone else tries to endSale', async () => {
      await expectThrow(sale.endSale({ from: nonOwner }));
    });

    it ('should not go to SALE_ENDED stage if the cap is not reached or if the end timestamp not passed', async () => {
      let stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleInProgress');

      const latest = await latestTime();
      await sale.setEndTime(latest + duration.weeks(1));
      await expectThrow(sale.setEndTime(latest + duration.weeks(1)));  // Should throw if called 2nd time
      await sale.conditionalTransitions();

      stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleInProgress');
    });

    it('should be possible to contribute with a value that is over totalSaleCap and get refunded with the excess.', async () => {
      const initial_contribution = totalSaleCap.minus(900);
      await sale.contribute(
        contributionLimitBig,
        currentSaleCapBig,
        sig2.v,
        bufferToHex(sig2.r),
        bufferToHex(sig2.s),
        { from: whitelistedAddress, value: initial_contribution }
      );

      const _excess = 100;
      let contribution = 900 + _excess;

      let result = await sale.contribute(
        contributionLimitBig,
        currentSaleCapBig,
        sig2.v,
        bufferToHex(sig2.r),
        bufferToHex(sig2.s),
        { from: whitelistedAddress, value: contribution }
      );

      let { value, excess } = result.logs[0].args;

      const weiContributed = await sale.weiContributed.call();

      assert.isTrue(value.equals(contribution - _excess), 'Amount sent is wrong.');
      assert.isTrue(excess.equals(_excess), 'Excess value is wrong.');
      assert.isTrue(weiContributed.equals(totalSaleCap), 'weiContributed is not equal to totalSaleCap.');
    });

    it('should be possible to contribute with a value that is over the current sale cap and get the excess refunded.', async () => {
      const contribution = contributionLimit.add(currentSaleCap).div(2).floor();

      const result = await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      const { value, excess } = result.logs[0].args;

      const _excess = contribution.minus(currentSaleCap);

      const weiContributed = await sale.weiContributed.call();

      assert.isTrue(value.equals(contribution.minus(_excess)), 'Amount sent is wrong.');
      assert.isTrue(excess.equals(_excess), 'Excess value is wrong.');
      assert.isTrue(weiContributed.equals(currentSaleCap), 'weiContributed is not equal to totalSaleCap.');
    });

    it('should go to SALE_ENDED stage when the cap is reached', async () => {
      let stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleInProgress');

      await sale.contribute(
        contributionLimitBig,
        currentSaleCapBig,
        sig2.v,
        bufferToHex(sig2.r),
        bufferToHex(sig2.s),
        { from: whitelistedAddress, value: totalSaleCap.add(100) }
      );

      const weiContributed = await sale.weiContributed.call();
      assert.isTrue(weiContributed.equals(totalSaleCap), 'Cap wasn\'t reached');

      await sale.conditionalTransitions();

      stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleEnded');
    });

    it('should go to SALE_ENDED stage when the end time has passed', async () => {
      let stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleInProgress');

      const latest = await latestTime();
      // Should throw if called not by the owner
      await expectThrow(sale.setEndTime(latest + duration.weeks(1), { from: whitelistedAddress }));

      await sale.setEndTime(latest + duration.weeks(1) , { from: owner });

      await increaseTime(duration.weeks(1.1));
      await sale.conditionalTransitions();

      stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleEnded');
    });
 
  });

  describe('SALE_ENDED stage', async () => {
    beforeEach(async () => {
      
      await increaseTime(duration.weeks(1.1));
      await sale.conditionalTransitions();
      const latest = await latestTime();
      endTime = latest + duration.weeks(1);
      await sale.setEndTime(endTime);
    });

    it('should not be possible to call non-allowed functions', async () => {
      //reach the sale end
      await increaseTime(endTime - startTime + duration.hours(1));
      await sale.conditionalTransitions();

      await expectThrow(sale.contribute(
        contributionLimit,
        currentSaleCapBig,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: new web3.BigNumber(1) }
      ));
      await expectThrow(sale.transferOwnership(accounts[1] ,{ from: accounts[1] }));
      await expectThrow(sale.changeAdmin(nonWhitelistedAddress, { from: whitelistedAddress }));

      await expectThrow(sale.endSale());

      const newSaleEndTime = endTime + duration.weeks(1);
      await expectThrow(sale.setEndTime(newSaleEndTime));

    });

    it('should not be possible to change the token controller if you aren\'t the sale)', async () => {
      await expectThrow(token.setController(notController, { from: nonOwner}));
    });

    it('should not be possible to contribute by sending ether (fallback function)', async () => {
      await increaseTime(endTime - startTime + duration.hours(1));
      await sale.conditionalTransitions();

      await expectThrow(sale.sendTransaction({ value: 1, from: whitelistedAddress }));
    });

    it('should have called the onSaleEnded callback', async () => {
      await increaseTime(endTime - startTime + duration.hours(1));
      await sale.conditionalTransitions();

      const state = await vault.state.call();
      assert.isTrue(state.equals(2)); // Refunding state
    });

    it('should enable refunds if the threshold was not reached', async () => {
      const contribution = minThreshold.minus(10);
      await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      await increaseTime(endTime - startTime + duration.hours(1));
      await sale.conditionalTransitions();

      const state = await vault.state.call();
      assert.isTrue(state.equals(2));
    });

    it('should set the vault state as success if the threshold was reached', async () => {
      const contribution = minThreshold.plus(10);
      await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      const state = await vault.state.call();
      assert.isTrue(state.equals(1));
    });

    it('should be possible to allocate tokens when the sale ends', async () => {
      const contribution = currentSaleCap;
      await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );

      const weiContributed = await sale.weiContributed.call();
      assert.isTrue(weiContributed.equals(contribution));

      // Go to SALE_ENDED stage
      await increaseTime(duration.weeks(1.1));
      await sale.conditionalTransitions();

      const stageId = await sale.getCurrentStageId.call();
      assert.equal(web3.toUtf8(stageId), 'saleEnded', 'Not in SALE_ENDED stage');

      // Check that no allocation was performed before the call
      const beforeAllocate = await token.balanceOf.call(whitelistedAddress);
      assert.isTrue(beforeAllocate.equals(0));

      const tokensPerWei = await sale.tokensPerWei.call();
      const tokensForSale = await sale.tokensForSale.call();

      assert.isTrue(tokensPerWei.equals(tokensForSale.div(weiContributed).floor()));

      await sale.allocateTokens(whitelistedAddress);

      const afterAllocate = await token.balanceOf.call(whitelistedAddress);

      assert.isTrue(afterAllocate.equals(contribution.times(tokensPerWei)), 'Tokens were not allocated');

      // Calling allocateTokens 2nd time must fail  
      await expectThrow(sale.allocateTokens(whitelistedAddress));

    });

    it('should not be possible to allocate tokens to someone who has not contributed', async () => {
      //ensure the sale succeeds
      const contribution = minThreshold.plus(10);
      await sale.contribute(
        contributionLimit,
        currentSaleCap,
        sig.v,
        bufferToHex(sig.r),
        bufferToHex(sig.s),
        { from: whitelistedAddress, value: contribution }
      );
      
      // Go to SALE_ENDED stage
      await increaseTime(duration.weeks(1.1));
      await sale.conditionalTransitions();

      //check that the address didnt contribute
      const beforeAllocate = await token.balanceOf.call(nonParticipant);
      assert.isTrue(beforeAllocate.equals(0));

      //try to allocate tokens to them
      await expectThrow(sale.allocateTokens(nonParticipant));

    });

    it('should transfer the ownership of the token to the sale owner', async() => {
      await increaseTime(endTime - startTime + duration.hours(1));
      await sale.conditionalTransitions();

      const tokenOwner = await token.owner.call();
      assert.equal(tokenOwner, owner);
    });

    it('should transfer the ownership of the vault to the sale owner', async() => {
      await increaseTime(endTime - startTime + duration.hours(1));
      await sale.conditionalTransitions();

      const vaultOwner = await vault.owner.call();
      assert.equal(vaultOwner, owner);
    });

  });
});
