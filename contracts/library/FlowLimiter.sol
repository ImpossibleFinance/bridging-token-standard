// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
 * @dev Flow limiter by quota.
 *      There are user quotas and also a global quota.
 *      The user quota regenerates per second, and so does the global quota.
 *      The flow limiter will revert if EITHER user or global quota is exceeded.
 *
 */
/* solhint-disable not-rely-on-time */
abstract contract FlowLimiter is AccessControlEnumerable {
    
    struct QuotaInfo {
        uint256 lastUpdated;
        uint256 quotaUsed;
    }

    uint256 public globalQuota;
    uint256 public userQuota;

    uint256 public globalQuotaRegenRate;
    uint256 public userQuotaRegenRate;

    QuotaInfo public globalQuotaState;
    mapping(address => QuotaInfo) public userQuotaState;

    event SetGlobalQuota(address indexed caller, uint256 indexed oldQuota, uint256 indexed newQuota);
    event SetUserQuota(address indexed caller, uint256 indexed oldQuota, uint256 indexed newQuota);
    event SetGlobalQuotaRegenRate(address indexed caller, uint256 indexed oldRate, uint256 indexed newRate);
    event SetUserQuotaRegenRate(address indexed caller, uint256 indexed oldRate, uint256 indexed newRate);

    constructor(
        uint256 _globalQuota,
        uint256 _userQuota,
        uint256 _globalQuotaRegenRate,
        uint256 _userQuotaRegenRate
    ) {
        globalQuota = _globalQuota;
        userQuota = _userQuota;
        globalQuotaRegenRate = _globalQuotaRegenRate;
        userQuotaRegenRate = _userQuotaRegenRate;
    }

    function consumeQuotaOfUser(
        address user,
        uint256 amount
    ) internal returns (uint256 maxConsumed) {

    }

    function setGlobalQuota(uint256 _globalQuota) external onlyRole(DEFAULT_ADMIN_ROLE) {
        globalQuota = _globalQuota;
        emit SetGlobalQuota(msg.sender, globalQuota, _globalQuota);   
    }

    function setUserQuota(uint256 _userQuota) external onlyRole(DEFAULT_ADMIN_ROLE) {
        userQuota = _userQuota;
        emit SetUserQuota(msg.sender, userQuota, _userQuota);
    }

    function setGlobalQuotaRegenRate(uint256 _globalQuotaRegenRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        globalQuotaRegenRate = _globalQuotaRegenRate;
        emit SetGlobalQuotaRegenRate(msg.sender, globalQuotaRegenRate, _globalQuotaRegenRate);
    }

    function setUserQuotaRegenRate(uint256 _userQuotaRegenRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        userQuotaRegenRate = _userQuotaRegenRate;
        emit SetUserQuotaRegenRate(msg.sender, userQuotaRegenRate, _userQuotaRegenRate);
    }
}
