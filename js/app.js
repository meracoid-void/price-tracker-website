(function(){
  const cfg = window.APP_CONFIG || {};
  const sheetSelect = document.getElementById('sheetSelect');
  const tableWrap = document.getElementById('tableWrap');
  const status = document.getElementById('status');
  const refreshBtn = document.getElementById('refresh');
  const searchInput = document.getElementById('search');

  // Store accounts data for request forms
  let accountsData = [];

  function setStatus(s){ status.textContent = s; }

  // Convert API JSON data to table format (array of rows with headers)
  function jsonToTable(data, sheetName) {
    if (!Array.isArray(data) || data.length === 0) {
      return { headers: [], rows: [] };
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(item => headers.map(h => item[h] || ''));
    return { headers, rows };
  }

  // API fetching functions
  async function fetchFromAPI(endpoint) {
    const baseUrl = cfg.API_BASE_URL || '/.netlify/functions/api-handler';
    const url = `${baseUrl}${endpoint}`;
    setStatus('Fetching from API...');
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network response not ok: ' + res.status);
      const data = await res.json();
      setStatus('Loaded ' + (Array.isArray(data) ? data.length : 1) + ' items.');
      return data;
    } catch (err) {
      setStatus('Error fetching from API: ' + err.message);
      console.error(err);
      return null;
    }
  }

  async function fetchSheetAPI(sheetName) {
    let endpoint;
    if (sheetName === 'Accounts') {
      endpoint = cfg.API_ENDPOINTS?.accounts || '/api/accounts';
    } else if (sheetName === 'Cards') {
      endpoint = cfg.API_ENDPOINTS?.cards || '/api/cards';
    } else if (sheetName === 'History') {
      endpoint = cfg.API_ENDPOINTS?.history || '/api/history';
    } else if (sheetName === 'Requests') {
      endpoint = cfg.API_ENDPOINTS?.requests || '/api/requests';
    } else {
      setStatus('Unknown sheet: ' + sheetName);
      return null;
    }
    const data = await fetchFromAPI(endpoint);
    if (!data) return null;
    // Store accounts data for request forms
    if (sheetName === 'Accounts') {
      accountsData = data;
    }
    return jsonToTable(data, sheetName);
  }

  // Create request functions
  async function createCreditTransferRequest(requestorId, targetId, amount) {
    const baseUrl = cfg.API_BASE_URL || '/.netlify/functions/api-handler';
    const endpoint = cfg.API_ENDPOINTS?.requests || '/api/requests';
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestor_id: parseInt(requestorId),
          associated_account_id: parseInt(targetId),
          type: 'credit_transfer',
          amount: parseFloat(amount)
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create request');
      }
      return data;
    } catch (err) {
      console.error('Error creating credit transfer:', err);
      throw err;
    }
  }

  async function createCardRequest(requestorId, cardName) {
    const baseUrl = cfg.API_BASE_URL || '/.netlify/functions/api-handler';
    const endpoint = cfg.API_ENDPOINTS?.requests || '/api/requests';
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestor_id: parseInt(requestorId),
          type: 'card_request',
          card: cardName
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create request');
      }
      return data;
    } catch (err) {
      console.error('Error creating card request:', err);
      throw err;
    }
  }

  async function approveRequest(requestId) {
    const baseUrl = cfg.API_BASE_URL || '/.netlify/functions/api-handler';
    const endpoint = (cfg.API_ENDPOINTS?.requests || '/api/requests') + '/' + requestId;
    try {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: true })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve request');
      }
      return data;
    } catch (err) {
      console.error('Error approving request:', err);
      throw err;
    }
  }

  function formatTimestamp(val) {
    if (!val) return '';
    let d = new Date(val);
    if (!isNaN(d)) {
      return d.toLocaleString();
    }
    const parts = val.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})[ ,T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (parts) {
      d = new Date(parts[3], parts[1]-1, parts[2], parts[4], parts[5], parts[6]||0);
      if (!isNaN(d)) return d.toLocaleString();
    }
    return val;
  }

  function renderTable(headers, rows){
    const sheetName = sheetSelect.options[sheetSelect.selectedIndex]?.text;
    
    if (sheetName === 'Requests') {
      renderRequestsTable(headers, rows);
      return;
    }
    
    if(!rows.length){ tableWrap.innerHTML = '<div class="card empty">No rows found.</div>'; return; }
    const t = document.createElement('table'); t.className = 'table card';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    headers.forEach(h=>{ const th = document.createElement('th'); th.textContent = h; trh.appendChild(th); });
    thead.appendChild(trh);
    t.appendChild(thead);
    const tsCols = headers.map(h => h.toLowerCase().includes('timestamp'));
    const tbody = document.createElement('tbody');
    rows.forEach((r, rowIdx)=>{
        const tr = document.createElement('tr');
        headers.forEach((_,i)=>{ const td = document.createElement('td'); td.textContent = r[i] || ''; tr.appendChild(td); });
        if (sheetName === 'Accounts') {
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', () => showAccountHistory(r[0]));
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

  function getAccountName(id) {
    if (!id) return '-';
    const account = accountsData.find(a => a.id == id);
    return account ? (account.name || `Account #${id}`) : `Account #${id}`;
  }

  function renderRequestsTable(headers, rows) {
    if(!rows.length){ 
      tableWrap.innerHTML = '<div class="card empty">No requests found.</div>'; 
      return; 
    }
    
    // Find column indices
    const typeIdx = headers.findIndex(h => h === 'type');
    const requestorIdx = headers.findIndex(h => h === 'requestor_id');
    const targetIdx = headers.findIndex(h => h === 'associated_account_id');
    const amountIdx = headers.findIndex(h => h === 'amount');
    const cardIdx = headers.findIndex(h => h === 'card');
    const approvedIdx = headers.findIndex(h => h === 'is_approved');
    const createdIdx = headers.findIndex(h => h === 'created_at');
    
    const t = document.createElement('table'); t.className = 'table card';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    ['Type', 'From', 'To', 'Details', 'Status', 'Date'].forEach(h => {
      const th = document.createElement('th'); th.textContent = h; trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      const type = r[typeIdx] || '';
      const isApproved = r[approvedIdx] === 'true' || r[approvedIdx] === true;
      const requestorId = r[requestorIdx];
      const targetId = r[targetIdx];
      
      // Type column
      const typeTd = document.createElement('td');
      typeTd.innerHTML = `<span class="badge badge-${type}">${type.replace('_', ' ')}</span>`;
      tr.appendChild(typeTd);
      
      // From column - show name instead of ID
      const fromTd = document.createElement('td');
      fromTd.textContent = getAccountName(requestorId);
      tr.appendChild(fromTd);
      
      // To column - show name instead of ID
      const toTd = document.createElement('td');
      toTd.textContent = getAccountName(targetId);
      tr.appendChild(toTd);
      
      // Details column
      const detailsTd = document.createElement('td');
      if (type === 'credit_transfer') {
        detailsTd.textContent = `${r[amountIdx] || 0} credits`;
      } else if (type === 'card_request') {
        detailsTd.textContent = r[cardIdx] || '';
      }
      tr.appendChild(detailsTd);
      
      // Status column
      const statusTd = document.createElement('td');
      statusTd.innerHTML = `<span class="badge badge-${isApproved ? 'approved' : 'pending'}">${isApproved ? 'Approved' : 'Pending'}</span>`;
      tr.appendChild(statusTd);
      
      // Date column
      const dateTd = document.createElement('td');
      dateTd.textContent = formatTimestamp(r[createdIdx]);
      tr.appendChild(dateTd);
      
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
      modal.innerHTML = '<div id="historyModalContent" style="background:#181f2a;padding:24px 18px 18px 18px;border-radius:12px;max-width:95vw;max-height:90vh;overflow:auto;position:relative;width:100%;box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
      const style = document.createElement('style');
      style.textContent = `@media (max-width: 720px) { #historyModalContent { padding: 8px 2px 8px 2px !important; border-radius: 0 !important; max-width: 100vw !important; min-width: 0 !important; } #historyModal { align-items: flex-start !important; } }`;
      document.head.appendChild(style);
    }
    return modal;
  }

  // Modal for creating requests
  function ensureRequestModal() {
    let modal = document.getElementById('requestModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'requestModal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.6)';
      modal.style.display = 'none';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '1000';
      modal.innerHTML = '<div id="requestModalContent" style="background:#181f2a;padding:24px;border-radius:12px;max-width:500px;width:90%;max-height:90vh;overflow:auto;position:relative;box-sizing:border-box;"></div>';
      document.body.appendChild(modal);
      
      // Close on click outside
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeRequestModal();
      });
    }
    return modal;
  }

  function closeRequestModal() {
    const modal = document.getElementById('requestModal');
    if (modal) modal.style.display = 'none';
  }

  function showRequestTypeSelection() {
    const modal = ensureRequestModal();
    const content = document.getElementById('requestModalContent');
    content.innerHTML = `
      <button id="closeRequestModal" style="position:absolute;top:8px;right:12px;font-size:20px;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-top:0">Create Request</h2>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
        <button class="request-type-btn" data-type="credit_transfer" style="padding:16px;background:var(--card);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text);cursor:pointer;text-align:left;">
          <strong>Credit Transfer</strong><br>
          <small style="color:var(--muted)">Request to send credits to another account</small>
        </button>
        <button class="request-type-btn" data-type="card_request" style="padding:16px;background:var(--card);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:var(--text);cursor:pointer;text-align:left;">
          <strong>Card Request</strong><br>
          <small style="color:var(--muted)">Request a specific card</small>
        </button>
      </div>
    `;
    
    document.getElementById('closeRequestModal').onclick = closeRequestModal;
    content.querySelectorAll('.request-type-btn').forEach(btn => {
      btn.onclick = () => {
        const type = btn.getAttribute('data-type');
        if (type === 'credit_transfer') {
          showCreditTransferForm();
        } else {
          showCardRequestForm();
        }
      };
    });
    
    modal.style.display = 'flex';
  }

  function showCreditTransferForm() {
    const modal = ensureRequestModal();
    const content = document.getElementById('requestModalContent');
    
    const accountOptions = accountsData.map(a => 
      `<option value="${a.id}">${a.name || 'Account #' + a.id} (Credit: ${a.credit || 0})</option>`
    ).join('');
    
    content.innerHTML = `
      <button id="closeRequestModal" style="position:absolute;top:8px;right:12px;font-size:20px;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-top:0">Credit Transfer Request</h2>
      <form id="creditTransferForm" style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
        <label style="display:flex;flex-direction:column;gap:4px;">
          <span>From Account (Your account with credits):</span>
          <select id="fromAccount" required style="padding:8px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);">
            <option value="">Select account...</option>
            ${accountOptions}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">
          <span>To Account (Recipient):</span>
          <select id="toAccount" required style="padding:8px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);">
            <option value="">Select account...</option>
            ${accountOptions}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">
          <span>Amount:</span>
          <input type="number" id="transferAmount" min="1" step="1" required style="padding:8px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);">
        </label>
        <div id="validationMsg" style="color:#ef4444;font-size:14px;"></div>
        <button type="submit" id="submitTransfer" style="padding:10px 16px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">Submit Request</button>
        <button type="button" id="backBtn" style="padding:10px 16px;background:transparent;color:var(--muted);border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer;">Back</button>
      </form>
    `;
    
    document.getElementById('closeRequestModal').onclick = closeRequestModal;
    document.getElementById('backBtn').onclick = showRequestTypeSelection;
    
    const fromSelect = document.getElementById('fromAccount');
    const amountInput = document.getElementById('transferAmount');
    const validationMsg = document.getElementById('validationMsg');
    
    function validate() {
      const fromId = fromSelect.value;
      const amount = parseFloat(amountInput.value) || 0;
      const fromAccount = accountsData.find(a => a.id == fromId);
      
      validationMsg.textContent = '';
      if (fromAccount && amount > 0) {
        if (fromAccount.credit < 0) {
          validationMsg.textContent = 'Cannot transfer from account with negative credit';
          return false;
        }
        if (fromAccount.credit < amount) {
          validationMsg.textContent = `Insufficient credit. Available: ${fromAccount.credit}, Requested: ${amount}`;
          return false;
        }
      }
      return true;
    }
    
    fromSelect.onchange = validate;
    amountInput.oninput = validate;
    
    document.getElementById('creditTransferForm').onsubmit = async (e) => {
      e.preventDefault();
      if (!validate()) return;
      
      const fromId = fromSelect.value;
      const toId = document.getElementById('toAccount').value;
      const amount = amountInput.value;
      
      if (fromId === toId) {
        validationMsg.textContent = 'Cannot transfer to the same account';
        return;
      }
      
      try {
        document.getElementById('submitTransfer').disabled = true;
        document.getElementById('submitTransfer').textContent = 'Submitting...';
        await createCreditTransferRequest(fromId, toId, amount);
        setStatus('Credit transfer request created successfully');
        closeRequestModal();
        load();
      } catch (err) {
        validationMsg.textContent = err.message;
        document.getElementById('submitTransfer').disabled = false;
        document.getElementById('submitTransfer').textContent = 'Submit Request';
      }
    };
  }

  function showCardRequestForm() {
    const modal = ensureRequestModal();
    const content = document.getElementById('requestModalContent');
    
    const accountOptions = accountsData.map(a => 
      `<option value="${a.id}">${a.name || 'Account #' + a.id}</option>`
    ).join('');
    
    content.innerHTML = `
      <button id="closeRequestModal" style="position:absolute;top:8px;right:12px;font-size:20px;background:none;border:none;color:#fff;cursor:pointer;">&times;</button>
      <h2 style="margin-top:0">Card Request</h2>
      <form id="cardRequestForm" style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
        <label style="display:flex;flex-direction:column;gap:4px;">
          <span>Requesting Account:</span>
          <select id="requestorAccount" required style="padding:8px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);">
            <option value="">Select account...</option>
            ${accountOptions}
          </select>
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;">
          <span>Card Name:</span>
          <input type="text" id="cardName" required placeholder="Enter card name..." style="padding:8px;border-radius:6px;background:var(--bg);color:var(--text);border:1px solid rgba(255,255,255,0.1);">
        </label>
        <div id="validationMsg" style="color:#ef4444;font-size:14px;"></div>
        <button type="submit" id="submitCardRequest" style="padding:10px 16px;background:var(--accent);color:white;border:none;border-radius:6px;cursor:pointer;margin-top:8px;">Submit Request</button>
        <button type="button" id="backBtn" style="padding:10px 16px;background:transparent;color:var(--muted);border:1px solid rgba(255,255,255,0.1);border-radius:6px;cursor:pointer;">Back</button>
      </form>
    `;
    
    document.getElementById('closeRequestModal').onclick = closeRequestModal;
    document.getElementById('backBtn').onclick = showRequestTypeSelection;
    
    document.getElementById('cardRequestForm').onsubmit = async (e) => {
      e.preventDefault();
      const requestorId = document.getElementById('requestorAccount').value;
      const cardName = document.getElementById('cardName').value.trim();
      const validationMsg = document.getElementById('validationMsg');
      
      if (!cardName) {
        validationMsg.textContent = 'Please enter a card name';
        return;
      }
      
      try {
        document.getElementById('submitCardRequest').disabled = true;
        document.getElementById('submitCardRequest').textContent = 'Submitting...';
        await createCardRequest(requestorId, cardName);
        setStatus('Card request created successfully');
        closeRequestModal();
        load();
      } catch (err) {
        validationMsg.textContent = err.message;
        document.getElementById('submitCardRequest').disabled = false;
        document.getElementById('submitCardRequest').textContent = 'Submit Request';
      }
    };
  }

  function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.style.display = 'none';
  }

  async function showAccountHistory(accountName) {
    setStatus('Loading history for ' + accountName + '...');
    const data = await fetchSheetAPI('History');
    if (!data) return;
    const colIdx = data.headers.findIndex(h => h.toLowerCase().includes('account'));
    if (colIdx === -1) { setStatus('No account column in History'); return; }
    const filtered = data.rows.filter(r => (r[colIdx]||'').trim() === accountName.trim());
    const modal = ensureHistoryModal();
    const content = document.getElementById('historyModalContent');
    content.innerHTML = `<button id="closeHistoryModal" style="position:absolute;top:8px;right:12px;font-size:20px;background:none;border:none;color:#fff;cursor:pointer;">&times;</button><h2 style="margin-top:0">History for ${accountName}</h2>`;
    if (filtered.length) {
      const tempDiv = document.createElement('div');
      renderTableIn(tempDiv, data.headers, filtered);
      content.appendChild(tempDiv.firstChild);
    } else {
      content.innerHTML += '<div class="empty">No history found for this account.</div>';
    }
    modal.style.display = 'flex';
    document.getElementById('closeHistoryModal').onclick = closeHistoryModal;
  }

  function renderTableIn(container, headers, rows) {
    if(!rows.length){ container.innerHTML = '<div class="card empty">No rows found.</div>'; return; }
    const t = document.createElement('table'); t.className = 'table card';
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    const noteColIdx = headers.findIndex(h => h.toLowerCase().includes('note'));
    headers.forEach((h, i)=>{
      const th = document.createElement('th'); th.textContent = h;
      if(i === noteColIdx) th.style.minWidth = '50ch';
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    t.appendChild(thead);
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

  async function fetchSheet(){
    const sheetName = sheetSelect.options[sheetSelect.selectedIndex]?.text;
    return await fetchSheetAPI(sheetName);
  }

  function populateSheetSelect(){
    sheetSelect.innerHTML = '';
    (cfg.SHEETS || []).forEach((s, idx)=>{
      const opt = document.createElement('option'); opt.value = idx; opt.textContent = s.name || ('Sheet ' + (idx+1)); sheetSelect.appendChild(opt);
    });
  }

  function updateControlsVisibility() {
    const sheetName = sheetSelect.options[sheetSelect.selectedIndex]?.text;
    
    // Remove existing create request button if any
    const existingBtn = document.getElementById('createRequestBtn');
    if (existingBtn) {
      existingBtn.remove();
    }
    
    // Add create request button when on Requests tab
    if (sheetName === 'Requests') {
      const controls = document.querySelector('.controls');
      const btn = document.createElement('button');
      btn.id = 'createRequestBtn';
      btn.textContent = 'Create Request';
      btn.style.background = '#10b981';
      btn.style.marginLeft = 'auto';
      btn.onclick = showRequestTypeSelection;
      controls.appendChild(btn);
    }
  }

  async function load(){
    const sheetName = sheetSelect.options[sheetSelect.selectedIndex]?.text;
    
    // Load accounts data when viewing Requests (for name lookups)
    if (sheetName === 'Requests' && accountsData.length === 0) {
      const accountsEndpoint = cfg.API_ENDPOINTS?.accounts || '/api/accounts';
      accountsData = await fetchFromAPI(accountsEndpoint) || [];
    }
    
    const data = await fetchSheet();
    if(!data) return;
    window._CURRENT_DATA = data;
    renderTable(data.headers, data.rows);
    updateControlsVisibility();
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
