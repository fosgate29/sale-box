
### Overview

Truffle Box that comes with everything you need to create a new Token Sale. Here you can find more information about installing [Truffle](http://truffleframework.com/). You will also need `yarn`.
 
### Usage

Run this command to create a new Truffle project with this box:
```
truffle unbox tokenfoundry/sale-box
```

After it is unboxed, run the setup script to create Sale and Token smart contracts:
```
yarn setup
```

Script will prompt for data that is necessary for each Sale Token:
 - `SALE_NAME`: Name of the sale and token. Example: Civil - The Sale contract would be CivilSale.sol
 - `TOKEN_SYMBOL`: Capital letters representing the token. Example: CVL, VPK.
 - `TOKEN_DECIMALS`: Token Decimals. Between 0 and 18.
 - `TOTAL_SALE_CAP`: Total Sale Cap (in ether). The maximum amount of ether the sale can raise.
 - `MIN_CONTRIBUTION`: Minimum Contribution (in ether). The minimum contribution allowed.
 - `MIN_THRESHOLD`: Minimum Threshold (in ether). The minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions get refunded.
 - `MAX_TOKENS`: Total supply of tokens.
 - `CLOSING_DURATION`: Closing duration (in days). How much time the project team has to deploy their testnet contracts (starting from the end of the sale).
 - `VAULT_INITIAL_AMOUNT`: Vault initial amount (in ether). The amount of ether that will be sent to the project's wallet once the sale is successful.
 - `VAULT_DISBURSEMENT_AMOUNT`: Vault disbursement amount (in ether): the amount of ether that can be withrawn from the vault by the project team each month following (if the sale is successful and the project team deploys the testnet contracts).
 - `START_TIME`: Start time (in timestamp). The sale starts at this timestamp. You can use this service to generate the timestamp [https://www.unixtimestamp.com/index.php].
 - `WALLET`: Wallet. The address of the project team\'s wallet.
 - `DISBURSEMENTS`: It is possible to have 0 or more disbursements. Each disbursement should have a beneficiary (address), amount of tokens and duration ([Solidity Time Units](http://solidity.readthedocs.io/en/v0.4.21/units-and-global-variables.html?highlight=years#time-units)).
 
### Attention: 
	- The script makes some checks on the given values, but it is responsability of who is creating the Sale to make sure values are correct.

After the script is executed, 4 new files are created:
 - contracts/xxxxSale.sol
 - contracts/xxxxToken.sol
 - migrations/2_deploys_contracts.js
 - saleParameters.json

## License

MIT
