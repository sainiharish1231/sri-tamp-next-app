import { colors } from "@/colors";
import { useLanguage } from "@/hooks/use-language";
import React, { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertButton,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  webStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getDeviceMetrics } from "@/utils/responsive";

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
};

const { isXs: isSmallDevice } = getDeviceMetrics();

const nativeAlert = Alert.alert.bind(Alert);

const getTranslationKeys = (value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return [trimmed, normalized, normalized.replace(/_/g, "-")].filter(Boolean);
};

const getAlertTone = (title: string) => {
  const normalized = title.toLowerCase();
  if (normalized.includes("success") || normalized.includes("deleted")) {
    return {
      color: colors.green,
      background: colors.greenLight,
      icon: "checkmark-circle" as const,
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
      icon: "alert-circle" as const,
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
      icon: "close-circle" as const,
    };
  }
  return {
    color: colors.primary,
    background: colors.primaryFaint,
    icon: "information-circle" as const,
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
    Alert.alert = (
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
      Alert.alert = nativeAlert;
    };
  }, [t]);

  const handleButtonPress = (button: AlertButton) => {
    dismiss();
    button.onPress?.();
  };

  const cardStyle = {
    ...(webStyle(styles.card) || {}),
    border: `1px solid ${colors.gray200}`,
    borderRadius: 8,
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.16)",
  };

  const translateCommon = (value?: string) => {
    if (!value) return t("ok");

    for (const key of getTranslationKeys(value)) {
      const translated = t(key);
      if (translated !== key) return translated;
    }

    return value;
  };

  return (
    <>
      {children}
      <Modal
        visible={!!alertState}
        transparent
        animationType="fade"
        onRequestClose={dismiss}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
          <div style={cardStyle}>
            <div style={webStyle([styles.iconWrap, { backgroundColor: tone.background }])}>
              <Ionicons name={tone.icon} size={28} color={tone.color} />
            </div>

            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageContent}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
            >
              <span style={webStyle(styles.title)}>
                {translateCommon(alertState?.title)}
              </span>
              {alertState?.message ? (
                <span style={webStyle(styles.message)}>
                  {translateCommon(alertState.message)}
                </span>
              ) : null}
            </ScrollView>

            <div style={webStyle(styles.actions)}>
              {alertState?.buttons.map((button, index) => {
                const isCancel = button.style === "cancel";
                const isDestructive = button.style === "destructive";

                return (
                  <Pressable
                    key={`${button.text || "action"}-${index}`}
                    style={[
                      styles.actionButton,
                      isCancel && styles.cancelButton,
                      isDestructive && styles.destructiveButton,
                    ]}
                    onPress={() => handleButtonPress(button)}
                  >
                    <span
                      style={webStyle([
                        styles.actionText,
                        isCancel && styles.cancelText,
                        isDestructive && styles.destructiveText,
                      ])}
                    >
                      {translateCommon(button.text)}
                    </span>
                  </Pressable>
                );
              })}
            </div>
          </div>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 14 : 20,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  card: {
    width: "100%",
    maxWidth: isSmallDevice ? 340 : 420,
    maxHeight: "82%",
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: isSmallDevice ? 14 : 20,
    flexDirection: "column",
    alignItems: "stretch",
    gap: 0,
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    width: isSmallDevice ? 46 : 54,
    height: isSmallDevice ? 46 : 54,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  messageScroll: {
    maxHeight: 260,
  },
  messageContent: {
    paddingBottom: 4,
  },
  title: {
    fontSize: isSmallDevice ? 17 : 19,
    fontWeight: "800",
    color: colors.gray900,
    textAlign: "center",
  },
  message: {
    marginTop: 10,
    fontSize: isSmallDevice ? 13 : 14,
    lineHeight: isSmallDevice ? 19 : 21,
    color: colors.gray600,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: isSmallDevice ? 7 : 10,
    marginTop: isSmallDevice ? 14 : 20,
  },
  actionButton: {
    flex: 1,
    minHeight: isSmallDevice ? 40 : 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
  },
  cancelButton: {
    backgroundColor: colors.gray100,
  },
  destructiveButton: {
    backgroundColor: colors.redLight,
  },
  actionText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  cancelText: {
    color: colors.gray700,
  },
  destructiveText: {
    color: colors.red,
  },
});
