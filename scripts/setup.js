const inquirer = require('inquirer');
const web3 = require('web3');

const ejs  = require('ejs');
const fs   = require('fs');
const read = fs.readFileSync;
const join = require('path').join;

console.log('Create new Sale files:');

/*
 * Questions about Sale and Token parameters
 */
const saleQuestions = [
  {
    type: 'input',
    name: 'saleName',
    message: 'Sale Name'
  },
  {
    type: 'input',
    name: 'tokenSymbol',
    message: 'Token Symbol',
    filter: function(val) {
      return val.toUpperCase();
    }
  },
  {
    type: 'input',
    name: 'tokenDecimals',
    message: 'Token Decimals. It can be from 0 to 18.',
    default: 18,
    validate: function(value) {
      const valid = !isNaN(parseInt(value)) && parseInt(value,10)==value && value >= 0 && value <= 18;
      return valid || 'Please enter a valid number between 0 and 18';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'totalSaleCap',
    message: 'Total Sale Cap (in ether). The maximum amount of ether the sale can raise:',
    validate: function(value) {
      const valid = !isNaN(parseInt(value)) && parseInt(value,10)==value && value >= 0
      return valid || 'Please enter a valid number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'minContribution',
    message: 'Minimum Contribution (in ether). The minimum contribution that an address needs to make to be allowed to participate:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'minThreshold',
    message: 'Minimum Threshold (in ether). The minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions may be withdrawn:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'maxTokens',
    message: 'Maximum Tokens. Total supply of tokens:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && parseInt(value,10)==value && value >= 0 ;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'closingDuration',
    message: 'Closing duration (in days). How much time, from the end of the sale, the project team has to deploy their testnet contracts:',
    default: 28,
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'vaultInitialAmount',
    message: 'Vault initial amount (in ether). The amount of ether that will be sent to the project\'s wallet once the sale is successful:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'vaultDisbursementDuration',
    message: 'Vault disbursement amount (in ether): the amount of ether that can be withrawn from the vault by the project team each month following (if the sale is successful and the project team deploys the testnet contracts):',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a valid number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'startTime',
    message: 'Start time (in timestamp). The sale starts at this timestamp.',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a valid number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'wallet',
    message: 'Wallet. The address of the project team\'s wallet.',
    validate: function(value) {
      const valid = web3.utils.isAddress(value);
      return valid || 'Please enter a valid Ethereum Wallet address';
    }
  }
];

const parseDisbursement = (disbursement) => {
  const values = disbursement.split(',');
  return { 
    address: values[0],
    amount: values[1],
    duration: values[2]
  }
}

const disbursementQuestion = {
  type: 'input',
  name: 'disbursement',
  message: 'Disbursement: type the address, amount and duration separated by commas, or type \'done\' if no more disbursements need to be added:',
  filter: answer => answer === 'done' ? answer : parseDisbursement(answer),
  validate: answer => {

    if (answer === 'done') return true;

    const { address, amount, duration } = answer;

    if (!web3.utils.isAddress(address)) return 'Please enter a valid Ethereum Wallet address';
    if (isNaN(parseFloat(amount))) return 'Please enter a valid amount';

    return true;
  },
};

let saleParameters;
const disbursements = [];

askForDisbursements = () => {
  return inquirer.prompt(disbursementQuestion).then(({ disbursement }) => {
    if (disbursement !== 'done') {
      disbursements.push(disbursement);
      return askForDisbursements()
    }
    return disbursements;
  });
}

/*
* Before creating files, user can see on the screen the JSON file to make one last check before creating contracts
*/
checkParameters = () => {
  console.log('\n\n *** Please verifiy the JSON file that will be used to create Sale smart contracts:\n\n');
  console.log(JSON.stringify(saleParameters, null, '  '));

  return inquirer.prompt({ type: 'confirm', name: 'dataIsCorrect', message: 'Is data correct?' , default: false });
}

/*
* Read JSON file with parameters and create files based on templates
*/
createSaleFiles = () => {
  // Create Sale File
  const saleTemplate  = read(join(__dirname, '../templates/SaleTemplate.tmp'), 'utf8');
  const saleSourceCode = ejs.compile(saleTemplate)(saleParameters);

  // Create Token File
  const tokenTemplate  = read(join(__dirname, '../templates/TokenTemplate.tmp'), 'utf8');
  const tokenSourceCode = ejs.compile(tokenTemplate)(saleParameters);

  // Create Migrations File
  const migrationsTemplate  = read(join(__dirname, '../templates/2_deploy_contracts.tmp'), 'utf8');
  const migrationsFile = ejs.compile(migrationsTemplate)(saleParameters);

  fs.writeFileSync(`./contracts/${saleParameters.SALE_NAME}Sale.sol`, saleSourceCode);
  fs.writeFileSync(`./contracts/${saleParameters.SALE_NAME}Token.sol`, tokenSourceCode);
  fs.writeFileSync('./migrations/2_deploy_contracts.js', migrationsFile);
  fs.writeFileSync('./saleParameters.json', JSON.stringify(saleParameters, null, '  '));

  console.log(`${saleParameters.SALE_NAME} sale files were created.`);
}

/*
* First, get data for Sale and Token. After that, get data for the Disbursement. 
* When it has all data necessary, create a JSON file with the parameters user entered
* and then create contracts based on a JSON file.
*/
inquirer.prompt(saleQuestions).then(ans => {
  saleParameters = ans;
  return askForDisbursements();
}).then(disbursements => {
  saleParameters['disbursements'] = disbursements;
  return checkParameters();
  // return checkParameters(JSON.stringify(saleParameters, null, '  '));
}).then(({ dataIsCorrect }) => {
  if (dataIsCorrect) {
    createSaleFiles();
  } else {
    console.log('You should restart the script.');
  }
});
