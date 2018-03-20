# Sale

### Sale base contract - Defines the base sale structure with a fixed price

- **Constructor Parameters**
  * *uint256* `_totalSaleCap`: the maximum amount of ether the sale can raise.
  * *uint256* `_minContribution`: the minimum contribution that an address needs to make to be allowed to participate.
  * *uint256* `_minThreshold`: the minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions may be withdrawn.
  * *uint256* `_maxTokens`: the minimum amount of ether the sale must raise to be successful. If the threshold is not reached, all contributions may be withdrawn.
  * *address* `whitelistAdmin`: the address that will provide signatures for the whitelisting of contributors.
  * *address* `wallet`: the address of the project team's wallet.
  * *uint256* `closingDuration`: how much time, from the end of the sale, the project team has to deploy their testnet contracts.
  * *uint256* `vaultInitialAmount`: the amount of eth that will be sent to the project's wallet once the sale is successful.
  * *uint256* `vaultDisbursementAmount`: the amount of eth that can be withrawn from the vault by the project team each month following (if the sale is successful and the project team deploys the testnet contracts).
  * *uint256* `startTime`: the sale starts at this timestamp.

The constructor sets all the parameters and creates the Token, DisbursementHandler and Vault contracts. It also calculates the number of tokens that are to be sold, after all disbursements have been created. Finally, it setups the state machine functionality (start conditions, callbacks, etc).

- This contract does **not** have a fallback function.


## Sale Events
### LogContribution(*address* indexed `contributor`, *uint256* `value`, *uint256* `excess`)
Logs when a successful contribution has occurred

### LogTokensAllocated(*address* indexed `contributor`, *uint256* `amount`)
Logs when a contributor has extracted their allocation of tokens. This occurs after the sale has finished.


## Sale Functions

### contribute(*uint256* `contributionLimit`, *uint256* `currentSaleCap`, *uint8* `v`, *bytes32* `r`, *bytes32* `s`) external payable checkAllowed
Called by users to contribute to the sale as long as they have a valid whitelisting signature, they are not over their contribution limit, and the sale has not reached the current sale cap. This can only be called in the `SALE_IN_PROGRESS` stage. They do not get any tokens allocated to their address until the sale has ended and the final tokens-per-wei rate can be calculated. The current sale cap can be set by the whitelisting admin.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *uint256* | `contributionLimit` | Contribution limit that the user was assigned |
| *uint256* | `currentSaleCap`    | Caps how much can be contributed to the sale at this moment in time |
| *uint8*   | `v`                 | `v` component of the ec signature |
| *bytes32* | `r`                 | `r` component of the ec signature |
| *bytes32* | `s`                 | `s` component of the ec signature |


### setEndTime(*uint256* `endTime`) external payable
Sets the end time for the sale. This is used to end the sale if the sale's contribution cap has not previously caused the sale to end. Can only be called in the `SALE_IN_PROGRESS` stage once.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *uint256* | `endTime` | The end time for the sale |


### allocateTokens(*address* `contributor`) external
Called by anyone to allocate tokens to a contributor. It can only be called in the `SALE_ENDED` stage and if the sale has been successful.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *address* | `contributor` | Contributor to allocate tokens to |


### endSale() external
Transitions the sale into the `SALE_ENDED` stage, no matter how much money has been raised so far (triggering the onSaleEnded callback). It can only be called in the `SALE_IN_PROGRESS` stage.


### transferAllowed(*address* `_from`, *address* `_to`) external view returns (bool)
This function is the implementation of the abstract transferAllowed function in the TokenControllerI interface. It only allows transfers that are made from the sale to a recipient (by returning `true`).


### createToken(*uint256* `_maxTokens`) internal returns (Token)
Creates a `Token`, parametised by the maximum number of tokens that should be created, and returns it. It should be overriden in child sales to add additional information about the token.

#### Inputs

| type      | name         | description            |
| --------- | ------------ | ---------------------- |
| *uint256* | `_maxTokens` | Total supply of tokens |

#### Outputs

| type      | description          |
| --------- | -------------------- |
| *Token*   | The token to be sold |


### wasCapReached() internal returns (bool)
Function used to determine whether the sale's total fundraising cap has been reached, and thereby whether the sale should end. It is registered as a start condition in the constructor of the state machine (`setStageStartCondition(SALE_ENDED, wasCapReached)`).

#### Outputs

| type     | description                |
| -------- | -------------------------- |
| *bool* | Was the cap reached? |


### onSaleEnded() internal
Function that is called when entering the `SALE_ENDED` stage. If the minimum threshold of fundraising was not reached, it enables refunds in the Vault contract. Otherwise it calculates the final token-per-wei rate, and finalises the sale.


## Sale Stages

`FREEZE`

This is just a period that is active until the sale starts. No functions are allowed in this stage (except for ownership related functions).

`SALE_IN_PROGRESS`

This stage is the sale itself. It has both a start timestamp and an end timestamp. In this stage, whitelisted users (check out the docs for the Whitelistable contract) can contribute Ether by calling the `contribute` function, providing a valid whitelist signature and their contribution amount.
The stage will transition to `SALE_ENDED`, for one of 3 reasons:
* the optional end timestamp is reached
* if the total fundraising contribution cap is reached
* the `endSale` function is called by the sale's owner

`SALE_ENDED`

If the sale has failed (the minThreshold was not reached), the saleFailed function is called in the vault contract to enable refunds.
If the sale was successful, then contributors can now be allocated their alloted share of the tokens, by a call of `allocateTokens(contributor)`.

Dependency diagram
![Dependency diagram](/diagrams/sale.png)