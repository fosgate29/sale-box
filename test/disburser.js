import increaseTime, { duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import expectThrow from './helpers/expectThrow';

const DisburserMock = artifacts.require('DisburserMock');
const DisbursementHandler = artifacts.require('DisbursementHandler');
const MintableToken = artifacts.require('MintableToken');

contract('Disburser', (accounts) => {

  let disburser;
  let token;

  const disbursements = [
    { beneficiary: 1, amount: 1000, duration: duration.weeks(1) },
    { beneficiary: 2, amount: 2000, duration: duration.weeks(2) },
    { beneficiary: 3, amount: 3000, duration: duration.weeks(3) },
    { beneficiary: 4, amount: 4000, duration: duration.weeks(4) },
    { beneficiary: 5, amount: 5000, duration: duration.weeks(5) },
  ];

  // const owner = accounts[0];
  // const notOwner = accounts[1];

  beforeEach(async() => {
    disburser = await DisburserMock.new();
    const tokenAddress = await disburser.token.call();
    token = await MintableToken.at(tokenAddress);
    
  });

  it('should not be possible to setup disbursements if the disbursement handler was not created', async () => {
    await expectThrow(disburser.setupDisbursementsHelper());
  });

  it('should not be possible to create the disbursementHandler more than once', async () => {
    await disburser.createDisbursementHandlerHelper();
    await expectThrow(disburser.createDisbursementHandlerHelper());
  });

  it('should setup disbursements correctly', async () => {
    await disburser.createDisbursementHandlerHelper();
    const disbursementHandlerAddress = await disburser.disbursementHandler.call();
    const disbursementHandler = await DisbursementHandler.at(disbursementHandlerAddress);
    await disburser.setupDisbursementsHelper();
    const timestamp = await disburser.timestamp.call();
    for (const { beneficiary, amount, duration } of disbursements) {
      const disbursement = await disbursementHandler.disbursements.call(beneficiary, 0);
      assert.isTrue(disbursement[0].equals(timestamp.add(duration)));
      assert.isTrue(disbursement[1].equals(amount));
    }
  
  });
  it('should thansfer the respective tokens', async () => {
    await disburser.createDisbursementHandlerHelper();
    const disbursementHandlerAddress = await disburser.disbursementHandler.call();
    const disbursementHandler = await DisbursementHandler.at(disbursementHandlerAddress);

    await disburser.setupDisbursementsHelper();

    const balance = await token.balanceOf.call(disbursementHandler.address);
    assert.isTrue(balance.equals(15000));
  });
});



