window.APP_CONFIG = {
  // API configuration
  API_BASE_URL: "/.netlify/functions/api-handler",
  API_ENDPOINTS: {
    accounts: "/api/accounts",
    cards: "/api/cards",
    history: "/api/history",
    creditTransactions: "/api/credit-transactions",
    requests: "/api/requests"
  },

  // Sheet names for dropdown (matches API endpoints)
  SHEETS: [
    { name: "Accounts" },
    { name: "Cards" },
    { name: "History" },
    { name: "Requests" },
  ]
};
