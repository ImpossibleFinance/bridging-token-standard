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
 @title Core bridging adapter token supporting anyswap operations
 @author Impossible Finance
 @dev Bridging operations can only consume flow rate up to the limit
 @dev No reverts will ever occur during flow consumption
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

    /** 
     @notice Anyswap bridging function on src chain to create adapter tokens from underlying
     @dev Only anyswap mpc
     @param amount of underlying tokens locked/burned
     @param to address to mint adapter tokens to
     @return amount of adapter tokens created
     */
    function depositVault(uint256 amount, address to) external onlyRole(ROUTER_ROLE) returns (uint256) {
        _mint(to, amount);

        if (mode == Mode.MINTBURN) {
            IMintableBurnableToken(underlying).burn(amount);
        }

        return amount;
    }

    /** 
     @notice Anyswap bridging function on dst chain to burn adapter tokens and transfer underlying
     @dev Only anyswap mpc
     @param from address to receive underlying tokens 
     @param amount desired amount of tokens to bridge over
     @param to address to receive tokens 
     @return receiveAmt amount of underlying tokens actually received
     */
    function withdrawVault(
        address from,
        uint256 amount,
        address to
    ) external onlyRole(ROUTER_ROLE) returns (uint256 receiveAmt) {
        receiveAmt = consumeUserQuota(to, amount);
        _burn(from, receiveAmt);

        if (mode == Mode.LOCK) {
            ERC20(underlying).safeTransfer(to, receiveAmt);
        } else {
            IMintableBurnableToken(underlying).mint(to, receiveAmt);
        }
    }

    /** 
     @notice Anyswap bridging function on dst chain to mint adapter tokens
     @dev Only anyswap mpc
     @param to address to receive adapter tokens 
     @param amount of adapter tokens minted
     @return bool if function succeeded
     */
    function mint(address to, uint256 amount) external onlyRole(ROUTER_ROLE) returns (bool) {
        _mint(to, amount);
        return true;
    }

    /** 
     @notice Anyswap bridging function on src chain to burn adapter tokens
     @dev Only anyswap mpc
     @param from address to burn adapter tokens from  
     @param amount amount to burn
     @return bool if function succeeded
     */
    function burn(address from, uint256 amount) external onlyRole(ROUTER_ROLE) returns (bool) {
        _burn(from, amount);
        return true;
    }
}
