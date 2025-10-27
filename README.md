Price Tracker — Google Sheets to GitHub Pages

This is a simple static site that reads data from a Google Sheet (CSV export) and displays it. It's designed to be hosted on GitHub Pages.

Setup

1. Edit `js/config.js` and set `SPREADSHEET_ID` to your sheet's ID. Optionally adjust `SHEETS` with the sheet names and gid values.
2. If your sheet is private, publish it to the web (File → Share → Publish to web) or use the Sheets API (requires server-side proxy to keep an API key secret).
3. Commit the files and push to a GitHub repository. Enable GitHub Pages in the repository settings (choose the branch and root folder).

Notes

- This uses the CSV export URL, which works for published or publicly viewable sheets.
- For private sheets, you'll need to implement an authenticated call to the Google Sheets API on a server.

License: MIT
