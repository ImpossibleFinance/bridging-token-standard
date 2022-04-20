// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "./library/ImpossibleAdapter.sol";

interface AnyswapBridgingTokenUnderlying {
    function depositVault(uint256, address) external returns (uint256);

    function withdrawVault(
        address,
        uint256,
        address
    ) external returns (uint256);

    function mint(address, uint256) external returns (bool);

    function burn(address, uint256) external returns (bool);
}

/**
 */
contract IFAnyswapAdapter is ImpossibleAdapter, AnyswapBridgingTokenUnderlying {
    using SafeERC20 for ERC20;

    constructor(
        string memory _name,
        string memory _symbol,
        address _underlying,
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

    function depositVault(uint256 amount, address to) external onlyRole(ROUTER_ROLE) returns (uint256) {
        _mint(to, amount);

        if (mode == Mode.MINTBURN) {
            IMintableBurnableToken(underlying).burn(amount);
        }

        return amount;
    }

    function withdrawVault(
        address from,
        uint256 amount,
        address to
    ) external onlyRole(ROUTER_ROLE) returns (uint256 withdrawAmt) {
        if (mode == Mode.LOCK) {
            withdrawAmt = consumeUserQuota(to, amount);
            _burn(from, withdrawAmt);
            ERC20(underlying).safeTransfer(to, withdrawAmt);
        }
    }

    function mint(address to, uint256 amount) external onlyRole(ROUTER_ROLE) returns (bool) {
        if (mode == Mode.MINTBURN) {
            uint256 mintAmt = consumeUserQuota(to, amount);
            IMintableBurnableToken(underlying).mint(to, mintAmt);
            uint256 residue = amount - mintAmt;
            if (residue > 0) {
                _mint(to, residue);
            }
        } else {
            _mint(to, amount);
        }

        return true;
    }

    function burn(address from, uint256 amount) external onlyRole(ROUTER_ROLE) returns (bool) {
        _burn(from, amount);
        return true;
    }
}
