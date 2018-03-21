pragma solidity 0.4.19;

import "zeppelin-solidity/contracts/token/ERC20/DetailedERC20.sol";
import "@tokenfoundry/token-contracts/contracts/Token.sol";

contract CivilToken is Token, DetailedERC20 {

    function CivilToken(uint256 _maxTokens) 
        Token(_maxTokens)
        DetailedERC20("/Civil Token", "CVL", 18) 
        public 
    {
    }

}