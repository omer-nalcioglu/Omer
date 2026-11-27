// Web önizlemesi için tarayıcı deposu.
const Storage = {
  async getItem(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  async setItem(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* yok say */ } },
  async removeItem(k: string) { try { localStorage.removeItem(k); } catch { /* yok say */ } },
};
export default Storage;
