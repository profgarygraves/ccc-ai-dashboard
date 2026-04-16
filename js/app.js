document.addEventListener('DOMContentLoaded', async () => {
  const { colleges, vendors } = await DataLoader.load();

  // State
  let currentView = 'table';
  let currentSort = { field: 'collegeName', asc: true };
  let currentFilters = {};
  let currentPage = 1;
  const perPage = 25;

  // Init
  renderStats();
  populateFilters();
  renderVendorCards();
  applyFiltersAndRender();

  // Search
  document.getElementById('searchInput').addEventListener('input', debounce(e => {
    currentFilters.search = e.target.value;
    currentPage = 1;
    applyFiltersAndRender();
  }, 300));

  // Filter dropdowns
  ['filterRegion', 'filterVendor', 'filterStage', 'filterRisk', 'filterUseCase'].forEach(id => {
    document.getElementById(id).addEventListener('change', e => {
      const key = id.replace('filter', '').toLowerCase();
      const map = { region: 'region', vendor: 'vendor', stage: 'stage', risk: 'riskTier', usecase: 'useCase' };
      currentFilters[map[key]] = e.target.value;
      currentPage = 1;
      applyFiltersAndRender();
    });
  });

  // Clear filters
  document.getElementById('clearFilters').addEventListener('click', () => {
    currentFilters = {};
    document.getElementById('searchInput').value = '';
    ['filterRegion', 'filterVendor', 'filterStage', 'filterRisk', 'filterUseCase'].forEach(id => {
      document.getElementById(id).value = '';
    });
    currentPage = 1;
    applyFiltersAndRender();
  });

  // View toggle
  document.querySelectorAll('.view-toggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-toggle .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      applyFiltersAndRender();
    });
  });

  // Sort headers
  document.querySelectorAll('.data-table thead th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.asc = !currentSort.asc;
      } else {
        currentSort.field = field;
        currentSort.asc = true;
      }
      applyFiltersAndRender();
    });
  });

  function renderStats() {
    const stats = DataLoader.getStats();
    document.getElementById('statInitiatives').textContent = stats.totalInitiatives;
    document.getElementById('statColleges').textContent = stats.totalColleges;
    document.getElementById('statDeployed').textContent = stats.deployed;
    document.getElementById('statVendors').textContent = stats.uniqueVendors;
    document.getElementById('statRegions').textContent = stats.regions;
    document.getElementById('statPilots').textContent = stats.pilots;
  }

  function populateFilters() {
    populateSelect('filterRegion', DataLoader.getUniqueValues('region'));
    populateSelect('filterVendor', DataLoader.getUniqueValues('vendor'));
    populateSelect('filterStage', DataLoader.getUniqueValues('implementationStage'));
    populateSelect('filterRisk', ['1', '2', '3'], v => 'Tier ' + v);
    populateSelect('filterUseCase', DataLoader.getUniqueValues('useCase'));
  }

  function populateSelect(id, values, labelFn) {
    const sel = document.getElementById(id);
    values.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(opt);
    });
  }

  function renderVendorCards() {
    const vendorData = DataLoader.getVendorSummary();
    const container = document.getElementById('vendorCards');
    container.innerHTML = vendorData.map(([name, count]) => `
      <div class="col">
        <div class="vendor-card" role="button" onclick="filterByVendor('${name.replace(/'/g, "\\'")}')">
          <div class="vendor-count">${count}</div>
          <div class="vendor-label">initiatives</div>
          <div class="vendor-name mt-1">${name}</div>
        </div>
      </div>
    `).join('');
  }

  window.filterByVendor = function(vendor) {
    document.getElementById('filterVendor').value = vendor;
    currentFilters.vendor = vendor;
    currentPage = 1;
    applyFiltersAndRender();
    document.getElementById('dataSection').scrollIntoView({ behavior: 'smooth' });
  };

  function applyFiltersAndRender() {
    let filtered = DataLoader.filter(currentFilters);
    filtered = DataLoader.sort(filtered, currentSort.field, currentSort.asc);

    renderActiveFilters();

    const totalPages = Math.ceil(filtered.length / perPage);
    if (currentPage > totalPages) currentPage = 1;
    const start = (currentPage - 1) * perPage;
    const pageData = filtered.slice(start, start + perPage);

    document.getElementById('resultsInfo').textContent =
      'Showing ' + (start + 1) + '–' + Math.min(start + perPage, filtered.length) + ' of ' + filtered.length + ' colleges';

    if (currentView === 'table') {
      document.getElementById('tableView').style.display = 'block';
      document.getElementById('cardView').style.display = 'none';
      renderTable(pageData);
    } else {
      document.getElementById('tableView').style.display = 'none';
      document.getElementById('cardView').style.display = 'block';
      renderCards(pageData);
    }

    renderPagination(filtered.length, totalPages);
    updateSortHeaders();
  }

  function renderActiveFilters() {
    const container = document.getElementById('activeFilters');
    const labels = {
      search: 'Search', region: 'Region', vendor: 'Vendor',
      stage: 'Stage', riskTier: 'Risk Tier', useCase: 'Use Case'
    };
    const active = Object.entries(currentFilters).filter(([_, v]) => v);
    if (active.length === 0) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = active.map(([key, val]) =>
      '<span class="filter-badge">' + (labels[key] || key) + ': ' + val +
        ' <button class="btn-close btn-close-white btn-sm" onclick="removeFilter(\'' + key + '\')"></button>' +
      '</span>'
    ).join('');
  }

  window.removeFilter = function(key) {
    delete currentFilters[key];
    const map = { region: 'filterRegion', vendor: 'filterVendor', stage: 'filterStage', riskTier: 'filterRisk', useCase: 'filterUseCase', search: null };
    if (map[key]) document.getElementById(map[key]).value = '';
    if (key === 'search') document.getElementById('searchInput').value = '';
    currentPage = 1;
    applyFiltersAndRender();
  };

  function renderTable(data) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = data.map(c => {
      const vendors = [...new Set(c.initiatives.map(i => i.vendor).filter(Boolean))].join(', ');
      const stages = c.initiatives.map(i => stageBadge(i.implementationStage)).join(' ');
      const risks = [...new Set(c.initiatives.map(i => i.riskTier).filter(Boolean))];
      const riskDisplay = risks.map(r => '<span class="risk-' + r + '">T' + r + '</span>').join(' ');
      const programs = c.initiatives.map(i => i.aiProgram).filter(Boolean).join('; ');
      return '<tr onclick="showDetail(' + c.id + ')">' +
        '<td><strong>' + c.collegeName + '</strong></td>' +
        '<td>' + c.district + '</td>' +
        '<td>' + c.region + '</td>' +
        '<td>' + vendors + '</td>' +
        '<td><span class="badge bg-info text-dark">' + c.initiatives.length + '</span></td>' +
        '<td>' + stages + '</td>' +
        '<td>' + riskDisplay + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderCards(data) {
    const container = document.getElementById('cardView');
    container.innerHTML = '<div class="row g-3">' + data.map(c => {
      const vendors = [...new Set(c.initiatives.map(i => i.vendor).filter(Boolean))];
      const stages = c.initiatives.map(i => stageBadge(i.implementationStage)).join(' ');
      return '<div class="col-md-4 col-lg-3">' +
        '<div class="college-card" onclick="showDetail(' + c.id + ')">' +
          '<div class="d-flex justify-content-between align-items-start">' +
            '<div class="college-name">' + c.collegeName + '</div>' +
            '<span class="badge bg-info text-dark">' + c.initiatives.length + '</span>' +
          '</div>' +
          '<div class="college-district">' + c.district + '</div>' +
          '<div class="mt-2">' + stages + '</div>' +
          '<div class="mt-2"><small class="text-muted">' + vendors.join(', ') + '</small></div>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';
  }

  function renderPagination(total, totalPages) {
    const container = document.getElementById('pagination');
    if (totalPages <= 1) { container.innerHTML = ''; return; }
    let html = '<ul class="pagination pagination-sm justify-content-center mb-0">';
    html += '<li class="page-item ' + (currentPage === 1 ? 'disabled' : '') + '">' +
      '<a class="page-link" href="#" onclick="goToPage(' + (currentPage - 1) + '); return false;">&laquo;</a></li>';
    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7 && i > 2 && i < totalPages - 1 && Math.abs(i - currentPage) > 1) {
        if (i === 3 || i === totalPages - 2) html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        continue;
      }
      html += '<li class="page-item ' + (i === currentPage ? 'active' : '') + '">' +
        '<a class="page-link" href="#" onclick="goToPage(' + i + '); return false;">' + i + '</a></li>';
    }
    html += '<li class="page-item ' + (currentPage === totalPages ? 'disabled' : '') + '">' +
      '<a class="page-link" href="#" onclick="goToPage(' + (currentPage + 1) + '); return false;">&raquo;</a></li>';
    html += '</ul>';
    container.innerHTML = html;
  }

  window.goToPage = function(page) {
    currentPage = page;
    applyFiltersAndRender();
    document.getElementById('dataSection').scrollIntoView({ behavior: 'smooth' });
  };

  function updateSortHeaders() {
    document.querySelectorAll('.data-table thead th[data-sort]').forEach(th => {
      const icon = th.querySelector('.sort-icon');
      th.classList.remove('sorted');
      if (th.dataset.sort === currentSort.field) {
        th.classList.add('sorted');
        icon.textContent = currentSort.asc ? ' \u25B2' : ' \u25BC';
      } else {
        icon.textContent = ' \u25B4';
      }
    });
  }

  window.showDetail = function(id) {
    const c = colleges.find(x => x.id === id);
    if (!c) return;
    const modal = document.getElementById('detailModal');
    document.getElementById('modalTitle').textContent = c.collegeName;

    // Build initiatives section
    const initiativesHtml = c.initiatives.map((i, idx) => {
      return '<div class="' + (idx > 0 ? 'border-top pt-3 mt-3' : '') + '">' +
        '<div class="d-flex justify-content-between align-items-center mb-2">' +
          '<h6 class="mb-0">' + (i.aiProgram || 'Initiative ' + (idx + 1)) + '</h6>' +
          '<span>' + stageBadge(i.implementationStage) + ' <span class="def-trigger" data-def="stage">?</span></span>' +
        '</div>' +
        '<div class="row g-2">' +
          '<div class="col-md-6">' +
            '<div class="detail-label">Vendor / Partner</div>' +
            '<div class="detail-value">' + (i.vendor || '—') + '</div>' +
          '</div>' +
          '<div class="col-md-6">' +
            '<div class="detail-label">Use Case</div>' +
            '<div class="detail-value">' + (i.useCase || '—') + '</div>' +
          '</div>' +
          '<div class="col-md-4">' +
            '<div class="detail-label">Innovation Lifecycle <span class="def-trigger" data-def="lifecycle">?</span></div>' +
            '<div class="detail-value">' + (i.innovationLifecycle || '—') + '</div>' +
          '</div>' +
          '<div class="col-md-4">' +
            '<div class="detail-label">Risk Tier <span class="def-trigger" data-def="risk">?</span></div>' +
            '<div class="detail-value"><span class="risk-' + i.riskTier + '">' + (i.riskTier ? 'Tier ' + i.riskTier : '—') + '</span></div>' +
          '</div>' +
          '<div class="col-md-4">' +
            '<div class="detail-label">Funding</div>' +
            '<div class="detail-value">' + (i.fundingStatus || '—') + '</div>' +
          '</div>' +
          '<div class="col-md-6">' +
            '<div class="detail-label">Target Populations</div>' +
            '<div class="detail-value">' + (i.targetPopulations || '—') + '</div>' +
          '</div>' +
          '<div class="col-md-6">' +
            '<div class="detail-label">V2030 Outcomes <span class="def-trigger" data-def="v2030">?</span></div>' +
            '<div class="detail-value">' + (i.v2030Outcomes || '—') + '</div>' +
          '</div>' +
          (i.notes ? '<div class="col-12"><div class="detail-label">Notes</div>' +
            '<div class="detail-value" style="background:#f8f9fa;padding:0.75rem;border-radius:8px;font-size:0.85rem;">' + i.notes + '</div></div>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    document.getElementById('modalBody').innerHTML =
      '<div class="row g-3 mb-3">' +
        '<div class="col-md-4">' +
          '<div class="detail-label">District</div>' +
          '<div class="detail-value">' + (c.district || '—') + '</div>' +
        '</div>' +
        '<div class="col-md-4">' +
          '<div class="detail-label">Region</div>' +
          '<div class="detail-value">' + (c.region || '—') + '</div>' +
        '</div>' +
        '<div class="col-md-4">' +
          '<div class="detail-label">AI Fellow</div>' +
          '<div class="detail-value">' + (c.aiFellow || '—') + '</div>' +
        '</div>' +
        '<div class="col-md-6">' +
          '<div class="detail-label">CIO / IT Director</div>' +
          '<div class="detail-value">' + (c.cioName || '—') +
            (c.cioEmail ? '<br><a href="mailto:' + c.cioEmail + '">' + c.cioEmail + '</a>' : '') + '</div>' +
        '</div>' +
        '<div class="col-md-6">' +
          '<div class="detail-label">Program Contact</div>' +
          '<div class="detail-value">' + (c.contactName || '—') +
            (c.contactRole ? '<br><small class="text-muted">' + c.contactRole + '</small>' : '') +
            (c.contactEmail ? '<br><a href="mailto:' + c.contactEmail + '">' + c.contactEmail + '</a>' : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<h6 class="text-muted text-uppercase small mb-3 border-top pt-3">' +
        '<i class="bi bi-cpu me-1"></i>AI Initiatives (' + c.initiatives.length + ')</h6>' +
      initiativesHtml;

    new bootstrap.Modal(modal).show();
  };

  function stageBadge(stage) {
    if (!stage) return '';
    var cls = { 'Deployed': 'badge-deployed', 'Pilot': 'badge-pilot', 'Planning': 'badge-planning', 'Exploring': 'badge-exploring' }[stage] || 'bg-secondary';
    return '<span class="badge ' + cls + '">' + stage + '</span>';
  }

  function debounce(fn, ms) {
    let t;
    return function() { const args = arguments; clearTimeout(t); t = setTimeout(function() { fn.apply(null, args); }, ms); };
  }
});
