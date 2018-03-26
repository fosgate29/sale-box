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
const saleParameters = [
  {
    type: 'input',
    name: 'SALE_NAME',
    message: 'Sale Name'
  },
  {
    type: 'input',
    name: 'TOKEN_SYMBOL',
    message: 'Token Symbol',
    filter: function(val) {
      return val.toUpperCase();
    }
  },
  {
    type: 'input',
    name: 'TOKEN_DECIMALS',
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
    name: 'TOTAL_SALE_CAP',
    message: 'Total Sale Cap (in ether). The maximum amount of ether the sale can raise:',
    validate: function(value) {
      const valid = !isNaN(parseInt(value)) && parseInt(value,10)==value && value >= 0
      return valid || 'Please enter a valid number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'MIN_CONTRIBUTION',
    message: 'Minimum Contribution (in ether). The minimum contribution that an address needs to make to be allowed to participate:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'MIN_THRESHOLD',
    message: 'Minimum Threshold (in ether). The minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions may be withdrawn:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'MAX_TOKENS',
    message: 'Maximum Tokens. Total supply of tokens:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && parseInt(value,10)==value && value >= 0 ;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'CLOSING_DURATION',
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
    name: 'VAULT_INITIAL_AMOUNT',
    message: 'Vault initial amount (in ether). The amount of ether that will be sent to the project\'s wallet once the sale is successful:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'VAULT_DISBURSEMENT_AMOUNT',
    message: 'Vault disbursement amount (in ether): the amount of ether that can be withrawn from the vault by the project team each month following (if the sale is successful and the project team deploys the testnet contracts):',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a valid number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'START_TIME',
    message: 'Start time (in timestamp). The sale starts at this timestamp.',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a valid number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'WALLET',
    message: 'Wallet. The address of the project team\'s wallet.',
    validate: function(value) {
      const valid = web3.utils.isAddress(value);
      return valid || 'Please enter a valid Ethereum Wallet address';
    }
  }
];

/*
 * Questions to create Disbursement
 */
const disbursementQuestions = [
  {
    type: 'input',
    name: 'beneficiaryAddress',
    message: 'Beneficiary address:',
    validate: function(value) {
      const valid = web3.utils.isAddress(value);
      return valid || 'Please enter a valid Ethereum Wallet address';
    }
  },
  {
    type: 'input',
    name: 'amount',
    message: 'Amount:',
    validate: function(value) {
      const valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'duration',
    message: 'Duration (in seconds or use Time Unit Solidity accepts like \'1 years\', \'2 weeks\':',
  },
  {
    type: 'confirm',
    name: 'askAgain',
    message: 'Want to enter more disbursement?',
    default: true
  }
]

let disbursementAnswers = [];
let sale;

function askOrPerformFinalAction(answer) {

  disbursementAnswers.push(answer);

  if (!answer.askAgain) {
     sale["DISBURSEMENTS"] = disbursementAnswers; 
     checkParameters(JSON.stringify(sale, null, '  '));
     return;
  }

  return inquirer.prompt(disbursementQuestions).then(ans => {
     askOrPerformFinalAction(ans);
  });

}

/*
* First, get data for Sale and Token. After that, get data for the Disbursement. 
* When it has all data necessary, create a JSON file with the parameters user entered
* and then create contracts based on a JSON file.
*/
inquirer.prompt(saleParameters)
    .then(saleParameters => {
      sale = saleParameters;
      console.log('Now add value for the Disbursement.')
      inquirer.prompt(disbursementQuestions).then(disbursementAnswers => {
          askOrPerformFinalAction(disbursementAnswers);  
      })
});

/*
* Before creating files, user can see on the screen the JSON file to make one last check before creating contracts
*/
function checkParameters(_jsonFormat) {
  const jsonFormat = _jsonFormat
  console.log('\n\n *** Please verifiy the JSON file that will be used to create Sale smart contracts:\n\n');
  console.log(jsonFormat);

  inquirer.prompt({ type: 'confirm', name: 'dataIsCorrect', message: 'Is data correct?' , default: false }).then(answer => {
    if (answer.dataIsCorrect) {
      fs.writeFileSync('./scripts/newSaleParameters.json', jsonFormat);
      createSaleFiles();
    } else {
      console.log('You should restart script.');
    }
  });
}

/*
* Read JSON file with parameters and create files based on templates
*/
function createSaleFiles(){

  const jsonData = read(join(__dirname, 'newSaleParameters.json'), 'utf8');
  const newSaleParameters = JSON.parse(jsonData);

  /*
  * Create Sale File
  */
  const saleTemplate  = read(join(__dirname, '../templates/SaleTemplate.tmp'), 'utf8');
  const saleSourceCode = ejs.compile(saleTemplate)(newSaleParameters);

  fs.writeFileSync(`./contracts/${newSaleParameters.SaleName}Sale.sol`, saleSourceCode);

  /*
  * Create Token File
  */
  const tokenTemplate  = read(join(__dirname, '../templates/TokenTemplate.tmp'), 'utf8');
  const tokenSourceCode = ejs.compile(tokenTemplate)(newSaleParameters);

  fs.writeFileSync(`./contracts/${newSaleParameters.SaleName}Token.sol`, tokenSourceCode);

  /*
  * Create Migrations File
  */
  const migrationsTemplate  = read(join(__dirname, '../templates/2_deploy_contracts.tmp'), 'utf8');
  const migrationsFile = ejs.compile(migrationsTemplate)(newSaleParameters);

  fs.writeFileSync('./migrations/2_deploy_contracts.js', migrationsFile);

  console.log(`${newSaleParameters.SaleName} sale files were created.`);
}

