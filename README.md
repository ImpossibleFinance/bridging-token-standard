# Impossible Tokens

This repo contains the source code for IF and IDIA tokens.

The token supports bridging:

- [Anyswap V5](https://github.com/connext/chaindata)
- [Polygon PoS bridge](https://github.com/maticnetwork/pos-portal)

Meta-transactions are supported using Biconomy Mexa.

## Deploying

```
# IFTokenStandard token
NAME="Foo Token" SYMBOL="FOO" npx hardhat run ./scripts/IFTokenStandard-deploy.ts --network bsc_test
```
