// server.js - Local Express server for development
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { query } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Accounts endpoints
app.get('/api/accounts', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "Accounts" ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounts/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "Accounts" WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  const { name, credit } = req.body;
  try {
    const result = await query('INSERT INTO "Accounts" (name, credit) VALUES ($1, $2) RETURNING *', [name, credit || 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  const { name, credit } = req.body;
  try {
    const result = await query('UPDATE "Accounts" SET name = COALESCE($1, name), credit = COALESCE($2, credit) WHERE id = $3 RETURNING *', [name, credit, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cards endpoints
app.get('/api/cards', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "Cards" ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cards/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "Cards" WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cards', async (req, res) => {
  const { account_id, set_number, rarity } = req.body;
  try {
    const result = await query('INSERT INTO "Cards" (account_id, set_number, rarity) VALUES ($1, $2, $3) RETURNING *', [account_id, set_number, rarity]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  const { account_id, set_number, rarity } = req.body;
  try {
    const result = await query('UPDATE "Cards" SET account_id = COALESCE($1, account_id), set_number = COALESCE($2, set_number), rarity = COALESCE($3, rarity) WHERE id = $4 RETURNING *', [account_id, set_number, rarity, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM "Cards" WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// History endpoints
app.get('/api/history', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "History" ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history/account/:account_id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "History" WHERE account_id = $1 ORDER BY created_at DESC', [req.params.account_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history', async (req, res) => {
  const { account_id, type, card, set_number, rarity, amount, note } = req.body;
  try {
    const result = await query('INSERT INTO "History" (account_id, type, card, set_number, rarity, amount, note) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [account_id, type, card, set_number, rarity, amount, note]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CreditTransactions endpoints
app.get('/api/credit-transactions', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "CreditTransactions" ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/credit-transactions/account/:account_id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "CreditTransactions" WHERE account_id = $1 ORDER BY created_at DESC', [req.params.account_id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/credit-transactions', async (req, res) => {
  const { account_id, amount, note } = req.body;
  try {
    const result = await query('INSERT INTO "CreditTransactions" (account_id, amount, note, "timestamp") VALUES ($1, $2, $3, NOW()) RETURNING *', [account_id, amount, note]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Requests endpoints
app.get('/api/requests', async (req, res) => {
  try {
    const result = await query('SELECT * FROM "Requests" ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const { requestor_id, associated_account_id, type, amount, card } = req.body;
  try {
    const result = await query('INSERT INTO "Requests" (requestor_id, associated_account_id, type, amount, card, is_approved) VALUES ($1, $2, $3, $4, $5, false) RETURNING *', [requestor_id, associated_account_id, type, amount, card]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  const { is_approved } = req.body;
  try {
    const result = await query('UPDATE "Requests" SET is_approved = $1 WHERE id = $2 RETURNING *', [is_approved, req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
