// Netlify Function: get-sheet.js
// Usage: /.netlify/functions/get-sheet?sheetId=...&gid=...


exports.handler = async function(event, context) {
  const sheetId = event.queryStringParameters.sheetId;
  const gid = event.queryStringParameters.gid || '0';
  if (!sheetId) {
    return {
      statusCode: 400,
      body: 'Missing sheetId parameter.'
    };
  }
  // Published-to-web CSV link
  const url = `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&gid=${gid}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return {
        statusCode: res.status,
        body: `Error fetching sheet: ${res.status}`
      };
    }
    const csv = await res.text();
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv'
      },
      body: csv
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: 'Server error: ' + err.message
    };
  }
};
