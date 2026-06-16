import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";
"use client";

import { useRouter, useLocalSearchParams } from "next/navigation";
import { MaterialCommunityIcons as Icon } from "lucide-react";
import CreateOrderForm from "@/components/OrderForm";
import OrderService from "@/services/OrderService";
import { colors } from "@/colors";
import { useAuthStore } from "@/store/auth.store";
import {
  extractOrderOwnerUserId,
  extractPartyId,
  extractUserId,
  getAccessFlags,
} from "@/utils/access";
import { useLanguage } from "@/hooks/use-language";

export default function EditOrderScreen() {
  const router = useRouter();
  const { id, partyId, returnTo } = useLocalSearchParams<{
    id?: string;
    partyId?: string;
    returnTo?: string;
  }>();
  const { t } = useLanguage();
  const sessionUser = useAuthStore((state) => state.session?.user);
  const { isAdmin, isInternalUser, isParty } = getAccessFlags(sessionUser?.role);
  const sessionPartyId = extractPartyId(sessionUser);
  const sessionUserId = extractUserId(sessionUser);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const backPath =
    returnTo === "party" && partyId
      ? (`/parties/partiesDigital/${partyId}` as any)
      : returnTo === "transaction"
        ? ("/transaction" as any)
      : ("/orders" as any);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await OrderService.fetchOrderById(id as string);
      const orderData = response?.data?.data || response?.data || null;
      if (orderData) {
        const ownerUserId = extractOrderOwnerUserId(orderData);
        const canAccessOrder =
          isAdmin ||
          (isParty && !!sessionPartyId && orderData.partyId === sessionPartyId) ||
          (isInternalUser &&
            !!sessionUserId &&
            (!ownerUserId || ownerUserId === sessionUserId));

        if (!canAccessOrder) {
          router.replace("/orders");
          return;
        }

        setOrder(orderData);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  }, [
    id,
    isAdmin,
    isInternalUser,
    isParty,
    router,
    sessionPartyId,
    sessionUserId,
  ]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace(backPath)}
        >
          <Icon name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <span style={webStyle(styles.title)}>{t("edit_order")}</span>
        <div style={webStyle(styles.placeholder)} />
      </div>

      {order ? (
        <CreateOrderForm existingOrder={order} />
      ) : (
        <div style={webStyle(styles.notFound)}>
          <span style={webStyle(styles.notFoundText)}>{t("order_not_found")}</span>
        </div>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontSize: 16,
    color: colors.gray500,
  },
});
