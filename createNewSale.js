var inquirer = require('inquirer');
var web3 = require('web3');

var ejs  = require('ejs');
var fs   = require('fs');
var read = fs.readFileSync;
var join = require('path').join;

console.log('Create new Sale files:');

var saleParameters = [
  {
    type: 'input',
    name: 'SaleName',
    message: 'Sale Name'
  },
  {
    type: 'input',
    name: 'TokenSymbol',
    message: 'Token Symbol',
    filter: function(val) {
      return val.toUpperCase();
    }
  },
  {
    type: 'input',
    name: 'TokenDecimals',
    message: 'Token Decimals. It can be from 0 to 18.',
    default: 18,
    validate: function(value) {
      var valid = !isNaN(parseInt(value)) && parseInt(value,10)==value && value >= 0 && value <= 18;
      return valid || 'Please enter a valid number between 0 and 18';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'TOTAL_SALE_CAP',
    message: 'Total Sale Cap (in ether). The maximum amount of ether the sale can raise:',
    validate: function(value) {
      var valid = false;
      if(!isNaN(parseInt(value)) && parseInt(value,10)==value && value >= 0) {
        valid = true;
      }
      return valid || 'Please enter a valid number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'MIN_CONTRIBUTION',
    message: 'Minimum Contribution (in ether). The minimum contribution that an address needs to make to be allowed to participate:',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'MIN_THRESHOLD',
    message: 'Minimum Threshold (in ether). The minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions may be withdrawn:',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'MAX_TOKENS',
    message: 'Maximum Tokens. Total supply of tokens:',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value)) && parseInt(value,10)==value && value >= 0 ;
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
      var valid = !isNaN(parseFloat(value)) && value > 0;
      return valid || 'Please enter a number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'VAULT_INITIAL_AMOUNT',
    message: 'Vault initial amount (in ether). The amount of ether that will be sent to the project\'s wallet once the sale is successful:',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value));
      return valid || 'Please enter a number';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'VAULT_DISBURSEMENT_AMOUNT',
    message: 'Vault disbursement amount (in ether): the amount of ether that can be withrawn from the vault by the project team each month following (if the sale is successful and the project team deploys the testnet contracts):',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value));
      valid = value > 0;
      return valid || 'Please enter a valid number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'START_TIME',
    message: 'Start time (in timestamp). The sale starts at this timestamp.',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value));
      valid = value > 0;
      return valid || 'Please enter a valid number greater than 0';
    },
    filter: Number
  },
  {
    type: 'input',
    name: 'WALLET',
    message: 'Wallet. The address of the project team\'s wallet.',
    validate: function(value) {
      var valid = web3.utils.isAddress(value);
      return valid || 'Please enter a valid Ethereum Wallet address';
    }
  },
  {
    type: 'input',
    name: 'DisbursementsNumbers',
    message: 'Disbursements Numbers.',
    validate: function(value) {
      var valid = !isNaN(parseFloat(value));
      valid = value >= 1;
      return valid || 'Please enter a valid number greater than 1';
    },
    filter: Number
  }
];

inquirer.prompt(saleParameters)
    .then(saleParameters => {
      checkParameters(JSON.stringify(saleParameters, null, '  '));
  });


function checkParameters(_jsonFormat) {
  var jsonFormat = _jsonFormat
  console.log('\n\n *** Please verifiy the JSON file that will be used to create Sale smart contracts:\n\n');
  console.log(jsonFormat);

  inquirer.prompt({ type: 'confirm', name: 'dataIsCorrect', message: 'Is data correct?' , default: false }).then(dataIsCorrect => {
    if (dataIsCorrect) {
      fs.writeFileSync('./newSaleParameters.json', jsonFormat);
      createSaleFiles();
    } else {
      console.log('You should restart script.');
    }
  });
}

function createSaleFiles(){

  var jsonData = read(join(__dirname, '/newSaleParameters.json'), 'utf8');
  var newSaleParameters = JSON.parse(jsonData);

  /*
  * Create Sale File
  */
  var saleTemplate  = read(join(__dirname, '/templates/SaleTemplate.tmp'), 'utf8');
  var saleSourceCode = ejs.compile(saleTemplate)({
    SaleName: newSaleParameters.SaleName,
    TOTAL_SALE_CAP: newSaleParameters.TOTAL_SALE_CAP,
    MIN_CONTRIBUTION: newSaleParameters.MIN_CONTRIBUTION,
    MIN_THRESHOLD: newSaleParameters.MIN_THRESHOLD,
    MAX_TOKENS: newSaleParameters.MAX_TOKENS,
    CLOSING_DURATION: newSaleParameters.CLOSING_DURATION,
    VAULT_INITIAL_AMOUNT: newSaleParameters.VAULT_INITIAL_AMOUNT,
    VAULT_DISBURSEMENT_AMOUNT: newSaleParameters.VAULT_DISBURSEMENT_AMOUNT,
    START_TIME: newSaleParameters.START_TIME,
    WALLET: newSaleParameters.WALLET,
    DisbursementsNumbers: newSaleParameters.DisbursementsNumbers
  });

  fs.writeFileSync('./contracts/'+newSaleParameters.SaleName+'Sale.sol', saleSourceCode);

  /*
  * Create Token File
  */
  var tokenTemplate  = read(join(__dirname, '/templates/TokenTemplate.tmp'), 'utf8');
  var tokenSourceCode = ejs.compile(tokenTemplate)({
    SaleName: newSaleParameters.SaleName,
    TokenSymbol: newSaleParameters.TokenSymbol,
    TokenDecimals: newSaleParameters.TokenDecimals
  });

  fs.writeFileSync('./contracts/'+newSaleParameters.SaleName+'Token.sol', tokenSourceCode);

  /*
  * Create Migrations File
  */
  var migrationsTemplate  = read(join(__dirname, '/templates/2_deploy_contracts.tmp'), 'utf8');
  var migrationsFile = ejs.compile(migrationsTemplate)({
    SaleName: newSaleParameters.SaleName
  });

  fs.writeFileSync('./migrations/2_deploy_contracts.js', migrationsFile);

  console.log(newSaleParameters.SaleName + ' Sale files are created.');
}

