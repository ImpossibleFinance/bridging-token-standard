// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

import "../library/ERC2771ContextUpdateable.sol";

/**
 * @dev Anyswap V5 bridge mint/burn adapter, written by IF.
 *
 *      For reference: https://github.com/connext/chaindata/blob/main/AnyswapV5ERC20.sol
 */
/* solhint-disable not-rely-on-time */
contract AnyswapV5BridgeAdapter is ERC20Burnable, ERC20Permit, ERC2771ContextUpdateable {
    using SafeERC20 for ERC20;

    // roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // the underlying token
    ERC20 public immutable underlyingToken;
    // maps of dcrm addresses to chains (2 way) -- (chainId => DCRM address)
    mapping(uint256 => address) public chainIdToDcrm;
    mapping(address => uint256) public dcrmToChainId;

    // events

    event Bridge(address indexed account, uint256 indexed amount);
    event LogSwapin(bytes32 indexed txhash, address indexed account, uint256 amount);
    event LogSwapout(address indexed account, address indexed bindaddr, uint256 amount);
    event EmergencyWithdraw(address indexed receiver, uint256 indexed amount);

    // constructor
    constructor(
        string memory _name,
        string memory _symbol,
        ERC20 _underlyingToken
    ) ERC20(_name, _symbol) ERC20Permit(_name) {
        underlyingToken = _underlyingToken;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    // mapping setter
    function setMapping(uint256 chainId, address dcrmAddress) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role");
        dcrmToChainId[dcrmAddress] = chainId;
        chainIdToDcrm[chainId] = dcrmAddress;
    }

    // todo: rate limit

    // bridge (custom adapter)
    function bridge(uint256 amount, uint256 chainId) public returns (bool) {
        underlyingToken.safeTransferFrom(_msgSender(), address(this), amount);
        // must first mint to this contract, then transfer to dcrm address
        // so dcrm picks up correct origin address from event
        _mint(address(this), amount);
        underlyingToken.transfer(chainIdToDcrm[chainId], amount);

        emit Bridge(_msgSender(), amount);
        return true;
    }

    // Swapin / Swapout (anyswap)

    // called by MPC on destination chain to transfer tokens in
    // solhint-disable-next-line func-name-mixedcase
    function Swapin(
        bytes32 txhash,
        address account,
        uint256 amount
    ) public returns (bool) {
        require(hasRole(MINTER_ROLE, _msgSender()), "Must have minter role");

        _mint(account, amount);
        emit LogSwapin(txhash, account, amount);
        return true;
    }

    // called by user on source chain to transfer tokens out
    // solhint-disable func-name-mixedcase
    function Swapout(uint256 amount, address bindaddr) public returns (bool) {
        require(bindaddr != address(0), "AnyswapV3ERC20: address(0x0)");
        _burn(_msgSender(), amount);
        emit LogSwapout(_msgSender(), bindaddr, amount);
        return true;
    }

    // emergency withdraw
    function emergencyWithdraw() public {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role");

        uint256 bal = underlyingToken.balanceOf(address(this));
        underlyingToken.safeTransfer(address(_msgSender()), bal);
        emit EmergencyWithdraw(_msgSender(), bal);
    }

    //// EIP2771 meta transactions

    function _msgSender() internal view override(Context, ERC2771ContextUpdateable) returns (address) {
        return ERC2771ContextUpdateable._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771ContextUpdateable) returns (bytes calldata) {
        return ERC2771ContextUpdateable._msgData();
    }
}
