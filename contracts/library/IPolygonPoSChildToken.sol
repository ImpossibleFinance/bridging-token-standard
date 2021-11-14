// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * @dev Polygon PoS bridge child token
 *
 *      For reference: https://github.com/maticnetwork/pos-portal/blob/master/contracts/child/ChildToken/ChildERC20.sol
 *      Note: polygon's own child interface does not specify withdraw; here we are more strict
 */
interface IPolygonPoSChildToken {
    function deposit(address user, bytes calldata depositData) external;
    function withdraw(uint256 amount) external;
}
