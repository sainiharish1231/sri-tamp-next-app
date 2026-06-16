// storage/asyncStorage.js (नया file बनाएं)
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AsyncStorageService = {
  // User data store करने के लिए
  setUser: async (userData) => {
    try {
      const jsonValue = JSON.stringify(userData);
      await AsyncStorage.setItem("@user", jsonValue);
    } catch (e) {
      console.error("Error saving user data:", e);
    }
  },

  getUser: async () => {
    try {
      const jsonValue = await AsyncStorage.getItem("@user");
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (e) {
      console.error("Error reading user data:", e);
      return null;
    }
  },

  removeUser: async () => {
    try {
      await AsyncStorage.removeItem("@user");
    } catch (e) {
      console.error("Error removing user data:", e);
    }
  },

  // Token को अलग से store करने के लिए
  setToken: async (token) => {
    try {
      await AsyncStorage.setItem("@auth_token", token);
    } catch (e) {
      console.error("Error saving token:", e);
    }
  },

  getToken: async () => {
    try {
      return await AsyncStorage.getItem("@auth_token");
    } catch (e) {
      console.error("Error getting token:", e);
      return null;
    }
  },

  clearAuth: async () => {
    try {
      await AsyncStorage.multiRemove(["@user", "@auth_token"]);
    } catch (e) {
      console.error("Error clearing auth data:", e);
    }
  },
};
