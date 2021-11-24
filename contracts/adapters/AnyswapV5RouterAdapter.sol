// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

import "../library/ERC2771ContextUpdateable.sol";

/**
 * @dev Anyswap V5 router adapter, written by IF.
 *
 *      For reference:
 *          Anyswap ERC20 (which this adapter replaces): https://github.com/connext/chaindata/blob/main/AnyswapV5ERC20.sol
 *          Anyswap V5 Router: https://github.com/anyswap/anyswap-v1-core/blob/master/contracts/AnyswapV5Router.sol
 */
/* solhint-disable not-rely-on-time */
contract AnyswapV5RouterAdapter is ERC20Burnable, ERC20Permit, ERC2771ContextUpdateable {
    using SafeERC20 for ERC20;

    // constants
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    // address of AnyswapV5Router contract
    address public immutable router;
    // underlying currency
    address public immutable underlying;

    constructor(
        string memory _name,
        string memory _symbol,
        address _router,
        address _underlying
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        router = _router;
        underlying = _underlying;
    }

    //// fns called by router

    // transferring onto bridge (source chain)
    // to support anySwapOutUnderlying
    function depositVault(uint256 amount, address to) external returns (uint256) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");
        require(underlying != address(0x0) && underlying != address(this), "Underlying invalid");
        _mint(to, amount);
        return amount;
    }

    // transferring off of bridge (dest chain)
    // to support anySwapInUnderlying / anySwapInAuto
    function withdrawVault(
        address from,
        uint256 amount,
        address to
    ) external returns (uint256) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");
        _burn(from, amount);
        ERC20(underlying).safeTransfer(to, amount);
        return amount;
    }

    // to support _anySwapIn (transferring off of bridge) (dest chain)
    function mint(address to, uint256 amount) external returns (bool) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");
        _mint(to, amount);
        return true;
    }

    // to support _anySwapOut (transferring onto bridge) (source chain)
    function burn(address from, uint256 amount) external returns (bool) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");
        require(from != address(0), "Cannot burn from 0x0");
        _burn(from, amount);
        return true;
    }

    //// EIP2771 meta transactions

    function _msgSender() internal view override(Context, ERC2771ContextUpdateable) returns (address) {
        return ERC2771ContextUpdateable._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771ContextUpdateable) returns (bytes calldata) {
        return ERC2771ContextUpdateable._msgData();
    }
}
