const DataLoader = {
  colleges: [],
  vendors: [],

  async load() {
    const [collegesRes, vendorsRes] = await Promise.all([
      fetch('data/colleges.json'),
      fetch('data/vendors.json')
    ]);
    this.colleges = await collegesRes.json();
    this.vendors = await vendorsRes.json();
    // Normalize whitespace
    this.colleges.forEach(c => {
      c.initiatives.forEach(i => {
        if (i.implementationStage) i.implementationStage = i.implementationStage.trim();
      });
    });
    return { colleges: this.colleges, vendors: this.vendors };
  },

  // Get unique values across all initiatives
  getUniqueValues(field) {
    const vals = new Set();
    this.colleges.forEach(c => {
      if (['region', 'district'].includes(field)) {
        if (c[field] && c[field].toString().trim()) vals.add(c[field].toString().trim());
      } else {
        c.initiatives.forEach(i => {
          if (i[field] && i[field].toString().trim()) vals.add(i[field].toString().trim());
        });
      }
    });
    return [...vals].sort();
  },

  getStats() {
    const totalColleges = this.colleges.length;
    const totalInitiatives = this.colleges.reduce((sum, c) => sum + c.initiatives.length, 0);
    const deployed = this.colleges.filter(c => c.initiatives.some(i => i.implementationStage === 'Deployed')).length;
    const pilots = this.colleges.filter(c => c.initiatives.some(i => i.implementationStage === 'Pilot')).length;
    const uniqueVendors = new Set();
    this.colleges.forEach(c => c.initiatives.forEach(i => { if (i.vendor) uniqueVendors.add(i.vendor); }));
    const regions = new Set(this.colleges.map(c => c.region).filter(Boolean)).size;
    return { totalColleges, totalInitiatives, deployed, pilots, uniqueVendors: uniqueVendors.size, regions };
  },

  // Get vendor summary
  getVendorSummary() {
    const vendorCounts = {};
    this.colleges.forEach(c => {
      c.initiatives.forEach(i => {
        if (i.vendor) {
          vendorCounts[i.vendor] = (vendorCounts[i.vendor] || 0) + 1;
        }
      });
    });
    return Object.entries(vendorCounts).sort((a, b) => b[1] - a[1]);
  },

  // Filter colleges — a college matches if ANY of its initiatives match
  filter(criteria) {
    return this.colleges.filter(c => {
      if (criteria.search) {
        const s = criteria.search.toLowerCase();
        const collegeText = [c.collegeName, c.district, c.region].join(' ').toLowerCase();
        const initiativeText = c.initiatives.map(i =>
          [i.vendor, i.aiProgram, i.useCase].join(' ')
        ).join(' ').toLowerCase();
        if (!collegeText.includes(s) && !initiativeText.includes(s)) return false;
      }
      if (criteria.region && c.region !== criteria.region) return false;
      if (criteria.vendor && !c.initiatives.some(i => i.vendor === criteria.vendor)) return false;
      if (criteria.stage && !c.initiatives.some(i => i.implementationStage === criteria.stage)) return false;
      if (criteria.riskTier && !c.initiatives.some(i => i.riskTier === parseInt(criteria.riskTier))) return false;
      if (criteria.useCase && !c.initiatives.some(i => i.useCase === criteria.useCase)) return false;
      return true;
    });
  },

  sort(data, field, ascending = true) {
    return [...data].sort((a, b) => {
      let va, vb;
      if (['collegeName', 'district', 'region'].includes(field)) {
        va = a[field] || '';
        vb = b[field] || '';
      } else {
        // Sort by first initiative's field value
        va = (a.initiatives[0] && a.initiatives[0][field]) || '';
        vb = (b.initiatives[0] && b.initiatives[0][field]) || '';
      }
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return ascending ? -1 : 1;
      if (va > vb) return ascending ? 1 : -1;
      return 0;
    });
  }
};
