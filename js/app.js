(function(){
  const cfg = window.APP_CONFIG || {};
  const sheetSelect = document.getElementById('sheetSelect');
  const tableWrap = document.getElementById('tableWrap');
  const status = document.getElementById('status');
  const refreshBtn = document.getElementById('refresh');
  const searchInput = document.getElementById('search');

  function setStatus(s){ status.textContent = s; }

  function buildUrl(spreadsheetId, gid){
    // If the ID starts with '2PACX-' or is from a published-to-web link, use the published CSV format
    if (spreadsheetId.startsWith('2PACX-') || spreadsheetId.length > 40) {
      // Published-to-web CSV link
      return `https://docs.google.com/spreadsheets/d/e/${spreadsheetId}/pub?output=csv&gid=${gid}`;
    }
    // Standard Google Sheets CSV export
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  function csvToArray(str){
    // simple CSV parser (handles quoted fields)
    const rows = [];
    const re = /(?:\s*"((?:\\"|[^"])*?)"\s*|([^,]+)|)(?:,|$)/g;
    const lines = str.split(/\r?\n/).filter(Boolean);
    lines.forEach(line => {
      const row = [];
      line.replace(re, (_, quoted, unquoted)=>{
        if(quoted!==undefined) row.push(quoted.replace(/\"/g,'"'));
        else if(unquoted!==undefined) row.push(unquoted);
        else row.push('');
        return '';
      });
      rows.push(row);
    });
    return rows;
  }

  function formatTimestamp(val) {
    // Try to parse as ISO or common date/time, fallback to original
    if (!val) return '';
    let d = new Date(val);
    if (!isNaN(d)) {
      return d.toLocaleString();
    }
    // Try parsing as MM/DD/YYYY HH:MM:SS or similar
    const parts = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})[ ,T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (parts) {
      d = new Date(parts[3], parts[1]-1, parts[2], parts[4], parts[5], parts[6]||0);
      if (!isNaN(d)) return d.toLocaleString();
    }
    return val;
  }

  function renderTable(headers, rows){
    if(!rows.length){ tableWrap.innerHTML = '<div class="card empty">No rows found.</div>'; return; }
    const t = document.createElement('table'); t.className = 'table card';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h=>{ const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh);
    t.appendChild(thead);
    // Find timestamp columns
    const tsCols = headers.map(h => h.toLowerCase().includes('timestamp'));
    const tbody = document.createElement('tbody');
    rows.forEach((r, rowIdx)=>{
        const tr = document.createElement('tr');
        headers.forEach((_,i)=>{ const td = document.createElement('td'); td.textContent = r[i] || ''; tr.appendChild(td); });
        const sheetName = sheetSelect.options[sheetSelect.selectedIndex].text;
        if (sheetName === 'Sheet1') {
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => showAccountHistory(r[0])); // assumes first column is account name
        } else if (sheetName === 'Cards') {
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => {
            let cardName = (r[0]||'').trim().toLowerCase().replace(/\s+/g, '+');
            cardName = encodeURIComponent(cardName);
            if(cardName) {
              const url = `https://www.tcgplayer.com/search/all/product?q=${cardName}&view=grid`;
              const win = window.open(url, '_blank', 'noopener,noreferrer');
              if (!win) {
                window.location.href = url;
              }
            }
          });
        }
        tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    tableWrap.innerHTML = ''; tableWrap.appendChild(t);
  }

  // Modal for history
  function ensureHistoryModal() {
    let modal = document.getElementById('historyModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'historyModal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.6)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '1000';
      // Responsive modal content
      modal.innerHTML = '<div id="historyModalContent" style="background:#181f2a;padding:24px 18px 18px 18px;border-radius:12px;max-width:95vw;max-height:90vh;overflow:auto;position:relative;width:100%;box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
      // Mobile style
      const style = document.createElement('style');
      style.textContent = `@media (max-width: 720px) { #historyModalContent { padding: 8px 2px 8px 2px !important; border-radius: 0 !important; max-width: 100vw !important; min-width: 0 !important; } #historyModal { align-items: flex-start !important; } }`;
      document.head.appendChild(style);
    }
    return modal;
  }

  function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
  }

  async function showAccountHistory(accountName) {
    setStatus('Loading history for ' + accountName + '...');
    // Find the History sheet's gid
    const historySheet = (cfg.SHEETS || []).find(s => s.name.toLowerCase() === 'history');
    if (!historySheet) { setStatus('No History sheet configured'); return; }
    const data = await fetchSheet(historySheet.gid);
    if (!data) return;
    // Find the column index for account name (case-insensitive match)
    const colIdx = data.headers.findIndex(h => h.toLowerCase().includes('account'));
    if (colIdx === -1) { setStatus('No account column in History'); return; }
    // Filter rows by account name (exact match)
    const filtered = data.rows.filter(r => (r[colIdx]||'').trim() === accountName.trim());
    // Render modal
    const modal = ensureHistoryModal();
    const content = document.getElementById('historyModalContent');
    content.innerHTML = `<button id="closeHistoryModal" style="position:absolute;top:8px;right:12px;font-size:20px;background:none;border:none;color:#fff;cursor:pointer;">&times;</button><h2 style="margin-top:0">History for ${accountName}</h2>`;
    if (filtered.length) {
      // Reuse renderTable logic for modal
      const tempDiv = document.createElement('div');
      renderTableIn(tempDiv, data.headers, filtered);
      content.appendChild(tempDiv.firstChild);
    } else {
      content.innerHTML += '<div class="empty">No history found for this account.</div>';
    }
    modal.style.display = 'flex';
    document.getElementById('closeHistoryModal').onclick = closeHistoryModal;
  }

  // Helper to render a table in a given element (for modal)
  function renderTableIn(container, headers, rows) {
    if(!rows.length){ container.innerHTML = '<div class="card empty">No rows found.</div>'; return; }
    const t = document.createElement('table'); t.className = 'table card';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    // Find note column index (case-insensitive)
    const noteColIdx = headers.findIndex(h => h.toLowerCase().includes('note'));
    headers.forEach((h, i)=>{
      const th = document.createElement('th'); th.textContent = h;
      if(i === noteColIdx) th.style.minWidth = '50ch';
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);
    // Find timestamp columns
    const tsCols = headers.map(h => h.toLowerCase().includes('timestamp'));
    const tbody = document.createElement('tbody');
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      headers.forEach((_,i)=>{
        const td = document.createElement('td');
        let val = r[i] || '';
        if (tsCols[i]) val = formatTimestamp(val);
        td.textContent = val;
        if(i === noteColIdx) td.style.minWidth = '50ch';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(t);
  }

  async function fetchSheet(gid){
    const id = cfg.SPREADSHEET_ID;
    if(!id || id.includes('PUT_YOUR')){ setStatus('Set SPREADSHEET_ID in js/config.js'); return; }
    let url = buildUrl(id, gid);
    // Use CORS proxy for Google Sheets CSV links
    url = 'https://corsproxy.io/?' + encodeURIComponent(url);
    setStatus('Fetching sheet...');
    try{
      const res = await fetch(url);
      if(!res.ok) throw new Error('Network response not ok: '+res.status);
      const txt = await res.text();
      const arr = csvToArray(txt);
      const headers = arr[0] || [];
      const rows = arr.slice(1);
      setStatus('Loaded ' + rows.length + ' rows.');
      return { headers, rows };
    }catch(err){
      setStatus('Error fetching sheet: ' + err.message);
      console.error(err);
      return null;
    }
  }

  function populateSheetSelect(){
    sheetSelect.innerHTML = '';
    (cfg.SHEETS || []).forEach((s, idx)=>{
      const opt = document.createElement('option'); opt.value = s.gid || idx; opt.textContent = s.name || ('Sheet ' + (idx+1)); sheetSelect.appendChild(opt);
    });
  }

  async function load(){
    // Don't repopulate dropdown here
    const gid = sheetSelect.value;
    const data = await fetchSheet(gid);
    if(!data) return;
    window._CURRENT_DATA = data;
    renderTable(data.headers, data.rows);
  }

  // Populate dropdown once on startup
  populateSheetSelect();

  sheetSelect.addEventListener('change', load);
  refreshBtn.addEventListener('click', load);
  searchInput.addEventListener('input', ()=>{
    const q = (searchInput.value || '').toLowerCase().trim();
    const data = window._CURRENT_DATA;
    if(!data){ setStatus('No data loaded'); return; }
    if(!q){ renderTable(data.headers, data.rows); setStatus('Showing all rows'); return; }
    const filtered = data.rows.filter(r=> r.join(' ').toLowerCase().includes(q));
    renderTable(data.headers, filtered);
    setStatus('Showing ' + filtered.length + ' rows (filtered)');
  });

  load();
})();
