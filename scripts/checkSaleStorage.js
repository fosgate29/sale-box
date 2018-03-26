const fs = require('fs');

const argv = require('yargs').argv;

const Sale = artifacts.require('Sale.sol');
const DisbursementHandler = artifacts.require('DisbursementHandler');
const Vault = artifacts.require('Vault');

const getStorageVars = async (contract, vars) => {
  const storageVars = {};
  for (const v of vars) {
    console.log(v)
    console.log(contract[v])
    const value = await contract[v].call();
    const isBigNumber = value instanceof web3.BigNumber;
    storageVars[v] = isBigNumber ? value.toString(10) : value;
  }
  return storageVars;
};

const getSaleState = async (sale) => {
  const vars = [
    'weiContributed',
    'totalSaleCap',
    'minContribution',
    'minThreshold',
    'tokensPerWei',
    'trustedToken',
    'trustedVault',
    'disbursementHandler',
    'whitelistAdmin'
  ];

  const storageVars = await getStorageVars(sale, vars);
  return storageVars;
};

const getVaultState = async (vault) => {
  const vars = [
    'disbursementAmount',
    'trustedWallet',
    'initialAmount',
    'lastDisbursement',
    'totalDeposited',
    'refundable',
    'closingDuration',
    'closingDeadline',
    'state'
  ];

  const storageVars = await getStorageVars(vault, vars);
  return storageVars;
};

const getDisbursementHandlerState = async (disbursementHandler) => {
  const setups = await new Promise((resolve, reject) => {
    disbursementHandler.LogSetup({ fromBlock: 0, toBlock: 'latest' }).get((error, logs) => {
      if (error) reject(error);
      resolve(logs);
    });
  });

  const vestors = setups.map(s => s.args.vestor);

  const disbursements = [];

  for (const v of vestors) {
    disbursements.push(await disbursementHandler.disbursements.call(v, 0));
  }

  return disbursements;
};

module.exports = async (callback) => {
  const saleAddress = argv._[2];

  if (saleAddress == undefined) {
    console.error('No address given as parameter');
    callback();
  } else if (!web3.isAddress(saleAddress)) {
    console.error('Invalid address');
    callback();
  }

  let params;
  if (argv._[3] != undefined) {
    params = JSON.parse(fs.readFileSync(argv._[3], 'utf8'));
  }

  let sale;
  let vault;
  let disbursementHandler;
  try {
    sale = await Sale.at(saleAddress);

    const vaultAddress = await sale.trustedVault.call();
    vault = await Vault.at(vaultAddress);

    const disbursementHandlerAddress = await sale.disbursementHandler.call();
    disbursementHandler = await DisbursementHandler.at(disbursementHandlerAddress);
  } catch(error) {
    console.error(error);
  }

  const saleState = await getSaleState(sale);
  const vaultState = await getVaultState(vault);
  const disbursementHandlerState = await getDisbursementHandlerState(disbursementHandler);

  console.log('Sale', saleState);
  console.log('Vault', vaultState);
  console.log('DisbursementHandler', disbursementHandlerState);

  if (params) {
    // TODO: check parameters
  } 
  callback();
};
