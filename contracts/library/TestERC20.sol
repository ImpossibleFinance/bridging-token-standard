// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract TestERC20 is ERC20 {
    constructor(uint256 amt) ERC20("Test Token", "TT") {
        _mint(msg.sender, amt);
    }

    function mint(address to, uint256 amt) public {
        _mint(to, amt);
    }

    function burn(uint256 amt) public {
        _burn(msg.sender, amt);
    }
}
