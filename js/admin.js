document.addEventListener('DOMContentLoaded', async () => {
  const ADMIN_PASS_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // "password" - change this

  let colleges = [];
  let vendors = [];
  let editingId = null;

  // Password gate
  document.getElementById('loginBtn').addEventListener('click', tryLogin);
  document.getElementById('adminPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') tryLogin();
  });

  async function tryLogin() {
    const pass = document.getElementById('adminPassword').value;
    const hash = await sha256(pass);
    if (hash === ADMIN_PASS_HASH) {
      document.getElementById('loginGate').style.display = 'none';
      document.getElementById('adminPanel').classList.add('active');
      await loadData();
    } else {
      document.getElementById('loginError').style.display = 'block';
    }
  }

  async function loadData() {
    const stored = localStorage.getItem('ccc-colleges');
    const storedVendors = localStorage.getItem('ccc-vendors');
    if (stored) {
      colleges = JSON.parse(stored);
      vendors = storedVendors ? JSON.parse(storedVendors) : [];
    } else {
      const data = await DataLoader.load();
      colleges = data.colleges;
      vendors = data.vendors;
    }
    renderAdminTable();
    populateFormDropdowns();
  }

  function saveToLocal() {
    localStorage.setItem('ccc-colleges', JSON.stringify(colleges));
    localStorage.setItem('ccc-vendors', JSON.stringify(vendors));
  }

  // Render admin table
  function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    const search = document.getElementById('adminSearch').value.toLowerCase();
    let filtered = colleges;
    if (search) {
      filtered = colleges.filter(c =>
        [c.collegeName, c.district, c.vendor, c.aiProgram].join(' ').toLowerCase().includes(search)
      );
    }
    tbody.innerHTML = filtered.map(c => `
      <tr>
        <td>${c.id}</td>
        <td><strong>${c.collegeName}</strong></td>
        <td>${c.district}</td>
        <td>${c.vendor}</td>
        <td>${c.aiProgram}</td>
        <td><span class="badge ${stageBadgeClass(c.implementationStage)}">${c.implementationStage || ''}</span></td>
        <td>
          <button class="btn btn-sm btn-outline-primary me-1" onclick="editRecord(${c.id})"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteRecord(${c.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `).join('');
    document.getElementById('adminCount').textContent = `${filtered.length} of ${colleges.length} records`;
  }

  document.getElementById('adminSearch').addEventListener('input', renderAdminTable);

  // Populate dropdowns in the form
  function populateFormDropdowns() {
    const regions = [...new Set(colleges.map(c => c.region).filter(Boolean))].sort();
    const vendorNames = [...new Set(colleges.map(c => c.vendor).filter(Boolean))].sort();
    const stages = ['Deployed', 'Pilot', 'Planning', 'Exploring', 'None Identified'];
    const lifecycles = ['Scale', 'Test', 'Design/Refine'];
    const useCases = [...new Set(colleges.map(c => c.useCase).filter(Boolean))].sort();

    fillSelect('formRegion', regions, true);
    fillSelect('formVendor', vendorNames, true);
    fillSelect('formStage', stages);
    fillSelect('formLifecycle', lifecycles);
    fillSelect('formUseCase', useCases, true);
    fillSelect('formRiskTier', ['1', '2', '3'], false, v => `Tier ${v}`);
  }

  function fillSelect(id, values, addCustom = false, labelFn = null) {
    const sel = document.getElementById(id);
    // Keep existing first option
    const firstOpt = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(firstOpt);
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(opt);
    });
  }

  // Add new
  document.getElementById('addNewBtn').addEventListener('click', () => {
    editingId = null;
    document.getElementById('formModalTitle').textContent = 'Add New College Initiative';
    document.getElementById('editForm').reset();
    new bootstrap.Modal(document.getElementById('formModal')).show();
  });

  // Edit
  window.editRecord = function(id) {
    const c = colleges.find(x => x.id === id);
    if (!c) return;
    editingId = id;
    document.getElementById('formModalTitle').textContent = 'Edit: ' + c.collegeName;
    document.getElementById('formCollegeName').value = c.collegeName;
    document.getElementById('formDistrict').value = c.district;
    document.getElementById('formRegion').value = c.region;
    document.getElementById('formAiProgram').value = c.aiProgram;
    document.getElementById('formVendor').value = c.vendor;
    document.getElementById('formUseCase').value = c.useCase;
    document.getElementById('formStage').value = c.implementationStage;
    document.getElementById('formLifecycle').value = c.innovationLifecycle;
    document.getElementById('formRiskTier').value = c.riskTier || '';
    document.getElementById('formTargetPop').value = c.targetPopulations;
    document.getElementById('formV2030').value = c.v2030Outcomes;
    document.getElementById('formCioName').value = c.cioName;
    document.getElementById('formCioEmail').value = c.cioEmail;
    document.getElementById('formContactName').value = c.contactName;
    document.getElementById('formContactRole').value = c.contactRole;
    document.getElementById('formContactEmail').value = c.contactEmail;
    document.getElementById('formAiFellow').value = c.aiFellow;
    document.getElementById('formFunding').value = c.fundingStatus;
    document.getElementById('formNotes').value = c.notes;
    new bootstrap.Modal(document.getElementById('formModal')).show();
  };

  // Save form
  document.getElementById('saveRecord').addEventListener('click', () => {
    const record = {
      id: editingId || (Math.max(0, ...colleges.map(c => c.id)) + 1),
      collegeName: document.getElementById('formCollegeName').value.trim(),
      district: document.getElementById('formDistrict').value.trim(),
      region: document.getElementById('formRegion').value,
      aiProgram: document.getElementById('formAiProgram').value.trim(),
      vendor: document.getElementById('formVendor').value,
      useCase: document.getElementById('formUseCase').value,
      implementationStage: document.getElementById('formStage').value,
      innovationLifecycle: document.getElementById('formLifecycle').value,
      riskTier: parseInt(document.getElementById('formRiskTier').value) || 0,
      targetPopulations: document.getElementById('formTargetPop').value.trim(),
      v2030Outcomes: document.getElementById('formV2030').value.trim(),
      cioName: document.getElementById('formCioName').value.trim(),
      cioEmail: document.getElementById('formCioEmail').value.trim(),
      contactName: document.getElementById('formContactName').value.trim(),
      contactRole: document.getElementById('formContactRole').value.trim(),
      contactEmail: document.getElementById('formContactEmail').value.trim(),
      aiFellow: document.getElementById('formAiFellow').value.trim(),
      fundingStatus: document.getElementById('formFunding').value.trim(),
      notes: document.getElementById('formNotes').value.trim()
    };

    if (!record.collegeName) {
      alert('College Name is required');
      return;
    }

    if (editingId) {
      const idx = colleges.findIndex(c => c.id === editingId);
      if (idx >= 0) colleges[idx] = record;
    } else {
      colleges.push(record);
    }

    saveToLocal();
    renderAdminTable();
    bootstrap.Modal.getInstance(document.getElementById('formModal')).hide();
    showToast(editingId ? 'Record updated' : 'Record added');
    editingId = null;
  });

  // Delete
  window.deleteRecord = function(id) {
    const c = colleges.find(x => x.id === id);
    if (!c) return;
    if (!confirm(`Delete "${c.collegeName} - ${c.aiProgram}"?`)) return;
    colleges = colleges.filter(x => x.id !== id);
    saveToLocal();
    renderAdminTable();
    showToast('Record deleted');
  };

  // Export JSON
  document.getElementById('exportBtn').addEventListener('click', () => {
    downloadJSON(colleges, 'colleges.json');
  });

  document.getElementById('exportVendorsBtn').addEventListener('click', () => {
    // Rebuild vendor list from current data
    const vendorMap = {};
    colleges.forEach(c => {
      if (c.vendor) {
        if (!vendorMap[c.vendor]) vendorMap[c.vendor] = { name: c.vendor, useCases: new Set(), collegeCount: 0 };
        vendorMap[c.vendor].collegeCount++;
        if (c.useCase) vendorMap[c.vendor].useCases.add(c.useCase);
      }
    });
    const vendorList = Object.values(vendorMap).map((v, i) => ({
      id: i + 1, name: v.name, useCases: [...v.useCases], collegeCount: v.collegeCount, website: '', notes: ''
    }));
    downloadJSON(vendorList, 'vendors.json');
  });

  // Reset to original data
  document.getElementById('resetBtn').addEventListener('click', async () => {
    if (!confirm('Reset all changes and reload original data from JSON files?')) return;
    localStorage.removeItem('ccc-colleges');
    localStorage.removeItem('ccc-vendors');
    const data = await DataLoader.load();
    colleges = data.colleges;
    vendors = data.vendors;
    renderAdminTable();
    showToast('Data reset to original');
  });

  // Import XLSX
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('This will replace all current data with the imported file. Continue?')) {
      e.target.value = '';
      return;
    }
    showToast('Import feature coming soon - use JSON export/import for now');
    e.target.value = '';
  });

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`);
  }

  function showToast(msg) {
    const container = document.querySelector('.toast-container') || (() => {
      const div = document.createElement('div');
      div.className = 'toast-container';
      document.body.appendChild(div);
      return div;
    })();
    const toast = document.createElement('div');
    toast.className = 'toast show align-items-center text-bg-success border-0';
    toast.innerHTML = `<div class="d-flex"><div class="toast-body">${msg}</div>
      <button class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function stageBadgeClass(stage) {
    return { 'Deployed': 'badge-deployed', 'Pilot': 'badge-pilot', 'Planning': 'badge-planning', 'Exploring': 'badge-exploring' }[stage] || 'bg-secondary';
  }

  async function sha256(msg) {
    const data = new TextEncoder().encode(msg);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
});
