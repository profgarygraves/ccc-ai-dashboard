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
    // Normalize whitespace in stage values
    this.colleges.forEach(c => {
      if (c.implementationStage) c.implementationStage = c.implementationStage.trim();
    });
    return { colleges: this.colleges, vendors: this.vendors };
  },

  getUniqueValues(field) {
    const vals = new Set();
    this.colleges.forEach(c => {
      if (c[field] && c[field].toString().trim()) vals.add(c[field].toString().trim());
    });
    return [...vals].sort();
  },

  getStats() {
    const uniqueColleges = new Set(this.colleges.map(c => c.collegeName)).size;
    const deployed = this.colleges.filter(c => c.implementationStage === 'Deployed').length;
    const uniqueVendors = new Set(this.colleges.map(c => c.vendor).filter(Boolean)).size;
    const regions = new Set(this.colleges.map(c => c.region).filter(Boolean)).size;
    const pilots = this.colleges.filter(c => c.implementationStage === 'Pilot').length;
    const totalInitiatives = this.colleges.length;
    return { uniqueColleges, deployed, uniqueVendors, regions, pilots, totalInitiatives };
  },

  filter(criteria) {
    return this.colleges.filter(c => {
      if (criteria.search) {
        const s = criteria.search.toLowerCase();
        const searchable = [c.collegeName, c.district, c.vendor, c.aiProgram, c.useCase, c.region].join(' ').toLowerCase();
        if (!searchable.includes(s)) return false;
      }
      if (criteria.region && c.region !== criteria.region) return false;
      if (criteria.vendor && c.vendor !== criteria.vendor) return false;
      if (criteria.stage && c.implementationStage !== criteria.stage) return false;
      if (criteria.riskTier && c.riskTier !== parseInt(criteria.riskTier)) return false;
      if (criteria.useCase && c.useCase !== criteria.useCase) return false;
      return true;
    });
  },

  sort(data, field, ascending = true) {
    return [...data].sort((a, b) => {
      let va = a[field] || '';
      let vb = b[field] || '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return ascending ? -1 : 1;
      if (va > vb) return ascending ? 1 : -1;
      return 0;
    });
  }
};
