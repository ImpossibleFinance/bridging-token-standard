// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/** 
 @title Flow limiter contract for bridging tokens
 @author Impossible Finance
 @dev Flow is limited in 2 ways, at the global level and at the user level
 @dev "Flow regeneration" allows consumed flow to recover over time
*/
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

    /** 
     @notice Internal helper function to return the minimum of 3 uint256s
     */
    function _min(
        uint256 a,
        uint256 b,
        uint256 c
    ) internal pure returns (uint256) {
        return Math.min(Math.min(a, b), c);
    }

    /** 
     @notice Function to get maximum quota available for a user
     @param user address of user to check
     @return maxConsumable maximum quota available for this user to bridge
     */
    function getMaxConsumable(address user) public view returns (uint256 maxConsumable) {
        QuotaInfo memory globalQuotaInfo = globalQuotaState;
        QuotaInfo memory userQuotaInfo = userQuotaState[user];

        uint256 globalUnlocked = globalQuotaRegenRate * (block.timestamp - globalQuotaInfo.lastUpdated);
        uint256 userUnlocked = userQuotaRegenRate * (block.timestamp - globalQuotaInfo.lastUpdated);

        uint256 updatedGlobalConsumed = globalQuotaInfo.quotaUsed > globalUnlocked
            ? globalQuotaInfo.quotaUsed - globalUnlocked
            : 0;
        uint256 updatedUserConsumed = userQuotaInfo.quotaUsed > userUnlocked
            ? userQuotaInfo.quotaUsed - userUnlocked
            : 0;

        maxConsumable = Math.min(globalQuota - updatedGlobalConsumed, userQuota - updatedUserConsumed);
    }

    /** 
     @notice Function to consume quota. If insufficient quota, consume up to max and return that
     @param user address of user to consume quota from
     @param amount of quota to consume
     @return maxConsumed amount of quota that was consumed
     */
    function consumeUserQuota(address user, uint256 amount) internal returns (uint256 maxConsumed) {
        QuotaInfo memory globalQuotaInfo = globalQuotaState;
        QuotaInfo memory userQuotaInfo = userQuotaState[user];

        uint256 globalUnlocked = globalQuotaRegenRate * (block.timestamp - globalQuotaInfo.lastUpdated);
        uint256 userUnlocked = userQuotaRegenRate * (block.timestamp - globalQuotaInfo.lastUpdated);

        uint256 updatedGlobalConsumed = globalQuotaInfo.quotaUsed > globalUnlocked
            ? globalQuotaInfo.quotaUsed - globalUnlocked
            : 0;
        uint256 updatedUserConsumed = userQuotaInfo.quotaUsed > userUnlocked
            ? userQuotaInfo.quotaUsed - userUnlocked
            : 0;

        maxConsumed = _min(amount, globalQuota - updatedGlobalConsumed, userQuota - updatedUserConsumed);

        globalQuotaState = QuotaInfo({quotaUsed: updatedGlobalConsumed + maxConsumed, lastUpdated: block.timestamp});
        userQuotaState[user] = QuotaInfo({quotaUsed: updatedUserConsumed + maxConsumed, lastUpdated: block.timestamp});
    }

    /** 
     @notice Function for admin to set global quota
     @dev Only admin role
     @param _globalQuota new global quota
     */
    function setGlobalQuota(uint256 _globalQuota) external onlyRole(DEFAULT_ADMIN_ROLE) {
        globalQuota = _globalQuota;
        emit SetGlobalQuota(msg.sender, globalQuota, _globalQuota);
    }

    /** 
     @notice Function for admin to set user quota
     @dev Only admin role
     @param _userQuota new global quota
     */
    function setUserQuota(uint256 _userQuota) external onlyRole(DEFAULT_ADMIN_ROLE) {
        userQuota = _userQuota;
        emit SetUserQuota(msg.sender, userQuota, _userQuota);
    }

    /** 
     @notice Function for admin to set global quota regeneration rate
     @dev Only admin role
     @param _globalQuotaRegenRate new global quota regeneration rate
     */
    function setGlobalQuotaRegenRate(uint256 _globalQuotaRegenRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        globalQuotaRegenRate = _globalQuotaRegenRate;
        emit SetGlobalQuotaRegenRate(msg.sender, globalQuotaRegenRate, _globalQuotaRegenRate);
    }

    /** 
     @notice Function for admin to set user quota regeneration rate
     @dev Only admin role
     @param _userQuotaRegenRate new user quota regeneration rate
     */
    function setUserQuotaRegenRate(uint256 _userQuotaRegenRate) external onlyRole(DEFAULT_ADMIN_ROLE) {
        userQuotaRegenRate = _userQuotaRegenRate;
        emit SetUserQuotaRegenRate(msg.sender, userQuotaRegenRate, _userQuotaRegenRate);
    }
}
