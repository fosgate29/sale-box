# Disburser

### Disburser base contract - handles the creation of disbursements (time locked tokens) by interacting with a DisbursementHandler contract

- This constructor does take any parameters, or perform any functionality.
- This contract does **not** have a fallback function.


## Disburser Functions

### createDisbursementHandler(*ERC20* `_token`) internal
Creates a DisbursementHandler for the disburser to interact with. This can only be called once per disburser.

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *ERC20* | `_token` | The ERC20 token that will be handled by the disbursementHandler |

### getDisbursements() internal pure returns(Disbursement[])
Returns the Disbursements (hardcoded token allocations made at the beginning of the sale). This method is to be overriden in each child sale contract to specify the disbursements specific to the child sale. There are no disbursements by default.

#### Outputs

| type     | description                |
| -------- | -------------------------- |
| *Disbursement[]* | All the disbursements to be made at the beginning of the sale |

### setupDisbursements() internal
Uses the `getDisbursements()` function to retrieve the required disbursements, and creates them one by one by interacting with the disbursement handler.
