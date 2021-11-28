# Impossible Tokens

This repo contains the source code for IF and IDIA tokens.

The token supports the following bridges via our adapters:

- [Anyswap V5](https://github.com/connext/chaindata)
- [Polygon PoS bridge](https://github.com/maticnetwork/pos-portal)

## Token Features

**EIP1363 (payable token) is supported via the [official reference implementation library](https://github.com/vittominacori/erc1363-payable-token)**

**Meta-transactions**

Our token supports two types of meta-transactions:

- [EIP-712 signatures](https://eips.ethereum.org/EIPS/eip-712) (enabling `EIP-2612 permit`)
- [EIP-2771 contexts](https://eips.ethereum.org/EIPS/eip-2771) (compatible with services such as [Biconomy Mexa](https://docs.biconomy.io/products/enable-gasless-transactions))

EIP-2612 and EIP-2771 are both standards for enabling meta-transactions. Both are supported for compatibility.

Security Note: EIP-2771 is a newer and more extensible standard, but relies on a trusted forwarder contract. The logic in the trusted forwarder contract must be verified for correctness.

## Token Deployment

1. Deploy IFTokenStandard token

```
NAME="Foo Token" SYMBOL="FOO" npx hardhat run ./scripts/IFTokenStandard-deploy.ts --network bsc_test
```

2. To enable EIP-2771, set trusted forwarder and integrate with a service such as Biconomy

```
TOKEN=0x... TRUSTED_FWDER=0x... npx hardhat run ./scripts/IFTokenStandard-setTrustedForwarder.ts --network bsc_test
```

## Useful commands

**Minting**

```
TOKEN=0x... TO=0x... AMOUNT=... npx hardhat run ./scripts/IFTokenStandard-mint.ts --network bsc_test
```
