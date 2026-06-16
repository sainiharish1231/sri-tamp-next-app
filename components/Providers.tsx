"use client";


import { Toaster } from "sonner";
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
          <Toaster position="top-right" />
        </AppAlertProvider>
      </AppProvider>
    </LanguageProvider>
  );
}
