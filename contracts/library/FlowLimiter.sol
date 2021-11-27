// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";

/**
 * @dev Flow limiter by quota.
 */
/* solhint-disable not-rely-on-time */
abstract contract FlowLimiter is Context, AccessControlEnumerable {
    // ENUMS

    enum FlowDirection {
        IN,
        OUT
    }

    // VARS

    // max quota for every user
    uint256 public maxQuota;
    // amount of quota unlocked per second per user
    uint256 public quotaPerSecond;
    // mapping (user -> transfer direction -> user quota info)
    mapping(address => mapping(FlowDirection => QuotaInfo)) public userQuotaMap;

    // STRUCTS

    // A user's quota info
    struct QuotaInfo {
        // timestamp of last quota
        uint256 lastUpdated;
        // amount of quota used
        uint256 quotaUsed;
    }

    // EVENTS

    event SetMaxQuota(address indexed caller, uint256 indexed oldQuota, uint256 indexed newQuota);
    event SetQuotaPerSecond(
        address indexed caller,
        uint256 indexed oldQuotaPerSecond,
        uint256 indexed newQuotaPerSecond
    );

    // CONFIG PARAMS

    // sets the max quota for every user
    function setMaxQuota(uint256 _maxQuota) public {
        // must be admin
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role");
        // emit
        emit SetMaxQuota(_msgSender(), maxQuota, _maxQuota);
        // set
        maxQuota = _maxQuota;
    }

    // sets quota per second (regeneration rate)
    function setQuotaPerSecond(uint256 _quotaPerSecond) public {
        // must be admin
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "Must have admin role");
        // emit
        emit SetQuotaPerSecond(_msgSender(), quotaPerSecond, _quotaPerSecond);
        // set
        quotaPerSecond = _quotaPerSecond;
    }

    // QUOTA FUNCTIONS

    // gets the quota for a particular user
    function userQuotaForToken(address user, FlowDirection direction) public view returns (uint256 quota) {
        QuotaInfo memory quotaInfo = userQuotaMap[user][direction];
        return quotaInfo.quotaUsed;
    }

    // sets the quota for a particular user
    function consumeUserQuota(
        address user,
        FlowDirection direction,
        uint256 amount
    ) internal {
        // get user current quota info
        QuotaInfo storage quotaInfo = userQuotaMap[user][direction];
        // calculate amount of quota unlocked
        uint256 unlocked = quotaPerSecond * (block.timestamp - quotaInfo.lastUpdated);
        // calculate new amount of quota used
        uint256 newUsage = (quotaInfo.quotaUsed + amount > unlocked) ? quotaInfo.quotaUsed + amount - unlocked : 0;

        // ensure usage does not exceed limit
        require(newUsage <= maxQuota, "Usage exceeds quota");

        // update quota used
        quotaInfo.quotaUsed = newUsage;
        // update last updated
        quotaInfo.lastUpdated = block.timestamp;
    }
}
