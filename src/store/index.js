/**
 * In-memory store - replace with DB (e.g. PostgreSQL, MongoDB) for production
 */
function id() {
  try {
    return require('crypto').randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

const store = {
  patients: [],
  beds: [],
  waitlist: []
};

module.exports = {
  id,
  store
};
