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
    name: 'SALE_NAME',
    message: 'Sale Name:'
  },
  {
    type: 'input',
    name: 'TOKEN_SYMBOL',
    message: 'Token Symbol:',
    filter: (value) => value.toUpperCase()
  },
  {
    type: 'input',
    name: 'TOKEN_DECIMALS',
    message: 'Token Decimals:',
    default: '18',
    validate: (value) => {
      const valid = !isNaN(parseInt(value));
      return valid || 'Please enter a valid number';
    },
  },
  {
    type: 'input',
    name: 'TOTAL_SALE_CAP',
    message: 'Total Sale Cap (in ether):',
    validate: (value) => {
      const valid = !isNaN(parseInt(value));
      return valid || 'Please enter a valid number';
    }
  },
  {
    type: 'input',
    name: 'MIN_CONTRIBUTION',
    message: 'Minimum Contribution (in ether):',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    }
  },
  {
    type: 'input',
    name: 'MIN_THRESHOLD',
    message: 'Minimum Threshold (in ether):',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    }
  },
  {
    type: 'input',
    name: 'MAX_TOKENS',
    message: 'Total supply of tokens:',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value)) && parseInt(value, 10) == value;
      return valid || 'Please enter a number';
    }
  },
  {
    type: 'input',
    name: 'CLOSING_DURATION',
    message: 'Vault closing duration (in days):',
    default: '28',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number greater than 0';
    }
  },
  {
    type: 'input',
    name: 'VAULT_INITIAL_AMOUNT',
    message: 'Vault initial amount (in ether):',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    }
  },
  {
    type: 'input',
    name: 'VAULT_DISBURSEMENT_AMOUNT',
    message: 'Vault disbursement amount (in ether):',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a valid number greater than 0';
    }
  },
  {
    type: 'input',
    name: 'START_TIME',
    message: 'Start time (in timestamp):',
    validate: (value) => {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a valid number greater than 0';
    }
  },
  {
    type: 'input',
    name: 'WALLET',
    message: 'Wallet:',
    validate: (value) => {
      const valid = web3.isAddress(value);
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

    if (!web3.isAddress(address)) return 'Please enter a valid Ethereum Wallet address';
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

  return inquirer.prompt({ type: 'confirm', name: 'dataIsCorrect', message: 'Is data correct?', default: false });
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
  saleParameters['DISBURSEMENTS'] = disbursements;
  return checkParameters();
  // return checkParameters(JSON.stringify(saleParameters, null, '  '));
}).then(({ dataIsCorrect }) => {
  if (dataIsCorrect) {
    createSaleFiles();
  } else {
    console.log('You should restart the script.');
  }
});
