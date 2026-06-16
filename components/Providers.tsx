"use client";

import { useEffect } from "react";
import Toast from "react-native-toast-message";
import { AppAlertProvider } from "@/components/AppAlertProvider";
import { AppProvider } from "@/context/AppContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { useAuthStore } from "@/store/auth.store";

export default function Providers({ children }: { children: React.ReactNode }) {
  const loadSession = useAuthStore((state) => state.loadSession);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  return (
    <LanguageProvider>
      <AppProvider>
        <AppAlertProvider>
          {children}
          <Toast position="top" topOffset={56} />
        </AppAlertProvider>
      </AppProvider>
    </LanguageProvider>
  );
}
