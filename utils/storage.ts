import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  APP_LANG: "app-language",
  EMPLOYEES: "employees",
  ATTENDANCE: "attendance",
  EXPENSES: "expenses",
  SALARIES: "salaries",
};

// Storing data
export const setData = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value);
    console.log("Data stored successfully!");
  } catch (e) {
    console.error("Error storing data:", e);
  }
};

// Retrieving data
export const getData = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {
    console.error("Error retrieving data:", e);
  }
  return null;
};

// Removing data
export const removeData = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key);
    console.log("Data removed successfully!");
  } catch (e) {
    console.error("Error removing data:", e);
  }
};

export const storage = {
  async getLanguage(): Promise<{ language: string; data: any } | null> {
    try {
      const langDataString = await getData(KEYS.APP_LANG);

      if (!langDataString) return null;

      return JSON.parse(langDataString);
    } catch {
      return null;
    }
  },
  async setLanguage(langData: { language: string; data: any }): Promise<void> {
    return setData(KEYS.APP_LANG, JSON.stringify(langData));
  },
};
