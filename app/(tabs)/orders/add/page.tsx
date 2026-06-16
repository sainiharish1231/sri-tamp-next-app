import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";
"use client";

import { useLocalSearchParams, useRouter } from "next/navigation";
import { MaterialCommunityIcons as Icon } from "lucide-react";
import CreateOrderForm from "@/components/OrderForm";
import { colors } from "@/colors";
import { useLanguage } from "@/hooks/use-language";

export default function NewOrderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    partyId?: string;
    returnTo?: string;
  }>();
  const { t } = useLanguage();
  const backPath =
    params.returnTo === "party" && params.partyId
      ? (`/parties/partiesDigital/${params.partyId}` as any)
      : params.returnTo === "transaction"
        ? ("/transaction" as any)
      : ("/orders" as any);

  return (
    <SafeAreaView style={styles.container}>
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace(backPath)}
        >
          <Icon name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <span style={webStyle(styles.title)}>{t("new_order")}</span>
        <div style={webStyle(styles.placeholder)} />
      </div>
      <CreateOrderForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    textAlign: "center",
    marginLeft: -32,
  },
  placeholder: {
    width: 32,
  },
});
