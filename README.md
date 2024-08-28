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
```
## Run it

Build and run it directly from the project's root folder:
```
npm run build
npm start
```

## Bot Management
```
# Kat-Wallet-Bot Management Instructions

## Initial Setup

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Build and start the bot with PM2:
   ```bash
   npm run build
   pm2 start npm --name "Kat-Wallet-Bot" -- start
   ```

3. Save the PM2 process list to keep the bot running after closing SSH:
   ```bash
   pm2 save
   ```

## Updating the Bot

When you have new changes to deploy:

1. Pull the latest changes from the main branch:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart the bot:
   ```bash
   npm run build
   pm2 restart Kat-Wallet-Bot
   ```

## Useful PM2 Commands

- View running processes: `pm2 list`
- Monitor bot in real-time: `pm2 monit`
- View bot logs: `pm2 logs Kat-Wallet-Bot`
- Stop the bot: `pm2 stop Kat-Wallet-Bot`
- Remove the bot from PM2: `pm2 delete Kat-Wallet-Bot`

Remember to run `pm2 save` after making changes to ensure the current process list is saved for automatic restarts.
```
## Kasplex API Documentation

https://docs.kasplex.org/tools-and-reference/kasplex-indexer-api
