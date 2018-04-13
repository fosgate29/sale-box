const ejs  = require('ejs');
const fs   = require('fs');
const read = fs.readFileSync;
const join = require('path').join;

console.log('Create new Sale files:');

const jsonData = read(join(__dirname, '/saleParameters.json'), 'utf8');
const saleParameters = JSON.parse(jsonData);

/*
* Read JSON file with parameters and create files based on templates
*/
createSaleFiles = () => {
  // Create Sale File
  const saleTemplate  = read(join(__dirname, '../templates/SaleTemplate.tmp'), 'utf8');

  const saleSourceCode = ejs.compile(saleTemplate)(saleParameters);

  // Create Migrations File
  const migrationsTemplate  = read(join(__dirname, '../templates/2_deploy_contracts.tmp'), 'utf8');
  const migrationsFile = ejs.compile(migrationsTemplate)(saleParameters);

  fs.writeFileSync(`./contracts/${saleParameters.SALE_NAME}Sale.sol`, saleSourceCode);
  fs.writeFileSync('./migrations/2_deploy_contracts.js', migrationsFile);

  console.log(`${saleParameters.SALE_NAME} sale file was created.`);
}

/*
* First, get data for Sale and Token. After that, get data for the Disbursement. 
* When it has all data necessary, create a JSON file with the parameters user entered
* and then create contracts based on a JSON file.
*/
createSaleFiles();

