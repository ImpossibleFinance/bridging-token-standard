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

contract ImpossibleAdapter is ERC20, ERC20Permit, FlowLimiter {
    using SafeERC20 for ERC20;

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    address public immutable underlying;

    enum Mode {
        LOCK,
        MINTBURN
    }

    Mode public immutable mode;

    event EmergencyTokenRetrieve(address indexed sender, uint256 amount);
    event Deposit(address sender, uint256 amount);
    event Withdraw(address sender, uint256 amount);

    constructor(
        string memory _name,
        string memory _symbol,
        address _underlying,
        Mode _mode,
        uint256 _globalQuota,
        uint256 _userQuota,
        uint256 _globalQuotaRegenRate,
        uint256 _userQuotaRegenRate
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        require(_underlying != address(0x0) && _underlying != address(this), "ImpossibleAdapter: BAD_UNDERLYING_ADDR");
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        underlying = _underlying;
        mode = _mode;

        globalQuota = _globalQuota;
        userQuota = _userQuota;
        globalQuotaRegenRate = _globalQuotaRegenRate;
        userQuotaRegenRate = _userQuotaRegenRate;
    }

    function deposit(uint256 amount) external returns (uint256) {
        ERC20(underlying).safeTransferFrom(msg.sender, address(this), amount);
        _mint(msg.sender, amount);

        if (mode == Mode.MINTBURN) {
            IMintableBurnableToken(underlying).burn(amount);
        }

        emit Deposit(msg.sender, amount);
        return amount;
    }

    function withdraw(uint256 amount) external returns (uint256) {
        uint256 burnAmount = consumeUserQuota(msg.sender, amount);
        _burn(msg.sender, burnAmount);

        if (mode == Mode.MINTBURN) {
            IMintableBurnableToken(underlying).mint(msg.sender, burnAmount);
        } else {
            ERC20(underlying).safeTransfer(msg.sender, burnAmount);
        }

        emit Withdraw(msg.sender, amount);
        return burnAmount;
    }

    function emergencyTokenRetrieve(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            (token != underlying && mode == Mode.MINTBURN) || token != address(this),
            "ImpossibleAdapter: BAD_TOKEN_ADDR"
        );
        uint256 tokenBalance = ERC20(token).balanceOf(address(this));
        ERC20(token).safeTransfer(msg.sender, tokenBalance);
        emit EmergencyTokenRetrieve(msg.sender, tokenBalance);
    }
}
