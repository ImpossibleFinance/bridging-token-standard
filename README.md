# Impossible Tokens

This repo contains the source code for IF and IDIA tokens.

The token supports the following bridges via our adapters:

- [Anyswap V5](https://github.com/connext/chaindata)
- [Polygon PoS bridge](https://github.com/maticnetwork/pos-portal)

## Token Features

### EIP-1363 Payable Token

Supported via the [official reference implementation library](https://github.com/vittominacori/erc1363-payable-token).

### Meta-transactions

Our token supports two types of meta-transactions:

- [EIP-712 Signatures](https://eips.ethereum.org/EIPS/eip-712) (enabling `EIP-2612 permit`)
- [EIP-2771 Contexts](https://eips.ethereum.org/EIPS/eip-2771) (compatible with services such as [Biconomy Mexa](https://docs.biconomy.io/products/enable-gasless-transactions))

EIP-2612 and EIP-2771 are both standards for enabling meta-transactions. Both are supported for compatibility.

Note: EIP-2771 is a newer and more extensible standard, but relies on a trusted forwarder contract. The logic in the trusted forwarder contract **must be verified for correctness**.

## Token setup

1. Deploy IFTokenStandard token

```
NAME="Foo Token" SYMBOL="FOO" <CREATE2=nonce> npx hardhat run ./scripts/IFTokenStandard-deploy.ts --network bsc_test
```

2. To enable EIP-2771, set trusted forwarder and integrate with a service such as Biconomy

```
TOKEN=0x... TRUSTED_FWDER=0x... npx hardhat run ./scripts/IFTokenStandard-setTrustedForwarder.ts --network bsc_test
```

## Bridge adapter setup

1. Deploy AnyswapRouterAdapter

```
NAME="Foo Token - Anyswap" SYMBOL="anyFOO" UNDERLYING=0x... <CREATE2=nonce> npx hardhat run ./scripts/IFAnyswapRouterAdapter-deploy.ts --network bsc_test
```

2. Set the adapter mode. By default the deploy script will create an adapter in `mint-burn` mode. If `lock` mode is desired, then run the following:

```
ADAPTER=0x... MODE=lock npx hardhat run ./scripts/IFAnyswapRouterAdapter-setMode.ts --network bsc_test
```

3. Give router permissions for Anyswap Router on newly deployed AnyswapRouterAdapter

```
ADAPTER=0x... ROUTER=0x... npx hardhat run ./scripts/IFAnyswapRouterAdapter-grantRole-router.ts --network bsc_test
```

4. Give adapter permissions for minting token (on mint/burn chains only)

```
TOKEN=0x... ADAPTER=0x... npx hardhat run ./scripts/IFTokenStandard-grantRole-minter.ts --network bsc_test
```

5. Set quotas on router adapter

```
ADAPTER=0x... GLOBAL_QUOTA=10000 USER_QUOTA=1000 USER_QUOTA_REGEN_RATE=10 GLOBAL_QUOTA_REGEN_RATE=10 npx hardhat run ./scripts/IFAnyswapRouterAdapter-setQuotas.ts --network bsc_test
```

## Useful commands

**Minting**

```
TOKEN=0x... TO=0x... AMOUNT=... npx hardhat run ./scripts/IFTokenStandard-mint.ts --network bsc_test
```

**Router adapter info**

```
ADAPTER=0x... npx hardhat run scripts/IFAnyswapRouterAdapter-getInfo.ts --network bsc_test
```

**Approve**

```
TOKEN=0x... SPENDER=0x... AMOUNT=123 npx hardhat run scripts/IFTokenStandard-approve.ts --network bsc_test
```

**Anyswap out**

```
ADAPTER=0x... ROUTER=0x... AMOUNT=123 DEST_CHAIN=1285 npx hardhat run scripts/AnyswapRouter-anyswapOutUnderlying.ts --network bsc_test
```

**Withdraw accumulated**

```
ADAPTER=0x... npx hardhat run ./scripts/IFAnyswapRouterAdapter-withdrawAccumulated.ts --network bsc_test
```
