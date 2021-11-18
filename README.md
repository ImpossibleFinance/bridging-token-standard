# Impossible Tokens

This repo contains the source code for IF and IDIA tokens.

The token supports the following bridges via our adapters:

- [Anyswap V5](https://github.com/connext/chaindata)
- [Polygon PoS bridge](https://github.com/maticnetwork/pos-portal)

Additional features:

- Meta-transactions are supported using [Biconomy Mexa](https://docs.biconomy.io/products/enable-gasless-transactions)
- EIP1363 (payable token) is supported via the [official reference implementation library](https://github.com/vittominacori/erc1363-payable-token)

## Deploying

```
# IFTokenStandard token
NAME="Foo Token" SYMBOL="FOO" npx hardhat run ./scripts/IFTokenStandard-deploy.ts --network bsc_test
```

### Minting token

```
TOKEN=0x... TO=0x... AMOUNT=... npx hardhat run ./scripts/IFTokenStandard-mint.ts --network bsc_test
```
