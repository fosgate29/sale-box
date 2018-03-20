# Whitelistable

### Whitelistable base contract - Provides functionality for a signature based whitelisting

- **Constructor**: Whitelistable(*address* `_admin`)
- This contract does **not** have a fallback function.

## Whitelistable Events

### LogAdminUpdated(*address* indexed `newAdmin`)

## Whitelistable Functions

### changeAdmin(*address* `_admin`) external onlyAdmin validAdmin(`_admin`)

Updates the whitelisting admin. Can only be called by current admin

#### Inputs

| type      | name     | description      |
| --------- | -------- | ---------------- |
| *address* | `_admin` | New admin to set |

### checkWhitelisted(*address* `contributor`, *uint256* `contributionLimit`, *uint256* `currentSaleCap`, *uint8* `v`, *bytes32* `r`, *bytes32* `s`) public view

Verifies the given signature for the hash of the contributor's address concatenated with the contribution limit for that address and teh current sale cap.

#### Inputs

| type      | name                | description      |
| --------- | ------------------- | ---------------- |
| *address* | `contributor`       | Contributor's address |
| *uint256* | `contributionLimit` | Contribution limit for the given contributor |
| *uint256* | `currentSaleCap   ` | Cap on the amount of money the sale may currently accept |
| *uint8*   | `v`                 | `v` component of the ec signature |
| *bytes32* | `r`                 | `r` component of the ec signature |
| *bytes32* | `s`                 | `s` component of the ec signature |


#### Outputs

| type     | description                |
| -------- | -------------------------- |
| *bool*   | True if signature is valid |
