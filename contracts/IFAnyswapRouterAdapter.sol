// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./library/ImpossibleAdapter.sol";

/**
 */
contract IFAnyswapAdapter is ImpossibleAdapter {
    using SafeERC20 for ERC20;

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
    )
        ImpossibleAdapter(
            _name,
            _symbol,
            _underlying,
            _mode,
            _globalQuota,
            _userQuota,
            _globalQuotaRegenRate,
            _userQuotaRegenRate
        )
    {}

    function depositVault(uint256 amount, address to) external onlyRole(ROUTER_ROLE) returns (uint256) {}

    function withdrawVault(
        address from,
        uint256 amount,
        address to
    ) external onlyRole(ROUTER_ROLE) returns (uint256) {}

    function mint(address to, uint256 amount) external onlyRole(ROUTER_ROLE) returns (bool) {}

    function burn(address from, uint256 amount) external onlyRole(ROUTER_ROLE) returns (bool) {}
}
