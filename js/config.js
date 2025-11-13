// Edit these values with your Google Sheet info.
// How to get Spreadsheet ID: it's the long id in the sheet URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
// We'll use the Sheets API via the public CSV export for each sheet using the gid param, which works for public or published-to-web sheets.

window.APP_CONFIG = {
  // Replace with your spreadsheet ID
  SPREADSHEET_ID: "2PACX-1vRedoImhDSAadFHngA9hZn4hLw_-aLc5KiyASUoOM_g0ZPqFHHAY7FY6uVO2UgtTt0e8NNMSej-jAcl",
  // Optional: provide mapping of sheet display names to gid values. If empty the app will try to fetch default sheets.
  SHEETS: [
    { name: "Sheet1", gid: "0" },
    { name: "Cards", gid: "1848518848" },
    { name: "History", gid: "1778618288" },
  ],
  // If your sheet is private, you need to publish it to the web or use an API key + Sheets API. GitHub Pages cannot hide an API key.
  USE_PUBLISHED_CSV: true
};
