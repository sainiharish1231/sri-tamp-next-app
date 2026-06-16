"use client";

import { colors } from "@/colors";
import { useLanguage } from "@/hooks/use-language";
import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

const nativeAlert = typeof window !== "undefined" && window.alert ? window.alert.bind(window) : () => {};

const getAlertTone = (title: string) => {
  const normalized = title.toLowerCase();
  if (normalized.includes("success") || normalized.includes("deleted")) {
    return {
      color: colors.green,
      background: colors.greenLight,
      icon: CheckCircle,
    };
  }
  if (
    normalized.includes("warning") ||
    normalized.includes("remove") ||
    normalized.includes("delete") ||
    normalized.includes("logout")
  ) {
    return {
      color: colors.yellow,
      background: colors.yellowLight,
      icon: AlertCircle,
    };
  }
  if (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("invalid") ||
    normalized.includes("missing")
  ) {
    return {
      color: colors.red,
      background: colors.redLight,
      icon: XCircle,
    };
  }
  return {
    color: colors.primary,
    background: colors.primaryFaint,
    icon: Info,
  };
};

export function AppAlertProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const tone = useMemo(
    () => getAlertTone(alertState?.title || ""),
    [alertState?.title],
  );

  const dismiss = () => setAlertState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalAlert = window.alert;
    window.alert = (
      title: string,
      message?: string,
      buttons?: AlertButton[],
    ) => {
      setAlertState({
        title,
        message,
        buttons: buttons?.length
          ? buttons
          : [{ text: t("ok"), style: "default" }],
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [t]);

  const handleButtonPress = (button: AlertButton) => {
    dismiss();
    button.onPress?.();
  };

  const getTranslationKeys = (value: string) => {
    const trimmed = value.trim();
    const normalized = trimmed
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    return [trimmed, normalized, normalized.replace(/_/g, "-")].filter(Boolean);
  };

  const translateCommon = (value?: string) => {
    if (!value) return t("ok");

    for (const key of getTranslationKeys(value)) {
      const translated = t(key);
      if (translated !== key) return translated;
    }

    return value;
  };

  if (!alertState) return <>{children}</>;

  const IconComponent = tone.icon;

  return (
    <>
      {children}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45">
        <div className="bg-white rounded-lg border border-gray-200 shadow-2xl w-full max-w-sm max-h-[82%] flex flex-col">
          {/* Icon Section */}
          <div
            className="flex items-center justify-center w-12 h-12 rounded-lg mx-auto pt-5"
            style={{ backgroundColor: tone.background }}
          >
            <IconComponent size={28} color={tone.color} />
          </div>

          {/* Content Section */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <h2 className="text-lg font-bold text-gray-900 text-center">
              {translateCommon(alertState.title)}
            </h2>
            {alertState.message && (
              <p className="mt-2.5 text-sm text-gray-600 text-center leading-relaxed">
                {translateCommon(alertState.message)}
              </p>
            )}
          </div>

          {/* Actions Section */}
          <div className="flex gap-2.5 px-5 pb-5">
            {alertState.buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";

              return (
                <button
                  key={`${button.text || "action"}-${index}`}
                  onClick={() => handleButtonPress(button)}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-semibold transition-colors ${
                    isCancel
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : isDestructive
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {translateCommon(button.text)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
