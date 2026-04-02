// netlify/functions/api-handler.js - Universal API handler using Supabase REST API
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;

console.log('API Handler loaded. SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'NOT SET');
console.log('API Handler loaded. SUPABASE_API_KEY:', SUPABASE_API_KEY ? 'Set' : 'NOT SET');

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

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
}

function getCreatedAt(passedValue) {
  if (passedValue) {
    return passedValue;
  }
  return new Date().toISOString().split('T')[0];
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
      const result = await supabaseRequest('Accounts', 'GET', `?id=eq.${id}`);
      if (!result || result.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
      return { statusCode: 200, body: JSON.stringify(result[0]), headers: corsHeaders() };
    } else {
      const result = await supabaseRequest('Accounts', 'GET', '?order=id.asc');
      return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { name, credit, created_at } = body;
    const result = await supabaseRequest('Accounts', 'POST', '', { name, credit: credit || 0, created_at: getCreatedAt(created_at) });
    return { statusCode: 201, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  } else if (method === 'PUT' && isId) {
    const { name, credit } = body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (credit !== undefined) updateData.credit = credit;
    const result = await supabaseRequest('Accounts', 'PATCH', `?id=eq.${id}`, updateData);
    if (!result || result.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleCards(method, path, params, body) {
  const id = path.split('/').pop();
  const isId = !isNaN(id) && id !== 'api';

  if (method === 'GET') {
    if (isId) {
      const result = await supabaseRequest('Cards', 'GET', `?id=eq.${id}`);
      if (!result || result.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
      return { statusCode: 200, body: JSON.stringify(result[0]), headers: corsHeaders() };
    } else {
      const result = await supabaseRequest('Cards', 'GET', '?order=id.asc');
      return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { account_id, set_number, rarity, created_at } = body;
    const result = await supabaseRequest('Cards', 'POST', '', { account_id, set_number, rarity, created_at: getCreatedAt(created_at) });
    return { statusCode: 201, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  } else if (method === 'PUT' && isId) {
    const { account_id, set_number, rarity } = body;
    const updateData = {};
    if (account_id !== undefined) updateData.account_id = account_id;
    if (set_number !== undefined) updateData.set_number = set_number;
    if (rarity !== undefined) updateData.rarity = rarity;
    const result = await supabaseRequest('Cards', 'PATCH', `?id=eq.${id}`, updateData);
    if (!result || result.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  } else if (method === 'DELETE' && isId) {
    await supabaseRequest('Cards', 'DELETE', `?id=eq.${id}`);
    return { statusCode: 200, body: JSON.stringify({ deleted: true }), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleHistory(method, path, params, body) {
  if (method === 'GET') {
    if (params && params.account_id) {
      const result = await supabaseRequest('History', 'GET', `?select=*&account_id=${params.account_id}&order=created_at.desc`);
      return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
    } else {
      const result = await supabaseRequest('History', 'GET', `?select=*&order=created_at.desc`);
      return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { account_id, type, card, set_number, rarity, amount, note, created_at } = body;
    const result = await supabaseRequest('History', 'POST', '', { account_id, type, card, set_number, rarity, amount, note, created_at: getCreatedAt(created_at) });
    return { statusCode: 201, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleCreditTransactions(method, path, params, body) {
  if (method === 'GET') {
    if (params && params.account_id) {
      const result = await supabaseRequest('CreditTransactions', 'GET', `?select=*&account_id=${params.account_id}&order=created_at.desc`);
      return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
    } else {
      const result = await supabaseRequest('CreditTransactions', 'GET', `?select=*&order=created_at.desc`);
      return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
    }
  } else if (method === 'POST') {
    const { account_id, amount, note, created_at } = body;
    const result = await supabaseRequest('CreditTransactions', 'POST', '', { account_id, amount, note, created_at: getCreatedAt(created_at) });
    return { statusCode: 201, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}

async function handleRequests(method, path, params, body) {
  const id = path.split('/').pop();
  const isId = !isNaN(id) && id !== 'api';

  if (method === 'GET') {
    const result = await supabaseRequest('Requests', 'GET', '?order=created_at.desc');
    return { statusCode: 200, body: JSON.stringify(result || []), headers: corsHeaders() };
  } else if (method === 'POST') {
    const { requestor_id, associated_account_id, type, amount, card, created_at } = body;
    const result = await supabaseRequest('Requests', 'POST', '', { requestor_id, associated_account_id, type, amount, card, is_approved: false, created_at: getCreatedAt(created_at) });
    return { statusCode: 201, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  } else if (method === 'PUT' && isId) {
    const { is_approved } = body;
    const result = await supabaseRequest('Requests', 'PATCH', `?id=eq.${id}`, { is_approved });
    if (!result || result.length === 0) return { statusCode: 404, body: 'Not found', headers: corsHeaders() };
    return { statusCode: 200, body: JSON.stringify(result[0] || result), headers: corsHeaders() };
  }
  return { statusCode: 405, body: 'Method not allowed', headers: corsHeaders() };
}
