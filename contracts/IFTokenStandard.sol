// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "hardhat/console.sol";

import "./library/AnyswapV5Token.sol";
import "./library/ERC2771ContextUpdateable.sol";
import "./library/IPolygonPoSChildToken.sol";

contract IFTokenStandard is
    AccessControlEnumerable,
    ERC20Burnable,
    AnyswapV5Token,
    IPolygonPoSChildToken,
    ERC2771ContextUpdateable
{
    // constants
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant POLYGON_DEPOSITOR_ROLE =
        keccak256("POLYGON_DEPOSITOR_ROLE");

    // constructor
    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        // _setupRole(POLYGON_DEPOSITOR_ROLE, childChainManager);
        _setupRole(MINTER_ROLE, _msgSender());
    }

    function mint(address to, uint256 amount) public {
        require(hasRole(MINTER_ROLE, _msgSender()), "Must have minter role");
        _mint(to, amount);
    }

    //// EIP2771 meta transactions

    function _msgSender()
        internal
        view
        override(Context, ERC2771ContextUpdateable)
        returns (address)
    {
        return ERC2771ContextUpdateable._msgSender();
    }

    function _msgData()
        internal
        view
        override(Context, ERC2771ContextUpdateable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpdateable._msgData();
    }

    //// polygon PoS bridge child token

    function deposit(address user, bytes calldata depositData)
        external
        override
    {
        require(
            hasRole(POLYGON_DEPOSITOR_ROLE, _msgSender()),
            "Must have polygon depositor role"
        );

        uint256 amount = abi.decode(depositData, (uint256));
        _mint(user, amount);
    }

    // todo: must prevent users from calling this if not withdraw role
    function withdraw(uint256 amount) external override {
        _burn(_msgSender(), amount);
    }

    //// anyswap bridge child token
}
