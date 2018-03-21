var ejs  = require('ejs');
var fs   = require('fs');
var read = fs.readFileSync;
var join = require('path').join;


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