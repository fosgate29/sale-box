
### Overview

Truffle Box that comes with everything you need to create a new Token Sale. Here you can find more information about installing [Truffle](http://truffleframework.com/). You will also need `yarn`.
 
### Installing

Run this command to create a new Truffle project with this box:
```
truffle unbox tokenfoundry/sale-box
```

After it is unboxed, run the setup script to create Sale and Token smart contracts:
```
yarn setup
```

Script will prompt for data that is necessary for each Sale Token. Here they are:
 - `SaleName`: Name of the token. Example: Civil, Dether - The Sale contract would be CivilSale.sol
 - `TokenSymbol`: Capital letters representing the token. Example: CVL, VPK.
 - `TokenDecimals`: Token Decimals. It can be from 0 to 18.
 - `TOTAL_SALE_CAP`: Total Sale Cap (in ether). The maximum amount of ether the sale can raise.
 - `MIN_CONTRIBUTION`: Minimum Contribution (in ether). The minimum contribution that an address needs to make to be allowed to participate.
 - `MIN_THRESHOLD`: Minimum Threshold (in ether). The minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions may be withdrawn.
 - `MAX_TOKENS`: Maximum Tokens. Total supply of tokens.
 - `CLOSING_DURATION`: Closing duration (in days). How much time, from the end of the sale, the project team has to deploy their testnet contracts.
 - `VAULT_INITIAL_AMOUNT`: Vault initial amount (in ether). The amount of ether that will be sent to the project\'s wallet once the sale is successful.
 - `VAULT_DISBURSEMENT_AMOUNT`: Vault disbursement amount (in ether): the amount of ether that can be withrawn from the vault by the project team each month following (if the sale is successful and the project team deploys the testnet contracts).
 - `START_TIME`: Start time (in timestamp). The sale starts at this timestamp. You can use this service to generate the timestamp [https://www.unixtimestamp.com/index.php].
 - `WALLET`: Wallet. The address of the project team\'s wallet.
 - `Disbursements`: It is possible to have 1 or more disbursements. Each disbursement should have beneficiary (address), percent (between 1 to 100) of it will receive and duration (Solidity Time Units). Duration should follow Solidity units. More information about time units in solidity here http://solidity.readthedocs.io/en/v0.4.21/units-and-global-variables.html?highlight=years#time-units .
 
### Attention: 
	- Everytime you execute the script it will overwrite the files it created before.
	- The script makes some checks to see values entered are valid, but it is responsability of who is creating the Sale to make sure values are correct.

After the script is executed, 4 new files are created:
 - xxxxSale.sol
 - xxxxToken.sol
 - 2_deploys_contracts.js
 - newSaleParameters.json

## License

MIT
