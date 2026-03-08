function id() {
  try {
    return require('crypto').randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

const store = {
  beds: [],
  patients: [],
  waitlist: [],
};

module.exports = {
  id,
  store
};
