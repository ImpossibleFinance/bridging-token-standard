// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

import "../library/ERC2771ContextUpdateable.sol";
import "../library/FlowLimiter.sol";

/**
 * @dev Anyswap router adapter, written by IF. Compatible with Anyswap Router V4 and V5.
 *
 *      For reference:
 *          Anyswap ERC20 (which this adapter replaces): https://github.com/connext/chaindata/blob/main/AnyswapV5ERC20.sol
 *          Anyswap V5 Router: https://github.com/anyswap/anyswap-v1-core/blob/master/contracts/AnyswapV5Router.sol
 */
/* solhint-disable not-rely-on-time */
contract AnyswapRouterAdapter is ERC20, ERC20Permit, ERC2771ContextUpdateable, FlowLimiter {
    using SafeERC20 for ERC20;

    // CONSTS

    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");

    // VARS

    // underlying currency
    address public immutable underlying;

    // EVENTS

    event EmergencyTokenRetrieve(address indexed sender, uint256 amount);

    // constructor
    constructor(
        string memory _name,
        string memory _symbol,
        address _underlying
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        underlying = _underlying;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    //// fns called by router

    // transferring onto bridge (source chain)
    // to support anySwapOutUnderlying
    function depositVault(uint256 amount, address to) external returns (uint256) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");
        require(underlying != address(0x0) && underlying != address(this), "Underlying invalid");

        // consume flow quota (rate limit)
        consumeQuotaOfUser(to, FlowDirection.OUT, amount);

        // mint adapter token
        _mint(to, amount);

        // return
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

        // consume flow quota (rate limit)
        consumeQuotaOfUser(to, FlowDirection.IN, amount);

        // burn adapter token
        _burn(from, amount);
        // transfer underlying to user
        ERC20(underlying).safeTransfer(to, amount);

        // return
        return amount;
    }

    // to support _anySwapIn (transferring off of bridge) (dest chain)
    function mint(address to, uint256 amount) external returns (bool) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");

        // mint adapter token
        _mint(to, amount);

        // returns bool just for consistency with anyswap spec
        return true;
    }

    // to support _anySwapOut / _anySwapIn
    function burn(address from, uint256 amount) external returns (bool) {
        require(hasRole(ROUTER_ROLE, _msgSender()), "Must have router role");
        require(from != address(0), "Cannot burn from 0x0");

        // burn adapter token
        _burn(from, amount);

        // returns bool just for consistency with anyswap spec
        return true;
    }

    //// EIP2771 meta transactions

    function _msgSender() internal view override(Context, ERC2771ContextUpdateable) returns (address) {
        return ERC2771ContextUpdateable._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771ContextUpdateable) returns (bytes calldata) {
        return ERC2771ContextUpdateable._msgData();
    }

    // retrieve tokens erroneously sent in to this address
    function emergencyTokenRetrieve(address token) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role");

        // cannot be sale tokens
        require(token != underlying, "Cannot retrieve underlying");

        uint256 tokenBalance = ERC20(token).balanceOf(address(this));

        // transfer all
        ERC20(token).safeTransfer(_msgSender(), tokenBalance);

        // emit
        emit EmergencyTokenRetrieve(_msgSender(), tokenBalance);
    }
}
