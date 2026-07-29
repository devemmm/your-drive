export const PROVINCE_NAMES = {
  KG: "Kigali",
  NP: "Northern Province",
  SP: "Southern Province",
  EP: "Eastern Province",
  WP: "Western Province",
};

export const RWANDAN_CITIES = [
  // Kigali
  { name: "Kigali", province: "KG" },
  { name: "Gasabo", province: "KG" },
  { name: "Kicukiro", province: "KG" },
  { name: "Nyarugenge", province: "KG" },

  // Northern Province
  { name: "Musanze", province: "NP" },
  { name: "Ruhengeri", province: "NP" },
  { name: "Gicumbi", province: "NP" },
  { name: "Rulindo", province: "NP" },
  { name: "Burera", province: "NP" },
  { name: "Gakenke", province: "NP" },
  { name: "Nyagatare", province: "NP" },
  { name: "Gatsibo", province: "NP" },

  // Southern Province
  { name: "Huye", province: "SP" },
  { name: "Butare", province: "SP" },
  { name: "Muhanga", province: "SP" },
  { name: "Gitarama", province: "SP" },
  { name: "Nyanza", province: "SP" },
  { name: "Nyamagabe", province: "SP" },
  { name: "Nyaruguru", province: "SP" },
  { name: "Gisagara", province: "SP" },
  { name: "Kamonyi", province: "SP" },
  { name: "Ruhango", province: "SP" },

  // Eastern Province
  { name: "Rwamagana", province: "EP" },
  { name: "Kayonza", province: "EP" },
  { name: "Ngoma", province: "EP" },
  { name: "Bugesera", province: "EP" },
  { name: "Kirehe", province: "EP" },
  { name: "Nyagatare", province: "EP" },
  { name: "Gatsibo", province: "EP" },

  // Western Province
  { name: "Rubavu", province: "WP" },
  { name: "Gisenyi", province: "WP" },
  { name: "Rusizi", province: "WP" },
  { name: "Cyangugu", province: "WP" },
  { name: "Karongi", province: "WP" },
  { name: "Rutsiro", province: "WP" },
  { name: "Nyabihu", province: "WP" },
  { name: "Ngororero", province: "WP" },
  { name: "Nyamasheke", province: "WP" },
].sort((a, b) => a.name.localeCompare(b.name));

// Keep CANADIAN_CITIES for backward compatibility but mark as deprecated
export const CANADIAN_CITIES = RWANDAN_CITIES;
