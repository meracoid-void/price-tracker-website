# Price Tracker API

This API provides endpoints to manage Accounts, Cards, History, Credit Transactions, and Requests.

## Setup

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

3. Update `.env` with your PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/price_tracker
   PORT=3000
   ```

4. Run the local server:
   ```bash
   npm start
   ```

The API will be available at `http://localhost:3000`

### Production (Netlify)

1. Set the `DATABASE_URL` environment variable in your Netlify site settings.
2. The API functions are available at `https://meracoid-price-tracker.netlify.app/.netlify/functions/api-handler`

## API Endpoints

### Accounts
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/:id` - Get account by ID
- `POST /api/accounts` - Create account (`{ name, credit }`)
- `PUT /api/accounts/:id` - Update account (`{ name, credit }`)

### Cards
- `GET /api/cards` - Get all cards
- `GET /api/cards/:id` - Get card by ID
- `POST /api/cards` - Create card (`{ account_id, set_number, rarity }`)
- `PUT /api/cards/:id` - Update card (`{ account_id, set_number, rarity }`)
- `DELETE /api/cards/:id` - Delete card

### History
- `GET /api/history` - Get all history
- `GET /api/history?account_id=X` - Get history for account
- `POST /api/history` - Create history entry (`{ account_id, type, card, set_number, rarity, amount, note }`)

### Credit Transactions
- `GET /api/credit-transactions` - Get all transactions
- `GET /api/credit-transactions?account_id=X` - Get transactions for account
- `POST /api/credit-transactions` - Create transaction (`{ account_id, amount, note }`)

### Requests
- `GET /api/requests` - Get all requests
- `POST /api/requests` - Create request (`{ requestor_id, associated_account_id, type, amount, card }`)
- `PUT /api/requests/:id` - Update request (`{ is_approved }`)

## Example Usage

### Create an account
```bash
curl -X POST http://localhost:3000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{ "name": "John", "credit": 100 }'
```

### Get all accounts
```bash
curl http://localhost:3000/api/accounts
```

### Add a card
```bash
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -d '{ "account_id": 1, "set_number": "BW01", "rarity": "Rare" }'
```
