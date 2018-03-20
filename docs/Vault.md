# Vault

### Vault contract - stores all the ether raised in a sale

- **Constructor Parameters**
  * *address* `wallet`: the address of the project team's wallet
  * *uint256* `_initialAmount`: How much eth will be sent to the project's wallet once the sale is successful.
  * *uint256* `_disbursementAmount`: How much eth can be withrawn from the vault each month (if the sale is successful and the project team deploys the testnet contracts).
  * *uint256* `_closingDuration`: how much time, from the end of the sale, the project team has to deploy their testnet contracts.

- This contract does **not** have a fallback function.


## Vault Events

### Closed()
To signify that the vault has been closed.

### RefundsEnabled()
Shows that people who contributed money may now withdraw this money again as the sail was not successful.

### Refunded(*address* indexed `contributor`, *uint256* `amount`)
The mentioned contributor has withdrawn their contribution


## Vault Functions

### deposit(*address* `contributor`) external payable
Called by the sale to deposit funds for a contributor. Can be called in the `Active` and `Success` states.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *address* | `contributor` | The contributor |

### saleSuccessful() external
Called by the sale when the minimum contribution threshold has been reached. The vault then sends the `initialAmount` of eth to the project's wallet. Can only be called in the `Active` state.

### enableRefunds() external
Called by the owner of the vault at any time to enable refunds to the contributors. During the sale, the owner of the vault is the sale itself. When the sale ends the ownership is transfered to Token Foundry's multisig wallet.

### refund(*address* `contributor`) external
This function refunds the named contributor if refunds are enabled (the vault is in a `Refunding` state). The contributor receives their respective percentage of the `refundable` amount

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *address* | `contributor` | The contributor |

### beginClosingPeriod() external
Called by the vault's owner (the sale) when the sale has become successful. This starts the 'closing period' (the period of time that the project team has to deploy their testnet contracts).

### close() external
Called by anyone when the closing deadline has passed. It closes the sale and means that the project team can start withdrawing the funds on a monthly basis.

### setEndTime(*uint256* `endTime`) external payable
Sets the end time for the sale. Can only be called in the `SALE_IN_PROGRESS` stage, and can only be called once.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *uint256* | `endTime` | The proposed end time for the sale |

### sendFundsToWallet() external
Called by anyone when the vault is 'closed'. It sends the `disbursementAmount` to the project team, and can be called again after the `DISBURSEMENT_DURATION` has passed, for each future withdrawal.


## Vault States

`Active`

Accepting deposits.

`Success`

The sale has called the saleSuccessful function.
Accepting deposits.

`Refunding`

Contributors can get all or part of their money back.

`Closed`

The project team can withdraw funds from the vault on a monthly basis.
