// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @dev Anyswap V5 bridge mint/burn child token
 *
 *      For reference: https://github.com/connext/chaindata/blob/main/AnyswapV5ERC20.sol
 *      Note: our implementation below extracts just the relevant parts.
 */
/* solhint-disable not-rely-on-time */
abstract contract AnyswapV5Token is ERC20Burnable, ERC20Permit {
    using SafeERC20 for IERC20;

    // set of minters, can be this bridge or other bridges
    mapping(address => bool) public isMinter;
    address[] public minters;
    // primary controller of the token contract
    address public vault;
    // the underlying token
    address public immutable underlying;

    bool private isInitialized;

    // flag to enable/disable swapout vs vault.burn so multiple events are triggered
    bool private _vaultOnly;

    // timelock variables

    uint256 public delay = 2 * 24 * 3600;

    address public pendingMinter;
    uint256 public delayMinter;

    address public pendingVault;
    uint256 public delayVault;

    uint256 public pendingDelay;
    uint256 public delayDelay;

    // events

    event LogChangeVault(
        address indexed oldVault,
        address indexed newVault,
        uint256 indexed effectiveTime
    );
    event LogChangeMPCOwner(
        address indexed oldOwner,
        address indexed newOwner,
        uint256 indexed effectiveHeight
    );
    event LogSwapin(
        bytes32 indexed txhash,
        address indexed account,
        uint256 amount
    );
    event LogSwapout(
        address indexed account,
        address indexed bindaddr,
        uint256 amount
    );
    event LogAddAuth(address indexed auth, uint256 timestamp);

    // view functions

    function owner() public view returns (address) {
        return mpc();
    }

    function mpc() public view returns (address) {
        if (block.timestamp >= delayVault) {
            return pendingVault;
        }
        return vault;
    }

    // modifiers

    modifier onlyAuth() {
        require(isMinter[msg.sender], "AnyswapV4ERC20: FORBIDDEN");
        _;
    }

    modifier onlyVault() {
        require(msg.sender == mpc(), "AnyswapV3ERC20: FORBIDDEN");
        _;
    }

    // constructor
    constructor(
        string memory _name,
        string memory _symbol,
        address _underlying,
        address _vault
    ) ERC20(_name, _symbol) {
        underlying = _underlying;
        if (_underlying != address(0x0)) {
            require(
                18 == IERC20Metadata(_underlying).decimals(),
                "Underlying decimals not 18"
            );
        }

        // Use init to allow for CREATE2 accross all chains
        isInitialized = false;

        // Disable/Enable swapout for v1 tokens vs mint/burn for v3 tokens
        _vaultOnly = false;

        vault = _vault;
        pendingVault = _vault;
        delayVault = block.timestamp;
    }

    // vaults

    function setVaultOnly(bool enabled) external onlyVault {
        _vaultOnly = enabled;
    }

    function initVault(address _vault) external onlyVault {
        require(!isInitialized, "Can only initialize once");
        vault = _vault;
        pendingVault = _vault;
        isMinter[_vault] = true;
        minters.push(_vault);
        delayVault = block.timestamp;
        isInitialized = true;
    }

    function setMinter(address _auth) external onlyVault {
        pendingMinter = _auth;
        delayMinter = block.timestamp + delay;
    }

    function setVault(address _vault) external onlyVault {
        pendingVault = _vault;
        delayVault = block.timestamp + delay;
    }

    function applyVault() external onlyVault {
        require(block.timestamp >= delayVault, "Awaiting timelock: vault");
        vault = pendingVault;
    }

    function applyMinter() external onlyVault {
        require(block.timestamp >= delayMinter, "Awaiting timelock: minter");
        isMinter[pendingMinter] = true;
        minters.push(pendingMinter);
    }

    // No time delay revoke minter emergency function
    function revokeMinter(address _auth) external onlyVault {
        isMinter[_auth] = false;
    }

    function getAllMinters() external view returns (address[] memory) {
        return minters;
    }

    function changeVault(address newVault) external onlyVault returns (bool) {
        require(newVault != address(0), "AnyswapV3ERC20: address(0x0)");
        pendingVault = newVault;
        delayVault = block.timestamp + delay;
        emit LogChangeVault(vault, pendingVault, delayVault);
        return true;
    }

    function changeMPCOwner(address newVault) public onlyVault returns (bool) {
        require(newVault != address(0), "AnyswapV3ERC20: address(0x0)");
        pendingVault = newVault;
        delayVault = block.timestamp + delay;
        emit LogChangeMPCOwner(vault, pendingVault, delayVault);
        return true;
    }

    // mint / burn
    // these functions are needed by AnyswapV5Router

    function mint(address to, uint256 amount) external onlyAuth returns (bool) {
        _mint(to, amount);
        return true;
    }

    function burn(address from, uint256 amount)
        external
        onlyAuth
        returns (bool)
    {
        require(from != address(0), "AnyswapV3ERC20: address(0x0)");
        _burn(from, amount);
        return true;
    }

    // Swapin / Swapout

    // called by MPC on destination chain to transfer tokens in
    // solhint-disable-next-line func-name-mixedcase
    function Swapin(
        bytes32 txhash,
        address account,
        uint256 amount
    ) public onlyAuth returns (bool) {
        _mint(account, amount);
        emit LogSwapin(txhash, account, amount);
        return true;
    }

    // called by user on source chain to transfer tokens out
    // solhint-disable func-name-mixedcase
    function Swapout(uint256 amount, address bindaddr) public returns (bool) {
        require(!_vaultOnly, "AnyswapV4ERC20: onlyAuth");
        require(bindaddr != address(0), "AnyswapV3ERC20: address(0x0)");
        _burn(msg.sender, amount);
        emit LogSwapout(msg.sender, bindaddr, amount);
        return true;
    }

    // deposit and withdraw

    function depositWithPermit(
        address target,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address to
    ) external returns (uint256) {
        ERC20Permit(underlying).permit(
            target,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );
        IERC20(underlying).safeTransferFrom(target, address(this), value);
        return _deposit(value, to);
    }

    // function depositWithTransferPermit(
    //     address target,
    //     uint256 value,
    //     uint256 deadline,
    //     uint8 v,
    //     bytes32 r,
    //     bytes32 s,
    //     address to
    // ) external returns (uint256) {
    //     IERC20(underlying).transferWithPermit(
    //         target,
    //         address(this),
    //         value,
    //         deadline,
    //         v,
    //         r,
    //         s
    //     );
    //     return _deposit(value, to);
    // }

    function deposit() external returns (uint256) {
        uint256 _amount = IERC20(underlying).balanceOf(msg.sender);
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), _amount);
        return _deposit(_amount, msg.sender);
    }

    function deposit(uint256 amount) external returns (uint256) {
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), amount);
        return _deposit(amount, msg.sender);
    }

    function deposit(uint256 amount, address to) external returns (uint256) {
        IERC20(underlying).safeTransferFrom(msg.sender, address(this), amount);
        return _deposit(amount, to);
    }

    function depositVault(uint256 amount, address to)
        external
        onlyVault
        returns (uint256)
    {
        return _deposit(amount, to);
    }

    function _deposit(uint256 amount, address to) internal returns (uint256) {
        require(
            underlying != address(0x0) && underlying != address(this),
            "Underlying invalid"
        );
        _mint(to, amount);
        return amount;
    }

    function withdraw() external returns (uint256) {
        return _withdraw(msg.sender, balanceOf(msg.sender), msg.sender);
    }

    function withdraw(uint256 amount) external returns (uint256) {
        return _withdraw(msg.sender, amount, msg.sender);
    }

    function withdraw(uint256 amount, address to) external returns (uint256) {
        return _withdraw(msg.sender, amount, to);
    }

    function withdrawVault(
        address from,
        uint256 amount,
        address to
    ) external onlyVault returns (uint256) {
        return _withdraw(from, amount, to);
    }

    function _withdraw(
        address from,
        uint256 amount,
        address to
    ) internal returns (uint256) {
        _burn(from, amount);
        IERC20(underlying).safeTransfer(to, amount);
        return amount;
    }
}
