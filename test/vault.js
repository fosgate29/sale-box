import increaseTime, { duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import expectThrow from './helpers/expectThrow';

const Vault = artifacts.require('Vault');

contract('Vault', (accounts) => {

  let vault;

  const closingDuration = duration.weeks(2);

  const ACTIVE = 0;
  const SUCCESS = 1;
  const REFUNDING = 2;
  const CLOSED = 3;

  const owner = accounts[0];
  const notOwner = accounts[1];

  const contributor = accounts[7];
  const notContributor = accounts[8];
  const wallet = accounts[9];

  const initialAmount = 500;
  const disbursementAmount = 1000;
  const disbursementDuration = duration.weeks(4);

  beforeEach(async() => {
    const latest = await latestTime();
    vault = await Vault.new(
      wallet,
      initialAmount,
      disbursementAmount,
      closingDuration,
      { from: owner }
    );
  });

  it('should be owned by owner', async () => {
    const _owner = await vault.owner.call();
    assert.strictEqual(_owner, owner, 'Contract is not owned by owner');
  });

  it('should not be possible for other user to change the owner',  async () => {
    await expectThrow(vault.transferOwnership(notOwner, { from: notOwner, gas: 3000000 }));
  });

  it('should be possible for the owner to transfer ownership', async () => {
    await vault.transferOwnership(notOwner , { from: owner, gas: 3000000 });
    const _owner = await vault.owner.call();
    assert.strictEqual(_owner, notOwner, 'Contract is not owned by new owner');
  });

  it('should only be possible for the owner to send contributions', async () => {
    const value = 10000;
    await expectThrow(vault.deposit(contributor, { value, from: notOwner }));
    await vault.deposit(contributor, { value, from: owner });

    const deposited = await vault.deposited.call(contributor);
    assert.isTrue(deposited.equals(value));
  });

  it('should not be possible to accept deposits in the refunding and closed states', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await expectThrow(vault.beginClosingPeriod({ from: notOwner }));
    await vault.beginClosingPeriod();
    const closingDeadline = await vault.closingDeadline.call();

    const latest = await latestTime();
    await increaseTime(closingDeadline - latest + duration.hours(1));

    await vault.close({ from: notOwner });

    await expectThrow(vault.deposit(contributor, { value, from: owner }));
    await vault.enableRefunds({ from: owner });

    await expectThrow(vault.deposit(contributor, { value, from: owner }));
  });

  it('should not refund contribution during active state', async () => {
    const value = 10000;
    await vault.deposit(contributor, { value, from: owner });
    await expectThrow(vault.refund(contributor));
  });

  it('should only be possible for the owner to call saleSuccessful', async () => {
    const value = 10000;
    await vault.deposit(contributor, { value, from: owner });

    await expectThrow(vault.saleSuccessful({ from: notOwner }));

    await vault.saleSuccessful({ from: owner });
    const state = await vault.state.call();
    assert.isTrue(state.equals(SUCCESS));
  });

  it('should only be possible for the owner to call enableRefunds', async () => {
    await expectThrow(vault.enableRefunds({ from: notOwner }));

    await vault.enableRefunds({ from: owner });
    const state = await vault.state.call();
    assert.isTrue(state.equals(REFUNDING));
  });

  it('should refund 100% of the contribution when sale fails', async () => {
    const value = 10000;
    await vault.deposit(contributor, { value, from: owner });

    await vault.enableRefunds({ from: owner });

    const pre = web3.eth.getBalance(contributor);
    await vault.refund(contributor);
    const post = web3.eth.getBalance(contributor);

    assert.isTrue(post.minus(pre).equals(value));

    const pre_notContributor = web3.eth.getBalance(notContributor);
    await vault.refund(notContributor);
    const post_notContributor = web3.eth.getBalance(notContributor);
    assert.isTrue(post_notContributor.equals(pre_notContributor));

  });

  it('should refund part of the contribution when project doesn\'t deliver', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    let refundable = await vault.refundable.call();
    assert.isTrue(refundable.equals(value));

    let totalDeposited = await vault.totalDeposited.call();
    assert.isTrue(totalDeposited.equals(value));

    await vault.saleSuccessful({ from: owner });
    refundable = await vault.refundable.call();
    assert.isTrue(refundable.equals(value.minus(initialAmount)));

    totalDeposited = await vault.totalDeposited.call();
    assert.isTrue(totalDeposited.equals(value));

    await vault.enableRefunds({ from: owner });

    const pre = web3.eth.getBalance(contributor);
    await vault.refund(contributor);
    const post = web3.eth.getBalance(contributor);

    const refund = value.times(refundable).div(totalDeposited);
    assert.isTrue(post.minus(pre).equals(refund));
  });

  it('should not be possible to close the vault if not in the Success state', async () => {

    await expectThrow(vault.close({ from: notOwner }));

    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.enableRefunds({ from: owner });

    await expectThrow(vault.close({ from: notOwner }));
  });

  it('should not be possible to close the vault if the deadline has not passed', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });
    await expectThrow(vault.close({ from: notOwner }));
  });

  it('should be possible for anyone to close the vault if the deadline has passed', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await expectThrow(vault.beginClosingPeriod({ from: notOwner }));
    await vault.beginClosingPeriod();
    const closingDeadline = await vault.closingDeadline.call();

    const latest = await latestTime();
    await increaseTime(closingDeadline - latest + duration.hours(1));

    await vault.close({ from: notOwner });

    const state = await vault.state.call();
    assert.isTrue(state.equals(CLOSED));
  });

  it('should not be possible to begin the closing period twice', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await vault.beginClosingPeriod();
    await expectThrow(vault.beginClosingPeriod());
  });


  it('should only be possible for the owner to call the enableRefunds function', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await expectThrow(vault.enableRefunds({ from: notOwner }));
    await vault.enableRefunds({ from: owner });

    const state = await vault.state.call();
    assert.isTrue(state.equals(REFUNDING));

  });

  it('should not be possible to call the sendFundsToWallet function if not in the Closed state', async () => {
    await expectThrow(vault.sendFundsToWallet({ from: owner }));

    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await expectThrow(vault.sendFundsToWallet({ from: notOwner }));

    await vault.enableRefunds({ from: owner });

    await expectThrow(vault.sendFundsToWallet({ from: notOwner }));
  });

  it('should be possible to call the sendFundsToWallet function every month if the project was successful and disbursements are not stopped', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await vault.beginClosingPeriod();
    const closingDeadline = await vault.closingDeadline.call();

    const latest = await latestTime();
    await increaseTime(closingDeadline - latest + duration.hours(1));

    await vault.close({ from: notOwner });

    let pre = web3.eth.getBalance(wallet);
    await vault.sendFundsToWallet({ from: notOwner });
    let post = web3.eth.getBalance(wallet);

    assert.isTrue(post.minus(pre).equals(disbursementAmount));

    // Fail because the deadline has not passed
    await expectThrow(vault.sendFundsToWallet({ from: notOwner }));

    await increaseTime(disbursementDuration);

    pre = web3.eth.getBalance(wallet);
    await vault.sendFundsToWallet({ from: notOwner });
    post = web3.eth.getBalance(wallet);

    assert.isTrue(post.minus(pre).equals(disbursementAmount));

    // TODO: test the situation in which the balance is less than the disbursement amount

  });

  it('should only be possible for the owner to stop the disbursements', async () => {
    const value = new web3.BigNumber(10000);
    await vault.deposit(contributor, { value, from: owner });

    await vault.saleSuccessful({ from: owner });

    await vault.beginClosingPeriod();
    const closingDeadline = await vault.closingDeadline.call();

    const latest = await latestTime();
    await increaseTime(closingDeadline - latest + duration.hours(1));

    await vault.close({ from: notOwner });

    await expectThrow(vault.enableRefunds({ from: notOwner }));
    await vault.enableRefunds({ from: owner });

    const state = await vault.state.call();
    assert.isTrue(state.equals(REFUNDING));
  });

});
