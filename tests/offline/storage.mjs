export const records = new Map();
export let failNextWrite = false;
export function failWrite() { failNextWrite = true; }
function check() {
  if (failNextWrite) { failNextWrite = false; throw new Error("Disk full"); }
}
export default {
  async getItem(key) { return records.get(key) ?? null; },
  async setItem(key, value) { check(); records.set(key, value); },
  async removeItem(key) { check(); records.delete(key); },
  async multiSet(entries) { check(); for (const [key, value] of entries) records.set(key, value); },
  async multiRemove(keys) { check(); for (const key of keys) records.delete(key); },
};
