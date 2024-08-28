# Kat Wallet Discord Bot

## Setup
Ensure .env exists in the root folder as:
```
DISCORD_TOKEN=[token from discord]
API_BASE_URL=https://api.kasplex.org/v1/krc20
PORT=8080
KASPA_NETWORK=Mainnet
RESOLVER_NODES=[array of resolver FQDN's as "https://...", "https://...", "https://..."]
MAINNET_API_BASE_URL=https://api.kasplex.org/v1/krc20
TESTNET_10_API_BASE_URL=https://tn10api.kasplex.org/v1/krc20
TESTNET_11_API_BASE_URL=https://tn11api.kasplex.org/v1/krc20

## Run it

Build and run it directly from the project's root folder:
```
npm run build
npm start
```
