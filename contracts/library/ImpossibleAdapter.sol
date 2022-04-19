// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "./FlowLimiter.sol";

interface IMintableBurnableToken {
    function burn(uint256 amount) external;
    function mint(address to, uint256 amount) external;
} 

abstract contract ImpossibleAdapter is ERC20, ERC20Permit, FlowLimiter {
    using SafeERC20 for ERC20;

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    address public immutable underlying;

    enum Mode {
        LOCK,
        MINTBURN
    }

    Mode public mode;

    event EmergencyTokenRetrieve(address indexed sender, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        address _underlying,
        address _admin,
        Mode _mode,
        uint256 _globalQuota,
        uint256 _userQuota,
        uint256 _globalQuotaRegenRate,
        uint256 _userQuotaRegenRate
    ) ERC20(_name, _symbol) ERC20Permit(_name) FlowLimiter(_globalQuota, _userQuota, _globalQuotaRegenRate, _userQuotaRegenRate) {
        require(_underlying != address(0x0) && _underlying != address(this), "ImpossibleAdapter: BAD_UNDERLYING_ADDR");

        underlying = _underlying;
        mode = _mode;
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    function deposit(uint256 amount) external returns (uint256 mintAmount) {

    }

    function withdraw(uint256 amount) external returns (uint256 burnAmount) {

    }

    function emergencyTokenRetrieve(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {

    }
}
