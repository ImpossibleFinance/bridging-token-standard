// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "../library/ERC2771ContextUpdateable.sol";

/*
 * Interfaces
 */
interface IErc20Mintable {
    function mint(address user, uint256 amount) external;
}

interface IErc20Burnable {
    function burn(address user, uint256 amount) external;
}

/**
 * @dev Polygon PoS bridge adapter
 *
 *      For reference: https://github.com/maticnetwork/pos-portal/blob/master/contracts/child/ChildToken/ChildERC20.sol
 */
contract PolygonPoSAdapter is AccessControlEnumerable, ERC2771ContextUpdateable {
    bytes32 public constant POLYGON_DEPOSITOR_ROLE = keccak256("POLYGON_DEPOSITOR_ROLE");
    address public immutable underlyingToken;

    // constructor
    // after construction, must give POLYGON_DEPOSITOR_ROLE to childChainManager
    constructor(address _underlyingToken) {
        underlyingToken = _underlyingToken;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    //// Polygon bridge functions

    // called by childChainManager on destination chain
    function deposit(address user, bytes calldata depositData) external {
        require(hasRole(POLYGON_DEPOSITOR_ROLE, _msgSender()), "Must have polygon depositor role");

        uint256 amount = abi.decode(depositData, (uint256));
        IErc20Mintable(underlyingToken).mint(user, amount);
    }

    // called by anyone wanting to bridge on source chain
    function withdraw(uint256 amount) external {
        IErc20Burnable(underlyingToken).burn(_msgSender(), amount);
    }

    //// EIP2771 meta transactions

    function _msgSender() internal view override(Context, ERC2771ContextUpdateable) returns (address) {
        return ERC2771ContextUpdateable._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771ContextUpdateable) returns (bytes calldata) {
        return ERC2771ContextUpdateable._msgData();
    }
}
