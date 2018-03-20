import increaseTime, { duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import expectThrow from './helpers/expectThrow';

const DisbursementHandler = artifacts.require('DisbursementHandler');
const MintableToken = artifacts.require('MintableToken');

contract('DisbursementHandler', (accounts) => {

  let disbursementHandler;
  let token;

  const owner = accounts[0];
  const notOwner = accounts[1];
  const beneficiary = accounts[2];
  const notBeneficiary = accounts[3];

  beforeEach(async() => {
    token = await MintableToken.new({ from: owner });
    disbursementHandler = await DisbursementHandler.new(token.address, { from: owner });
  });

  it('should be owned by owner', async () => {
    const _owner = await disbursementHandler.owner.call();
    assert.strictEqual(_owner, owner, 'Contract is not owned by owner');
  });

  it('should not be possible for other user to change the owner',  async () => {
    await expectThrow(disbursementHandler.transferOwnership(notOwner, { from: notOwner, gas: 3000000 }));
  });

  it('should be possible for the owner to transfer ownership', async () => {
    await disbursementHandler.transferOwnership(notOwner , { from: owner, gas: 3000000 });
    const _owner = await disbursementHandler.owner.call();
    assert.strictEqual(_owner, notOwner, 'Contract is not owned by new owner');
  });

  it('should be possible for the owner to create a disbursement', async () => {
    const tokenAmount = new web3.BigNumber(100);
    const timestamp = (await latestTime()) + duration.weeks(1);
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp, { from: owner });

    const disbursement = await disbursementHandler.disbursements.call(beneficiary, 0);
    assert.equal(disbursement[0].equals(timestamp), true);
    assert.equal(disbursement[1].equals(tokenAmount), true);
  });

  it('should not be possible to create a disbursement with a timestamp lower than the current one', async () => {
    const tokenAmount = new web3.BigNumber(100);
    const timestamp = (await latestTime()) - duration.weeks(1);
    await expectThrow(disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp, { from: owner }));
  });

  it('should not be possible for any user to create a disbursement', async () => {
    const tokenAmount = new web3.BigNumber(100);
    const timestamp = (await latestTime()) + duration.weeks(1);
    await expectThrow(disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp, { from: notOwner }));
  });

  it('should be possible for a beneficiary to withdraw the max amount of tokens', async () => {
    const tokenAmount = new web3.BigNumber(100);
    const timestamp = (await latestTime()) + duration.weeks(1);
    await token.mint(disbursementHandler.address, tokenAmount, { from: owner });
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp, { from: owner });

    const disbursement = await disbursementHandler.disbursements.call(beneficiary, 0);
    assert.equal(disbursement[0].equals(timestamp), true, 'Timestamp not set right');
    assert.equal(disbursement[1].equals(tokenAmount), true, 'Token amount not set right');

    let tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(0), true, 'Token balance of beneficiary is not 0');

    // Increase time so we can withdraw
    await increaseTime(duration.weeks(1.1));
    await disbursementHandler.withdraw({ from: beneficiary });

    tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(tokenAmount), true, 'Tokens were not withdrawn');

    const withdrawn = await disbursementHandler.withdrawnTokens.call(beneficiary);
    assert.equal(withdrawn.equals(tokenBalance), true, 'Withdrawn tokens not set right');
  });

  it('should ignore disbursements which timestamps have not been reached upon withdrawal', async () => {
    const tokenAmount = new web3.BigNumber(100);

    // First disbursement
    const timestamp1 = (await latestTime()) + duration.weeks(1);
    await token.mint(disbursementHandler.address, tokenAmount, { from: owner });
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp1, { from: owner });

    // Second disbursement
    const timestamp2 = timestamp1 + duration.weeks(1);
    await token.mint(disbursementHandler.address, tokenAmount, { from: owner });
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp2, { from: owner });

    let tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(0), true, 'Token balance of beneficiary is not 0');

    // Increase time so we can withdraw
    await increaseTime(duration.weeks(1.1));
    await disbursementHandler.withdraw({ from: beneficiary });

    tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(tokenAmount), true, 'Tokens were not withdrawn');

    const withdrawn = await disbursementHandler.withdrawnTokens.call(beneficiary);
    assert.equal(withdrawn.equals(tokenBalance), true, 'Withdrawn tokens not set right');
  });


  it('should be possible to withdraw from multiple disbursements', async () => {
    const tokenAmount = new web3.BigNumber(100);

    // First disbursement
    const timestamp1 = (await latestTime()) + duration.weeks(1);
    await token.mint(disbursementHandler.address, tokenAmount, { from: owner });
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp1, { from: owner });

    // Second disbursement
    const timestamp2 = timestamp1 + duration.weeks(1);
    await token.mint(disbursementHandler.address, tokenAmount, { from: owner });
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp2, { from: owner });

    let tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(0), true, 'Token balance of beneficiary is not 0');

    // Increase time so we can withdraw from both disbursements
    await increaseTime(duration.weeks(2.1));
    await disbursementHandler.withdraw({ from: beneficiary });

    tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(tokenAmount.times(2)), true, 'Tokens were not withdrawn');

    const withdrawn = await disbursementHandler.withdrawnTokens.call(beneficiary);
    assert.equal(withdrawn.equals(tokenBalance), true, 'Withdrawn tokens not set right');
  });

  it('should not be possible for a non beneficiary to withdraw tokens', async () => {
    const tokenAmount = new web3.BigNumber(100);
    const timestamp = (await latestTime()) + duration.weeks(1);
    await token.mint(disbursementHandler.address, tokenAmount, { from: owner });
    await disbursementHandler.setupDisbursement(beneficiary, tokenAmount, timestamp, { from: owner });

    const disbursement = await disbursementHandler.disbursements.call(beneficiary, 0);
    assert.equal(disbursement[0].equals(timestamp), true, 'Timestamp not set right');
    assert.equal(disbursement[1].equals(tokenAmount), true, 'Token amount not set right');

    let tokenBalance = await token.balanceOf.call(beneficiary);
    assert.equal(tokenBalance.equals(0), true, 'Token balance of beneficiary is not 0');

    // Increase time so beneficiary can withdraw
    await increaseTime(duration.weeks(1.1));
    await disbursementHandler.withdraw({ from: notBeneficiary });

    tokenBalance = await token.balanceOf.call(notBeneficiary);
    assert.isTrue(tokenBalance.equals(0), 'Tokens were withdrawn');

    const withdrawn = await disbursementHandler.withdrawnTokens.call(beneficiary);
    assert.equal(withdrawn.equals(0), true, 'Withdrawn tokens not set right');
  });


});



