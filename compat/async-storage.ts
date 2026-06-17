const memoryStore = new Map<string, string>();

const hasLocalStorage = () => typeof window !== "undefined" && !!window.localStorage;

const AsyncStorage = {
  async getItem(key: string) {
    return hasLocalStorage() ? window.localStorage.getItem(key) : memoryStore.get(key) ?? null;
  },
  async setItem(key: string, value: string) {
    if (hasLocalStorage()) window.localStorage.setItem(key, value);
    else memoryStore.set(key, value);
  },
  async removeItem(key: string) {
    if (hasLocalStorage()) window.localStorage.removeItem(key);
    else memoryStore.delete(key);
  },
  async clear() {
    if (hasLocalStorage()) window.localStorage.clear();
    else memoryStore.clear();
  },
  async multiRemove(keys: string[]) {
    await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
  }
};

export default AsyncStorage;
