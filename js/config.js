// Edit these values with your Google Sheet info.
// How to get Spreadsheet ID: it's the long id in the sheet URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
// We'll use the Sheets API via the public CSV export for each sheet using the gid param, which works for public or published-to-web sheets.

window.APP_CONFIG = {
  // Data mode: "google-sheets" or "api"
  DATA_MODE: "google-sheets",
  
  // Google Sheets configuration
  SPREADSHEET_ID: "2PACX-1vRedoImhDSAadFHngA9hZn4hLw_-aLc5KiyASUoOM_g0ZPqFHHAY7FY6uVO2UgtTt0e8NNMSej-jAcl",
  SHEETS: [
    { name: "Sheet1", gid: "0" },
    { name: "Cards", gid: "1848518848" },
    { name: "History", gid: "1778618288" },
  ],
  USE_PUBLISHED_CSV: true,
  
  // API configuration
  // For production on Netlify: use "/.netlify/functions/api-handler" (relative path, same-origin)
  // For full URL: use "https://meracoid-price-tracker.netlify.app/.netlify/functions/api-handler"
  // For local dev: use "http://localhost:3000"
  API_BASE_URL: "/.netlify/functions/api-handler",
  API_ENDPOINTS: {
    accounts: "/api/accounts",
    cards: "/api/cards",
    history: "/api/history",
    creditTransactions: "/api/credit-transactions",
    requests: "/api/requests"
  }
};
