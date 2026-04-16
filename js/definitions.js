// Definitions from CCC Agentic AI Landscape Legend & Guide
const DEFINITIONS = {
  stage: {
    title: 'Implementation Stage',
    rows: [
      ['Deployed', 'Program live and operational', 'Confirm contact. Document outcomes. Add to catalog.'],
      ['Pilot', 'Active limited deployment / test', 'Follow up for outcomes data. Identify champion.'],
      ['Planning', 'Formally planning to implement', 'Identify readiness gaps. Connect to vendor.'],
      ['Exploring', 'Early-stage interest or research', 'Surface via changemaker survey. Provide catalog access.'],
      ['None Identified', 'No agentic AI activity found', 'Prioritize for needs assessment outreach.']
    ],
    headers: ['Stage', 'Definition', 'Action Required']
  },
  risk: {
    title: 'Risk Tier',
    rows: [
      ['Tier 1 — Low', 'Productivity / faculty tools. No direct student-gating decisions.', 'FERPA review. Student disclosure. Faculty opt-in.'],
      ['Tier 2 — Medium', 'Student-facing advisory tools. Recommendations, not binding.', 'FERPA review. DPA required. Board notification. Student disclosure.'],
      ['Tier 3 — High', 'Autonomous access-gating. Affects enrollment, aid, or access.', 'Full HUMANS audit. Board resolution. Appeals process BEFORE go-live. Bias audit Year 1.']
    ],
    headers: ['Tier', 'Definition', 'Governance Requirement']
  },
  lifecycle: {
    title: 'Innovation Lifecycle (V2030)',
    rows: [
      ['Design/Refine', 'Early design. Concept being developed or refined.', ''],
      ['Test', 'Active testing or pilot with limited cohort.', ''],
      ['Scale', 'Proven and expanding to broader population or system.', '']
    ],
    headers: ['Phase', 'Definition', '']
  },
  v2030: {
    title: 'Vision 2030 Outcomes',
    rows: [
      ['Outcome 1', 'Students are prepared for success upon entering a California Community College.', ''],
      ['Outcome 2', 'Students obtain the knowledge, skills, and competencies needed for success.', ''],
      ['Outcome 3', 'Students successfully complete pathways leading to degrees, certificates, and transfers.', ''],
      ['Outcome 5', 'Community colleges are financially sustainable and well-managed.', '']
    ],
    headers: ['Outcome', 'Description', '']
  },
  humans: {
    title: 'HUMANS Framework',
    rows: [
      ['H — Human-Centered', 'Tool serves human needs; humans in meaningful control', ''],
      ['U — Use-case Transparent', 'Clear what tool does, what data it uses, what its limits are', ''],
      ['M — Measurable', 'Outcomes tracked and reported honestly', ''],
      ['A — Accountable', 'Clear human accountable for tool performance and impacts', ''],
      ['N — Non-Bias', 'Evaluated for disparate impact on protected groups', ''],
      ['S — Safe', 'Safeguards in place including student appeals processes', '']
    ],
    headers: ['Principle', 'Criteria', '']
  }
};

// Initialize popovers on all definition triggers
document.addEventListener('DOMContentLoaded', () => {
  initDefinitionPopovers();

  // Re-init when modals open (for triggers inside modals)
  document.addEventListener('shown.bs.modal', () => {
    setTimeout(initDefinitionPopovers, 100);
  });
});

function initDefinitionPopovers() {
  document.querySelectorAll('.def-trigger:not([data-def-init])').forEach(trigger => {
    const defKey = trigger.dataset.def;
    const def = DEFINITIONS[defKey];
    if (!def) return;

    // Build table HTML
    const hasCol3 = def.rows.some(r => r[2]);
    let tableHtml = '<table class="table def-table mb-0">';
    if (def.headers) {
      tableHtml += '<thead><tr>';
      tableHtml += '<th>' + def.headers[0] + '</th>';
      tableHtml += '<th>' + def.headers[1] + '</th>';
      if (hasCol3) tableHtml += '<th>' + def.headers[2] + '</th>';
      tableHtml += '</tr></thead>';
    }
    tableHtml += '<tbody>';
    def.rows.forEach(row => {
      tableHtml += '<tr>';
      tableHtml += '<td><strong>' + row[0] + '</strong></td>';
      tableHtml += '<td>' + row[1] + '</td>';
      if (hasCol3) tableHtml += '<td>' + row[2] + '</td>';
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';

    new bootstrap.Popover(trigger, {
      title: def.title,
      content: tableHtml,
      html: true,
      trigger: 'click',
      placement: 'bottom',
      customClass: 'def-popover',
      sanitize: false
    });

    trigger.setAttribute('data-def-init', 'true');
  });

  // Close popovers when clicking elsewhere
  document.addEventListener('click', e => {
    if (!e.target.closest('.def-trigger') && !e.target.closest('.popover')) {
      document.querySelectorAll('.def-trigger').forEach(t => {
        const popover = bootstrap.Popover.getInstance(t);
        if (popover) popover.hide();
      });
    }
  });
}

// Expose for use in detail modals
window.defTriggerHtml = function(defKey, label) {
  return label + ' <span class="def-trigger" data-def="' + defKey + '">?</span>';
};
