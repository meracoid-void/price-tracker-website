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

  function renderTable(headers, rows){
    if(!rows.length){ tableWrap.innerHTML = '<div class="card empty">No rows found.</div>'; return; }
    const t = document.createElement('table'); t.className = 'table card';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h=>{ const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh);
    t.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(r=>{
      const tr = document.createElement('tr');
      headers.forEach((_,i)=>{ const td = document.createElement('td'); td.textContent = r[i] || ''; tr.appendChild(td); });
      tbody.appendChild(tr);
    });
    t.appendChild(tbody);
    tableWrap.innerHTML = ''; tableWrap.appendChild(t);
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
