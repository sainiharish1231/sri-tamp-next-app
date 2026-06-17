import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@/types";

interface AppContextType {
  user: User | null;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (user) {
      saveData();
    }
  }, []);

  const loadData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("user");

      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const logout = async () => {
    setUser(null);

    await AsyncStorage.clear();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
