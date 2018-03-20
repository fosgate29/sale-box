# DisbursementHandler

### Disbursement handler - Manages time locked disbursements of ERC20 tokens for a sale

- **Constructor Parameters**
    * *address* `token`: the ERC20 token contract which this handler will be handling disbursements for.

- This contract does **not** have a fallback function.


## DisbursementHandler Events
### LogSetup(*address* indexed `vestor`, *uint256* `tokens`, *uint256* timestamp)
This event logs when a new disbursement has successfully been set up.

### LogWithdraw(*address* indexed `to`, *uint256* `value`)
This event logs the amount of tokens withdrawn from the handler, and the address that withdrew them.


## DisbursementHandler Functions

### setupDisbursement(*address* `vestor`, *uint256* `tokens`, *uint256* `timestamp`) public onlyOwner
Setup a new disbursement. This can only be called by the contract's owner - which, during the sale, is the sale itself.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *address* | `vestor` | The address that will be able to withdraw the disbursement |
| *uint256* | `tokens` | The number of tokens that the vestor will be able to withdraw |
| *uint256* | `timestamp` | The time from which the tokens can be withdrawn |

### withdraw() public
Sends the maximum number of tokens allowed to the function's caller. This is any disbursements for which the caller is the vestor **and** where the timestamp has passed.

### calcMaxWithdraw(*address* `beneficiary`) public constant
Returns the maximum number of tokens that can be withdrawn for the given beneficiary, at the time of the call.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *address* | `beneficiary` | The recipient address to calculate the maximum withdrawal for |

#### Outputs

| type      | description                |
| --------- | -------------------------- |
| *uint256* | Maximum amount of tokens that can be withdrawn by the beneficiary at the time of the call |
