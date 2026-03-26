// server.js - Local Express server using Supabase REST API
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

console.log('Server loaded. SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'NOT SET');
console.log('Server loaded. SUPABASE_API_KEY:', SUPABASE_API_KEY ? 'Set' : 'NOT SET');

const supabaseHeaders = {
  'Authorization': `Bearer ${SUPABASE_API_KEY}`,
  'apikey': SUPABASE_API_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function supabaseRequest(table, method = 'GET', query = '', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  
  const options = {
    method,
    headers: supabaseHeaders
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    if (!response.ok) {
      console.error(`Supabase error for ${method} ${table}:`, response.status, text);
      throw new Error(`Supabase API error: ${response.status} ${text}`);
    }
    
    return text ? JSON.parse(text) : null;
  } catch (err) {
    console.error(`Supabase request error for ${method} ${table}:`, err.message);
    throw err;
  }
}

app.use(cors());
app.use(express.json());

// Accounts endpoints
app.get('/api/accounts', async (req, res) => {
  try {
    const result = await supabaseRequest('Accounts', 'GET', '?order=id.asc');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/accounts/:id', async (req, res) => {
  try {
    const result = await supabaseRequest('Accounts', 'GET', `?id=eq.${req.params.id}`);
    if (!result || result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/accounts', async (req, res) => {
  const { name, credit } = req.body;
  try {
    const result = await supabaseRequest('Accounts', 'POST', '', { name, credit: credit || 0 });
    res.status(201).json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  const { name, credit } = req.body;
  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (credit !== undefined) updateData.credit = credit;
    const result = await supabaseRequest('Accounts', 'PATCH', `?id=eq.${req.params.id}`, updateData);
    if (!result || result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cards endpoints
app.get('/api/cards', async (req, res) => {
  try {
    const result = await supabaseRequest('Cards', 'GET', '?order=id.asc');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cards/:id', async (req, res) => {
  try {
    const result = await supabaseRequest('Cards', 'GET', `?id=eq.${req.params.id}`);
    if (!result || result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cards', async (req, res) => {
  const { account_id, set_number, rarity } = req.body;
  try {
    const result = await supabaseRequest('Cards', 'POST', '', { account_id, set_number, rarity });
    res.status(201).json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cards/:id', async (req, res) => {
  const { account_id, set_number, rarity } = req.body;
  try {
    const updateData = {};
    if (account_id !== undefined) updateData.account_id = account_id;
    if (set_number !== undefined) updateData.set_number = set_number;
    if (rarity !== undefined) updateData.rarity = rarity;
    const result = await supabaseRequest('Cards', 'PATCH', `?id=eq.${req.params.id}`, updateData);
    if (!result || result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cards/:id', async (req, res) => {
  try {
    await supabaseRequest('Cards', 'DELETE', `?id=eq.${req.params.id}`);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// History endpoints
app.get('/api/history', async (req, res) => {
  try {
    const result = await supabaseRequest('History', 'GET', '?select=*&order=created_at.desc');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history/account/:account_id', async (req, res) => {
  try {
    const result = await supabaseRequest('History', 'GET', `?select=*&account_id=${req.params.account_id}&order=created_at.desc`);
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/history', async (req, res) => {
  const { account_id, type, card, set_number, rarity, amount, note } = req.body;
  try {
    const result = await supabaseRequest('History', 'POST', '', { account_id, type, card, set_number, rarity, amount, note });
    res.status(201).json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// CreditTransactions endpoints
app.get('/api/credit-transactions', async (req, res) => {
  try {
    const result = await supabaseRequest('CreditTransactions', 'GET', '?select=*&order=created_at.desc');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/credit-transactions/account/:account_id', async (req, res) => {
  try {
    const result = await supabaseRequest('CreditTransactions', 'GET', `?select=*&account_id=${req.params.account_id}&order=created_at.desc`);
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/credit-transactions', async (req, res) => {
  const { account_id, amount, note } = req.body;
  try {
    const result = await supabaseRequest('CreditTransactions', 'POST', '', { account_id, amount, note, timestamp: new Date().toISOString() });
    res.status(201).json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Requests endpoints
app.get('/api/requests', async (req, res) => {
  try {
    const result = await supabaseRequest('Requests', 'GET', '?order=created_at.desc');
    res.json(result || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/requests', async (req, res) => {
  const { requestor_id, associated_account_id, type, amount, card } = req.body;
  try {
    const result = await supabaseRequest('Requests', 'POST', '', { requestor_id, associated_account_id, type, amount, card, is_approved: false });
    res.status(201).json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/requests/:id', async (req, res) => {
  const { is_approved } = req.body;
  try {
    const result = await supabaseRequest('Requests', 'PATCH', `?id=eq.${req.params.id}`, { is_approved });
    if (!result || result.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result[0] || result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
