function id() {
  // TODO: 返回唯一字符串，例如用 crypto.randomUUID() 或 Date.now() + 随机
  return '';
}

const store = {
  beds: [],
  // 后续会加: patients: [], waitlist: []
};

module.exports = {
  id,
  store
};
