pragma solidity 0.4.19;


/**
 * @title Whitelistable
 * @dev This contract is used to implement a signature based whitelisting mechanism
 */
contract Whitelistable {
    bytes constant PREFIX = "\x19Ethereum Signed Message:\n32";

    address public whitelistAdmin;

    // addresses map to false by default
    mapping(address => bool) public blacklist;

    event LogAdminUpdated(address indexed newAdmin);

    modifier validAdmin(address _admin) {
        require(_admin != 0);
        _;
    }

    modifier onlyAdmin {
        require(msg.sender == whitelistAdmin);
        _;
    }

    /// @dev Constructor for Whitelistable contract
    /// @param _admin the address of the admin that will generate the signatures
    function Whitelistable(address _admin) public validAdmin(_admin) {
        whitelistAdmin = _admin;        
    }

    /// @dev Updates whitelistAdmin address 
    /// @dev Can only be called by the current admin
    /// @param _admin the new admin address
    function changeAdmin(address _admin)
        external
        onlyAdmin
        validAdmin(_admin)
    {
        LogAdminUpdated(_admin);
        whitelistAdmin = _admin;
    }

    // @dev blacklists the given address to ban them from contributing
    // @param _contributor Address of the contributor to blacklist 
    function addToBlacklist(address _contributor)
        external
        onlyAdmin
    {
        blacklist[_contributor] = true;
    }

    // @dev removes a previously blacklisted contributor from the blacklist
    // @param _contributor Address of the contributor remove 
    function removeFromBlacklist(address _contributor)
        external
        onlyAdmin
    {
        blacklist[_contributor] = false;
    }

    /// @dev Checks if contributor is whitelisted (main Whitelistable function)
    /// @param contributor Address of who was whitelisted
    /// @param contributionLimit Limit for the user contribution
    /// @param currentSaleCap Cap of contributions to the sale at the current point in time
    /// @param v Recovery id
    /// @param r Component of the ECDSA signature
    /// @param s Component of the ECDSA signature
    /// @return Is the signature correct?
    function checkWhitelisted(
        address contributor,
        uint256 contributionLimit,
        uint256 currentSaleCap,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns(bool) {
        bytes32 prefixed = keccak256(PREFIX, keccak256(contributor, contributionLimit, currentSaleCap));
        return !(blacklist[contributor]) && (whitelistAdmin == ecrecover(prefixed, v, r, s));
    }
}
