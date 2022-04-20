# Impossible Finance Bridging Token Standard

## Problem
Bridges today are mostly off-chain protocols. Depending on the design and level of centralization, honest bridge protocols face varying risk to social engineering attacks, zero-day vulnerabilities and/or physical tampering of hardware. Most bridge companies also have smaller treasuries compared to their TVL. In the event of a bridge exploit, there is a high chance the bridge will be unable to cover losses for web3 multichain protocols which can cause insolvency.

## IF Bridging Standard
The Impossible Finance bridging standard adds safety by having having an intermediary adapter token contract between your token and the bridge. Adapter tokens rate limits operations that convert adapter tokens to underlying tokens. When an infinite mint attack happens, adversaries can mint infinite amounts of adapter tokens but will be unable to fully convert these to underlying tokens due to the rate limit mechanism. This limits losses in the event of an exploit.

![Screen Shot 2022-04-21 at 2 24 51 PM](https://user-images.githubusercontent.com/86365704/164528037-cdf612d1-6fa6-4161-932d-8165bb99624a.png)

Each bridge you wish to support with your token requires 1 adapter contract on the source chain, and 1 adapter contract on the destination chain. Adapter tokens support 1:1 wrap/unwrap between adapter/underlying tokens on home chain, and 1:1 mint/burn between adapter/underlying tokens on non-home chains. Rates are set per adapter contract to allow ecosystems to customize the balance between usage/risk for each bridge. 

## Rate Limit Mechanism
The are 4 variable associated with the rate limit design for our adapters:
1. ```globalQuota, userQuota```: operations that convert adapter tokens to underlying tokens consume quota up to these limits 
2. ```globalQuotaRegenerationRate, userQuotaRegenerationRate```: how fast the quota regenerates over time, up to ```globalQuota, userQuota```

In the event of a bridge exploit, teams should immediately zero out the rate limits and regeneration associated with that bridge adapter. If this is done, losses will be capped at ```globalQuota + globalQuotaRegenerationRate*detectionTime```.

When rate limits are exceeded, unwrapping and minting operations do not revert. Instead, unwrapping and minting will consume all available quota. The consumed amount is converted to underlying tokens while the remainder amount will remain as adapter tokens. After some regeneration occurs and there is sufficient quota, the user can then convert the remaining adapter tokens into underlying tokens. This design ensures that users do not lose funds due to reverted bridging transactions during periods of higher activity.

## Bridge Support
We currently have adapter tokens that support the following bridges:
- [Anyswap V4 Router](https://anyswap.exchange/)
