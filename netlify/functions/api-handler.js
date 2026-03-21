// netlify/functions/api-handler.js - Universal API handler for Netlify Functions
const { Pool } = require('pg');

console.log('API Handler loaded. DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('Query error:', err.message, 'Query:', text);
    throw err;
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders()
    };
  }

  const { httpMethod, path, queryStringParameters, body } = event;
  let requestBody;
  try {
    requestBody = body ? JSON.parse(body) : {};
  } catch (e) {
    requestBody = {};
  }

  try {
    // Route handling
    if (path.includes('/api/accounts')) {
      return handleAccounts(httpMethod, path, queryStringParameters, requestBody);
    } else if (path.includes('/api/cards')) {
      return handleCards(httpMethod, path, queryStringParameters, requestBody);
    } else if (path.includes('/api/history')) {
      return handleHistory(httpMethod, path, queryStringParameters, requestBody);
    } else if (path.includes('/api/credit-transactions')) {
      return handleCreditTransactions(httpMethod, path, queryStringParameters, requestBody);
    } else if (path.includes('/api/requests')) {
      return handleRequests(httpMethod, path, queryStringParameters, requestBody);
    }
    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }), headers: corsHeaders() };
  } catch (error) {
    console.error('Handler error:', error.message, error.code);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        code: error.code,
        detail: process.env.NODE_ENV === 'development' ? error.detail : undefined
      }),
      headers: corsHeaders()
    };
  }
};

async function handleAccounts(method, path, params, body) {
  const id = path.split('/').pop();
  const isId = !isNaN(id) && id !== 'api';

  if (method === 'GET') {
    if (isId) {
      const result = await query('SELECT * FROM "Accounts" WHERE id = $1', [id]);
      if (result.rows.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
      return { statusCode: 200, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
    } else {
      const result = await query('SELECT * FROM "Accounts" ORDER BY id');
      return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { name, credit } = body;
    const result = await query('INSERT INTO "Accounts" (name, credit) VALUES ($1, $2) RETURNING *', [name, credit || 0]);
    return { statusCode: 201, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  } else if (method === 'PUT' && isId) {
    const { name, credit } = body;
    const result = await query('UPDATE "Accounts" SET name = COALESCE($1, name), credit = COALESCE($2, credit) WHERE id = $3 RETURNING *', [name, credit, id]);
    if (result.rows.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleCards(method, path, params, body) {
  const id = path.split('/').pop();
  const isId = !isNaN(id) && id !== 'api';

  if (method === 'GET') {
    if (isId) {
      const result = await query('SELECT * FROM "Cards" WHERE id = $1', [id]);
      if (result.rows.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
      return { statusCode: 200, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
    } else {
      const result = await query('SELECT * FROM "Cards" ORDER BY id');
      return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { account_id, set_number, rarity } = body;
    const result = await query('INSERT INTO "Cards" (account_id, set_number, rarity) VALUES ($1, $2, $3) RETURNING *', [account_id, set_number, rarity]);
    return { statusCode: 201, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  } else if (method === 'PUT' && isId) {
    const { account_id, set_number, rarity } = body;
    const result = await query('UPDATE "Cards" SET account_id = COALESCE($1, account_id), set_number = COALESCE($2, set_number), rarity = COALESCE($3, rarity) WHERE id = $4 RETURNING *', [account_id, set_number, rarity, id]);
    if (result.rows.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  } else if (method === 'DELETE' && isId) {
    const result = await query('DELETE FROM "Cards" WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify({ deleted: true }), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleHistory(method, path, params, body) {
  if (method === 'GET') {
    if (params && params.account_id) {
      const result = await query('SELECT * FROM "History" WHERE account_id = $1 ORDER BY created_at DESC', [params.account_id]);
      return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
    } else {
      const result = await query('SELECT * FROM "History" ORDER BY created_at DESC');
      return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { account_id, type, card, set_number, rarity, amount, note } = body;
    const result = await query('INSERT INTO "History" (account_id, type, card, set_number, rarity, amount, note) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [account_id, type, card, set_number, rarity, amount, note]);
    return { statusCode: 201, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleCreditTransactions(method, path, params, body) {
  if (method === 'GET') {
    if (params && params.account_id) {
      const result = await query('SELECT * FROM "CreditTransactions" WHERE account_id = $1 ORDER BY created_at DESC', [params.account_id]);
      return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
    } else {
      const result = await query('SELECT * FROM "CreditTransactions" ORDER BY created_at DESC');
      return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { account_id, amount, note } = body;
    const result = await query('INSERT INTO "CreditTransactions" (account_id, amount, note, "timestamp") VALUES ($1, $2, $3, NOW()) RETURNING *', [account_id, amount, note]);
    return { statusCode: 201, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleRequests(method, path, params, body) {
  const id = path.split('/').pop();
  const isId = !isNaN(id) && id !== 'api';

  if (method === 'GET') {
    const result = await query('SELECT * FROM "Requests" ORDER BY created_at DESC');
    return { statusCode: 200, body: JSON.stringify(result.rows), headers: corsHeaders() };
  } else if (method === 'POST') {
    const { requestor_id, associated_account_id, type, amount, card } = body;
    const result = await query('INSERT INTO "Requests" (requestor_id, associated_account_id, type, amount, card, is_approved) VALUES ($1, $2, $3, $4, $5, false) RETURNING *', [requestor_id, associated_account_id, type, amount, card]);
    return { statusCode: 201, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  } else if (method === 'PUT' && isId) {
    const { is_approved } = body;
    const result = await query('UPDATE "Requests" SET is_approved = $1 WHERE id = $2 RETURNING *', [is_approved, id]);
    if (result.rows.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify(result.rows[0]), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}
