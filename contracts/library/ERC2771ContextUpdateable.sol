// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

/**
 * @dev Context variant with ERC2771 support. Closely based off of
 *      openzeppelin/contracts/metatx/ERC2771Context.sol
 *      but modified to add setTrustedForwarder function.
 */
abstract contract ERC2771ContextUpdateable is
    ERC2771Context,
    AccessControlEnumerable
{
    address public _trustedForwarder;

    event TrustedForwarderChanged(
        address indexed trustedForwarder,
        address indexed actor
    );

    function isTrustedForwarder(address forwarder)
        public
        view
        override
        returns (bool)
    {
        return forwarder == _trustedForwarder;
    }

    function _msgSender()
        internal
        view
        override(Context, ERC2771Context)
        returns (address sender)
    {
        return ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771Context)
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    function setTrustedForwarder(address trustedForwarder) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "Must have admin role"
        );

        _trustedForwarder = trustedForwarder;
        emit TrustedForwarderChanged(trustedForwarder, msg.sender);
    }
}
