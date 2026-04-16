document.addEventListener('DOMContentLoaded', async () => {
  const ADMIN_PASS_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // "password" - change this

  let colleges = [];
  let vendors = [];
  let editingCollegeId = null;
  let editingInitiativeIdx = null;

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
    if (stored) {
      colleges = JSON.parse(stored);
    } else {
      const data = await DataLoader.load();
      colleges = data.colleges;
    }
    renderAdminTable();
    populateFormDropdowns();
  }

  function saveToLocal() {
    localStorage.setItem('ccc-colleges', JSON.stringify(colleges));
  }

  function renderAdminTable() {
    const tbody = document.getElementById('adminTableBody');
    const search = document.getElementById('adminSearch').value.toLowerCase();
    let filtered = colleges;
    if (search) {
      filtered = colleges.filter(c => {
        var text = [c.collegeName, c.district, c.region].join(' ');
        c.initiatives.forEach(function(i) { text += ' ' + i.vendor + ' ' + i.aiProgram; });
        return text.toLowerCase().includes(search);
      });
    }
    tbody.innerHTML = filtered.map(c => {
      var vendorList = [];
      c.initiatives.forEach(function(i) { if (i.vendor && vendorList.indexOf(i.vendor) === -1) vendorList.push(i.vendor); });
      var stages = c.initiatives.map(function(i) {
        var cls = {'Deployed':'badge-deployed','Pilot':'badge-pilot','Planning':'badge-planning','Exploring':'badge-exploring'}[i.implementationStage] || 'bg-secondary';
        return '<span class="badge ' + cls + ' me-1">' + (i.implementationStage || '?') + '</span>';
      }).join('');
      return '<tr>' +
        '<td>' + c.id + '</td>' +
        '<td><strong>' + c.collegeName + '</strong><br><small class="text-muted">' + c.district + '</small></td>' +
        '<td>' + c.region + '</td>' +
        '<td>' + vendorList.join(', ') + '</td>' +
        '<td>' + stages + '</td>' +
        '<td><span class="badge bg-info text-dark">' + c.initiatives.length + '</span></td>' +
        '<td>' +
          '<button class="btn btn-sm btn-outline-primary me-1" onclick="editCollege(' + c.id + ')" title="Edit college info"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-sm btn-outline-success me-1" onclick="addInitiative(' + c.id + ')" title="Add initiative"><i class="bi bi-plus"></i></button>' +
          '<button class="btn btn-sm btn-outline-danger" onclick="deleteCollege(' + c.id + ')" title="Delete college"><i class="bi bi-trash"></i></button>' +
        '</td>' +
      '</tr>' +
      // Sub-rows for each initiative
      c.initiatives.map(function(init, idx) {
        return '<tr class="table-light">' +
          '<td></td>' +
          '<td colspan="2"><small><i class="bi bi-arrow-return-right me-1"></i>' + (init.aiProgram || '—') + '</small></td>' +
          '<td><small>' + (init.vendor || '—') + '</small></td>' +
          '<td><small>' + (init.useCase || '—') + '</small></td>' +
          '<td><small class="risk-' + init.riskTier + '">' + (init.riskTier ? 'T' + init.riskTier : '') + '</small></td>' +
          '<td>' +
            '<button class="btn btn-sm btn-outline-secondary me-1" onclick="editInitiative(' + c.id + ',' + idx + ')" title="Edit initiative"><i class="bi bi-pencil"></i></button>' +
            '<button class="btn btn-sm btn-outline-danger btn-xs" onclick="deleteInitiative(' + c.id + ',' + idx + ')" title="Remove initiative"><i class="bi bi-x"></i></button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }).join('');
    document.getElementById('adminCount').textContent = filtered.length + ' colleges, ' +
      filtered.reduce(function(s, c) { return s + c.initiatives.length; }, 0) + ' initiatives';
  }

  document.getElementById('adminSearch').addEventListener('input', renderAdminTable);

  function populateFormDropdowns() {
    var regions = [];
    var vendorNames = [];
    var useCases = [];
    colleges.forEach(function(c) {
      if (c.region && regions.indexOf(c.region) === -1) regions.push(c.region);
      c.initiatives.forEach(function(i) {
        if (i.vendor && vendorNames.indexOf(i.vendor) === -1) vendorNames.push(i.vendor);
        if (i.useCase && useCases.indexOf(i.useCase) === -1) useCases.push(i.useCase);
      });
    });
    regions.sort(); vendorNames.sort(); useCases.sort();
    var stages = ['Deployed', 'Pilot', 'Planning', 'Exploring', 'None Identified'];
    var lifecycles = ['Scale', 'Test', 'Design/Refine'];
    fillSelect('formRegion', regions);
    fillSelect('formInitVendor', vendorNames);
    fillSelect('formInitStage', stages);
    fillSelect('formInitLifecycle', lifecycles);
    fillSelect('formInitUseCase', useCases);
    fillSelect('formInitRiskTier', ['1', '2', '3'], function(v) { return 'Tier ' + v; });
  }

  function fillSelect(id, values, labelFn) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var firstOpt = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(firstOpt);
    values.forEach(function(v) {
      var opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(opt);
    });
  }

  // --- College CRUD ---

  document.getElementById('addNewBtn').addEventListener('click', function() {
    editingCollegeId = null;
    document.getElementById('collegeModalTitle').textContent = 'Add New College';
    document.getElementById('collegeForm').reset();
    new bootstrap.Modal(document.getElementById('collegeModal')).show();
  });

  window.editCollege = function(id) {
    var c = colleges.find(function(x) { return x.id === id; });
    if (!c) return;
    editingCollegeId = id;
    document.getElementById('collegeModalTitle').textContent = 'Edit: ' + c.collegeName;
    document.getElementById('formCollegeName').value = c.collegeName;
    document.getElementById('formDistrict').value = c.district;
    document.getElementById('formRegion').value = c.region;
    document.getElementById('formCioName').value = c.cioName;
    document.getElementById('formCioEmail').value = c.cioEmail;
    document.getElementById('formContactName').value = c.contactName;
    document.getElementById('formContactRole').value = c.contactRole;
    document.getElementById('formContactEmail').value = c.contactEmail;
    document.getElementById('formAiFellow').value = c.aiFellow;
    new bootstrap.Modal(document.getElementById('collegeModal')).show();
  };

  document.getElementById('saveCollege').addEventListener('click', function() {
    var name = document.getElementById('formCollegeName').value.trim();
    if (!name) { alert('College Name is required'); return; }

    if (editingCollegeId) {
      var c = colleges.find(function(x) { return x.id === editingCollegeId; });
      if (c) {
        c.collegeName = name;
        c.district = document.getElementById('formDistrict').value.trim();
        c.region = document.getElementById('formRegion').value;
        c.cioName = document.getElementById('formCioName').value.trim();
        c.cioEmail = document.getElementById('formCioEmail').value.trim();
        c.contactName = document.getElementById('formContactName').value.trim();
        c.contactRole = document.getElementById('formContactRole').value.trim();
        c.contactEmail = document.getElementById('formContactEmail').value.trim();
        c.aiFellow = document.getElementById('formAiFellow').value.trim();
      }
    } else {
      colleges.push({
        id: Math.max(0, Math.max.apply(null, colleges.map(function(c) { return c.id; }))) + 1,
        collegeName: name,
        district: document.getElementById('formDistrict').value.trim(),
        region: document.getElementById('formRegion').value,
        cioName: document.getElementById('formCioName').value.trim(),
        cioEmail: document.getElementById('formCioEmail').value.trim(),
        contactName: document.getElementById('formContactName').value.trim(),
        contactRole: document.getElementById('formContactRole').value.trim(),
        contactEmail: document.getElementById('formContactEmail').value.trim(),
        aiFellow: document.getElementById('formAiFellow').value.trim(),
        initiatives: []
      });
    }
    saveToLocal();
    renderAdminTable();
    bootstrap.Modal.getInstance(document.getElementById('collegeModal')).hide();
    showToast(editingCollegeId ? 'College updated' : 'College added');
    editingCollegeId = null;
  });

  window.deleteCollege = function(id) {
    var c = colleges.find(function(x) { return x.id === id; });
    if (!c) return;
    if (!confirm('Delete "' + c.collegeName + '" and all its initiatives?')) return;
    colleges = colleges.filter(function(x) { return x.id !== id; });
    saveToLocal();
    renderAdminTable();
    showToast('College deleted');
  };

  // --- Initiative CRUD ---

  window.addInitiative = function(collegeId) {
    editingCollegeId = collegeId;
    editingInitiativeIdx = null;
    var c = colleges.find(function(x) { return x.id === collegeId; });
    document.getElementById('initModalTitle').textContent = 'Add Initiative — ' + c.collegeName;
    document.getElementById('initForm').reset();
    new bootstrap.Modal(document.getElementById('initModal')).show();
  };

  window.editInitiative = function(collegeId, idx) {
    var c = colleges.find(function(x) { return x.id === collegeId; });
    if (!c || !c.initiatives[idx]) return;
    editingCollegeId = collegeId;
    editingInitiativeIdx = idx;
    var init = c.initiatives[idx];
    document.getElementById('initModalTitle').textContent = 'Edit Initiative — ' + c.collegeName;
    document.getElementById('formInitProgram').value = init.aiProgram || '';
    document.getElementById('formInitVendor').value = init.vendor || '';
    document.getElementById('formInitUseCase').value = init.useCase || '';
    document.getElementById('formInitStage').value = init.implementationStage || '';
    document.getElementById('formInitLifecycle').value = init.innovationLifecycle || '';
    document.getElementById('formInitRiskTier').value = init.riskTier || '';
    document.getElementById('formInitTargetPop').value = init.targetPopulations || '';
    document.getElementById('formInitV2030').value = init.v2030Outcomes || '';
    document.getElementById('formInitFunding').value = init.fundingStatus || '';
    document.getElementById('formInitNotes').value = init.notes || '';
    new bootstrap.Modal(document.getElementById('initModal')).show();
  };

  document.getElementById('saveInitiative').addEventListener('click', function() {
    var c = colleges.find(function(x) { return x.id === editingCollegeId; });
    if (!c) return;

    var init = {
      id: (editingInitiativeIdx !== null) ? c.initiatives[editingInitiativeIdx].id : c.initiatives.length + 1,
      aiProgram: document.getElementById('formInitProgram').value.trim(),
      vendor: document.getElementById('formInitVendor').value,
      useCase: document.getElementById('formInitUseCase').value,
      implementationStage: document.getElementById('formInitStage').value,
      innovationLifecycle: document.getElementById('formInitLifecycle').value,
      riskTier: parseInt(document.getElementById('formInitRiskTier').value) || 0,
      targetPopulations: document.getElementById('formInitTargetPop').value.trim(),
      v2030Outcomes: document.getElementById('formInitV2030').value.trim(),
      fundingStatus: document.getElementById('formInitFunding').value.trim(),
      notes: document.getElementById('formInitNotes').value.trim()
    };

    if (editingInitiativeIdx !== null) {
      c.initiatives[editingInitiativeIdx] = init;
    } else {
      c.initiatives.push(init);
    }

    saveToLocal();
    renderAdminTable();
    bootstrap.Modal.getInstance(document.getElementById('initModal')).hide();
    showToast(editingInitiativeIdx !== null ? 'Initiative updated' : 'Initiative added');
    editingInitiativeIdx = null;
  });

  window.deleteInitiative = function(collegeId, idx) {
    var c = colleges.find(function(x) { return x.id === collegeId; });
    if (!c || !c.initiatives[idx]) return;
    var init = c.initiatives[idx];
    if (!confirm('Remove "' + (init.aiProgram || init.vendor) + '" from ' + c.collegeName + '?')) return;
    c.initiatives.splice(idx, 1);
    saveToLocal();
    renderAdminTable();
    showToast('Initiative removed');
  };

  // --- Export ---

  document.getElementById('exportBtn').addEventListener('click', function() {
    downloadJSON(colleges, 'colleges.json');
  });

  document.getElementById('exportVendorsBtn').addEventListener('click', function() {
    var vendorMap = {};
    colleges.forEach(function(c) {
      c.initiatives.forEach(function(i) {
        if (i.vendor) {
          if (!vendorMap[i.vendor]) vendorMap[i.vendor] = { name: i.vendor, useCases: [], collegeCount: 0 };
          vendorMap[i.vendor].collegeCount++;
          if (i.useCase && vendorMap[i.vendor].useCases.indexOf(i.useCase) === -1)
            vendorMap[i.vendor].useCases.push(i.useCase);
        }
      });
    });
    var vendorList = Object.keys(vendorMap).sort().map(function(k, i) {
      return { id: i + 1, name: vendorMap[k].name, useCases: vendorMap[k].useCases, collegeCount: vendorMap[k].collegeCount, website: '', notes: '' };
    });
    downloadJSON(vendorList, 'vendors.json');
  });

  document.getElementById('resetBtn').addEventListener('click', async function() {
    if (!confirm('Reset all changes and reload original data from JSON files?')) return;
    localStorage.removeItem('ccc-colleges');
    localStorage.removeItem('ccc-vendors');
    var data = await DataLoader.load();
    colleges = data.colleges;
    renderAdminTable();
    showToast('Data reset to original');
  });

  document.getElementById('importFile').addEventListener('change', function(e) {
    showToast('Import feature coming soon — use JSON export/import for now');
    e.target.value = '';
  });

  function downloadJSON(data, filename) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + filename);
  }

  function showToast(msg) {
    var container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    var toast = document.createElement('div');
    toast.className = 'toast show align-items-center text-bg-success border-0';
    toast.innerHTML = '<div class="d-flex"><div class="toast-body">' + msg + '</div>' +
      '<button class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button></div>';
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  async function sha256(msg) {
    var data = new TextEncoder().encode(msg);
    var hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }
});
