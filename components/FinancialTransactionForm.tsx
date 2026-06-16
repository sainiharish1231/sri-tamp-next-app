import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  webStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import SkeletonLoader from "@/components/SkeletonLoader";
import PartyService from "@/services/PartyService";
import type { FinancialTransactionPayload } from "@/services/FinancialTransactionService";
import { getDeviceMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";

const { isXs: isSmallDevice } = getDeviceMetrics();

export type FinancialDirection = "credit" | "debit";
export type PaymentMode = "cash" | "online";

export interface FinancialTransactionPartySnapshot {
  partyId: string;
  name: string;
  balance: number;
  details?: any;
}

export interface FinancialTransactionFormData {
  senderPartyId: string;
  receiverPartyId: string;
  direction: FinancialDirection;
  partyId: string;
  partyAccount: FinancialTransactionPartySnapshot;
  senderParty: FinancialTransactionPartySnapshot;
  receiverParty: FinancialTransactionPartySnapshot;
  apiPayload: FinancialTransactionPayload;
  partyDetails?: any;
  mainUserDetails?: any;
}

type ExistingFinancialTransaction = Partial<FinancialTransactionPayload> & {
  partyId?: string;
  partyName?: string;
  senderName?: string;
  receiverName?: string;
  senderUserId?: string;
  receiverUserId?: string;
  financialType?: FinancialDirection | "receipt" | "payment";
  transactionType?: string;
};

interface FinancialTransactionFormProps {
  onSubmit: (data: FinancialTransactionFormData) => Promise<void>;
  isLoading?: boolean;
  existingTransaction?: ExistingFinancialTransaction;
}

const getPartyRecordId = (party?: any) =>
  String(party?.id || party?._id || party?.partyId || "");

const getDisplayName = (record?: any) =>
  String(
    record?.name ||
      record?.businessName ||
      record?.fullName ||
      record?.partyName ||
      "",
  ).trim();

const getBalance = (record?: any) => {
  const parsed = Number(
    record?.currentBalance ?? record?.balance ?? record?.openingBalance ?? 0,
  );
  return Number.isFinite(parsed) ? parsed : 0;
};

const getDateInputValue = (value?: any) => {
  if (!value) return new Date().toISOString().split("T")[0];
  if (typeof value === "string") return value.split("T")[0];
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString().split("T")[0];
  }

  const seconds = value?._seconds ?? value?.seconds;
  if (typeof seconds === "number") {
    return new Date(seconds * 1000).toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
};

const normalizePaymentMode = (value?: any): PaymentMode =>
  value === "online" ? "online" : "cash";

const normalizeFinancialDirection = (
  transaction?: ExistingFinancialTransaction,
  lockedPartyId = "",
): FinancialDirection => {
  if (lockedPartyId) {
    if (transaction?.senderPartyId === lockedPartyId) return "debit";
    if (transaction?.receiverPartyId === lockedPartyId) return "credit";
  }

  const value = String(
    transaction?.financialType || transaction?.transactionType || "",
  )
    .trim()
    .toLowerCase();

  if (value === "receipt" || value === "credit") return "credit";
  if (value === "payment" || value === "debit") return "debit";

  return "debit";
};

export default function FinancialTransactionForm({
  onSubmit,
  isLoading = false,
  existingTransaction,
}: FinancialTransactionFormProps) {
  const params = useLocalSearchParams<{ partyId?: string }>();
  const { t } = useLanguage();
  const lockedPartyId = params.partyId || "";
  const initialDirection = normalizeFinancialDirection(
    existingTransaction,
    lockedPartyId,
  );
  const initialSenderPartyId =
    existingTransaction?.senderPartyId ||
    (lockedPartyId && initialDirection === "debit" ? lockedPartyId : "") ||
    (!lockedPartyId &&
    existingTransaction?.partyId &&
    initialDirection === "debit"
      ? existingTransaction.partyId
      : "") ||
    "";
  const initialReceiverPartyId =
    existingTransaction?.receiverPartyId ||
    (lockedPartyId && initialDirection === "credit" ? lockedPartyId : "") ||
    (!lockedPartyId &&
    existingTransaction?.partyId &&
    initialDirection === "credit"
      ? existingTransaction.partyId
      : "") ||
    "";

  const [parties, setParties] = useState<any[]>([]);
  const [senderParty, setSenderParty] = useState<any | null>(null);
  const [receiverParty, setReceiverParty] = useState<any | null>(null);
  const [senderPartyId, setSenderPartyId] = useState(initialSenderPartyId);
  const [receiverPartyId, setReceiverPartyId] = useState(initialReceiverPartyId);
  const [senderPartyName, setSenderPartyName] = useState(
    existingTransaction?.senderPartyName ||
      existingTransaction?.senderName ||
      existingTransaction?.partyName ||
      "",
  );
  const [receiverPartyName, setReceiverPartyName] = useState(
    existingTransaction?.receiverPartyName ||
      existingTransaction?.receiverName ||
      "",
  );
  const [financialType, setFinancialType] =
    useState<FinancialDirection>(initialDirection);
  const [loading, setLoading] = useState(true);
  const [partyModalTarget, setPartyModalTarget] = useState<
    "sender" | "receiver" | null
  >(null);
  const [partySearch, setPartySearch] = useState("");
  const [amount, setAmount] = useState(
    existingTransaction?.amount ? String(existingTransaction.amount) : "",
  );
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(
    normalizePaymentMode(existingTransaction?.paymentMode),
  );
  const [transactionDate, setTransactionDate] = useState(
    getDateInputValue(existingTransaction?.transactionDate),
  );
  const [note, setNote] = useState(existingTransaction?.note || "");

  const applyParty = (target: "sender" | "receiver", party: any) => {
    const partyId = getPartyRecordId(party);
    const partyName = getDisplayName(party);

    if (target === "sender") {
      setSenderParty(party);
      setSenderPartyId(partyId);
      setSenderPartyName(partyName);
    } else {
      setReceiverParty(party);
      setReceiverPartyId(partyId);
      setReceiverPartyName(partyName);
    }
  };

  const clearParty = (target: "sender" | "receiver") => {
    if (target === "sender") {
      setSenderParty(null);
      setSenderPartyId("");
      setSenderPartyName("");
    } else {
      setReceiverParty(null);
      setReceiverPartyId("");
      setReceiverPartyName("");
    }
  };

  const getKnownParty = (partyId: string) =>
    [senderParty, receiverParty, ...parties].find(
      (party) => getPartyRecordId(party) === partyId,
    ) || null;

  const handleDirectionChange = (nextDirection: FinancialDirection) => {
    setFinancialType(nextDirection);
    if (!lockedPartyId) return;

    const lockedParty = getKnownParty(lockedPartyId);
    const counterParty =
      senderPartyId === lockedPartyId
        ? receiverParty
        : receiverPartyId === lockedPartyId
          ? senderParty
          : nextDirection === "debit"
            ? receiverParty || senderParty
            : senderParty || receiverParty;
    const safeCounterParty =
      counterParty && getPartyRecordId(counterParty) !== lockedPartyId
        ? counterParty
        : null;

    if (nextDirection === "debit") {
      if (lockedParty) {
        applyParty("sender", lockedParty);
      } else {
        setSenderPartyId(lockedPartyId);
      }

      if (safeCounterParty) {
        applyParty("receiver", safeCounterParty);
      } else {
        clearParty("receiver");
      }
      return;
    }

    if (safeCounterParty) {
      applyParty("sender", safeCounterParty);
    } else {
      clearParty("sender");
    }

    if (lockedParty) {
      applyParty("receiver", lockedParty);
    } else {
      setReceiverPartyId(lockedPartyId);
    }
  };

  useEffect(() => {
    const ensureParty = async (
      partyList: any[],
      partyId: string,
      target: "sender" | "receiver",
    ) => {
      if (!partyId) return;

      const selectedParty = partyList.find(
        (party) => getPartyRecordId(party) === String(partyId),
      );
      if (selectedParty) {
        applyParty(target, selectedParty);
        return;
      }

      const partyRes = await PartyService.fetchPartyWithBankDetails(partyId);
      const party = PartyService.extractParty<any>(partyRes);
      if (!party) return;

      setParties((current) => {
        const exists = current.some(
          (item) => getPartyRecordId(item) === getPartyRecordId(party),
        );
        return exists ? current : [party, ...current];
      });
      applyParty(target, party);
    };

    const loadParties = async () => {
      try {
        setLoading(true);
        const res = await PartyService.fetchPartiesDropdown();
        const partyList = PartyService.extractPartyList<any>(res);
        setParties(partyList);
        await ensureParty(partyList, initialSenderPartyId, "sender");
        await ensureParty(partyList, initialReceiverPartyId, "receiver");
      } catch {
        setParties([]);
      } finally {
        setLoading(false);
      }
    };

    loadParties();
  }, [initialReceiverPartyId, initialSenderPartyId]);

  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties;
    const query = partySearch.toLowerCase();
    return parties.filter((party) =>
      [getDisplayName(party), party.mobile, party.gstNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [parties, partySearch]);

  const handleSave = async () => {
    if (!senderPartyId || !senderPartyName) {
      Alert.alert(t("missing_party"), "Please select sender party");
      return;
    }

    if (!receiverPartyId || !receiverPartyName) {
      Alert.alert(t("missing_party"), "Please select receiver party");
      return;
    }

    if (senderPartyId === receiverPartyId) {
      Alert.alert(t("error"), "Sender and receiver parties cannot be same");
      return;
    }

    const parsedAmount = Number(amount || 0);
    if (!parsedAmount || parsedAmount <= 0) {
      Alert.alert(t("invalid_amount"), t("please_enter_valid_amount"));
      return;
    }

    if (!transactionDate.trim()) {
      Alert.alert(t("error"), "Transaction date is required");
      return;
    }

    const senderSnapshot: FinancialTransactionPartySnapshot = {
      partyId: senderPartyId,
      name: senderPartyName,
      balance: getBalance(senderParty),
      details: senderParty,
    };
    const receiverSnapshot: FinancialTransactionPartySnapshot = {
      partyId: receiverPartyId,
      name: receiverPartyName,
      balance: getBalance(receiverParty),
      details: receiverParty,
    };
    const primaryParty =
      lockedPartyId && financialType === "credit"
        ? receiverSnapshot
        : lockedPartyId
          ? senderSnapshot
          : financialType === "credit"
            ? receiverSnapshot
            : senderSnapshot;
    const apiPayload: FinancialTransactionPayload = {
      senderPartyId,
      senderPartyName,
      receiverPartyId,
      receiverPartyName,
      amount: parsedAmount,
      paymentMode,
      transactionDate,
      note: note.trim(),
    };

    await onSubmit({
      senderPartyId,
      receiverPartyId,
      direction: financialType,
      partyId: lockedPartyId || primaryParty.partyId,
      partyAccount: primaryParty,
      senderParty: senderSnapshot,
      receiverParty: receiverSnapshot,
      apiPayload,
      partyDetails: primaryParty.details,
    });
  };

  const submitDisabled =
    isLoading || !senderPartyId || !receiverPartyId || !amount.trim();

  const renderPartySelector = (
    target: "sender" | "receiver",
    label: string,
    value: string,
    locked = false,
  ) => (
    <div style={webStyle(styles.field)}>
      <span style={webStyle(styles.label)}>{label}</span>
      <TouchableOpacity
        style={[styles.selector, locked && styles.selectorDisabled]}
        onPress={() => {
          if (!locked) {
            setPartyModalTarget(target);
            setPartySearch("");
          }
        }}
        disabled={locked}
      >
        <span style={webStyle(value ? styles.selectorText : styles.selectorPlaceholder)}>
          {value || t("select_party")}
        </span>
        {locked ? (
          <Ionicons name="lock-closed-outline" size={18} color={colors.gray400} />
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.gray500} />
        )}
      </TouchableOpacity>
    </div>
  );

  if (loading) {
    return (
      <div style={webStyle(styles.loadingWrap)}>
        <SkeletonLoader compact rows={4} style={styles.loadingSkeleton} />
      </div>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <div style={webStyle(styles.card)}>
          <span style={webStyle(styles.sectionTitle)}>{t("financial_transaction")}</span>

          <div style={webStyle(styles.directionTabs)}>
            {(["debit", "credit"] as FinancialDirection[]).map((type) => {
              const isActive = financialType === type;
              const activeColor = type === "credit" ? colors.green : colors.red;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.directionTab,
                    isActive && {
                      borderColor: activeColor,
                      backgroundColor:
                        type === "credit" ? colors.greenLight : colors.redLight,
                    },
                  ]}
                  onPress={() => handleDirectionChange(type)}
                >
                  <Ionicons
                    name={
                      type === "credit"
                        ? "arrow-down-circle"
                        : "arrow-up-circle"
                    }
                    size={18}
                    color={isActive ? activeColor : colors.gray500}
                  />
                  <span
                    style={webStyle([
                      styles.directionTabText,
                      isActive && { color: activeColor },
                    ])}
                  >
                    {type === "credit" ? t("credit") : t("debit")}
                  </span>
                </TouchableOpacity>
              );
            })}
          </div>

          {renderPartySelector(
            "sender",
            "From Party",
            senderPartyName,
            Boolean(lockedPartyId && senderPartyId === lockedPartyId),
          )}
          <div style={webStyle(styles.flowArrowWrap)}>
            <div style={webStyle(styles.flowLine)} />
            <div style={webStyle(styles.flowArrowCircle)}>
              <Ionicons name="arrow-down" size={16} color={colors.primary} />
            </div>
            <div style={webStyle(styles.flowLine)} />
          </div>
          {renderPartySelector(
            "receiver",
            "To Party",
            receiverPartyName,
            Boolean(lockedPartyId && receiverPartyId === lockedPartyId),
          )}

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>{t("payment_mode")}</span>
            <div style={webStyle(styles.chipsRow)}>
              {(["cash", "online"] as PaymentMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.chip,
                    paymentMode === mode && styles.activeChip,
                  ]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <span
                    style={webStyle([
                      styles.chipText,
                      paymentMode === mode && styles.activeChipText,
                    ])}
                  >
                    {mode === "cash" ? t("cash") : t("online")}
                  </span>
                </TouchableOpacity>
              ))}
            </div>
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>{t("amount")}</span>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={(value) =>
                setAmount(value.replace(/[^0-9.]/g, ""))
              }
              placeholder={t("enter_amount")}
              placeholderTextColor={colors.gray400}
              keyboardType="numeric"
            />
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>{t("transaction_date")}</span>
            <TextInput
              style={styles.input}
              value={transactionDate}
              onChangeText={setTransactionDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.gray400}
            />
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>{t("note")}</span>
            <TextInput
              style={[styles.input, styles.noteInput]}
              value={note}
              onChangeText={setNote}
              placeholder={t("note")}
              placeholderTextColor={colors.gray400}
              multiline
              textAlignVertical="top"
            />
          </div>
        </div>

        <TouchableOpacity
          style={[styles.submitBtn, submitDisabled && styles.submitBtnDisabled]}
          onPress={handleSave}
          disabled={submitDisabled}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <span style={webStyle(styles.submitBtnText)}>
              {existingTransaction
                ? t("update_financial_transaction")
                : t("create_financial_transaction")}
            </span>
          )}
        </TouchableOpacity>

        <KeyboardAwareModal
          visible={Boolean(partyModalTarget)}
          transparent
          animationType="slide"
        >
          <div style={webStyle(styles.modalOverlay)}>
            <div style={webStyle(styles.modalCard)}>
              <span style={webStyle(styles.modalTitle)}>{t("select_party")}</span>
              <TextInput
                style={styles.input}
                value={partySearch}
                onChangeText={setPartySearch}
                placeholder={t("search_party")}
                placeholderTextColor={colors.gray400}
              />
              <ScrollView
                style={{ maxHeight: 380 }}
                showsVerticalScrollIndicator={false}
              >
                {filteredParties.map((party) => {
                  const partyId = getPartyRecordId(party);
                  return (
                    <TouchableOpacity
                      key={partyId}
                      style={styles.modalItem}
                      onPress={() => {
                        if (partyModalTarget) {
                          applyParty(partyModalTarget, party);
                        }
                        setPartyModalTarget(null);
                      }}
                    >
                      <span style={webStyle(styles.modalItemTitle)}>
                        {getDisplayName(party)}
                      </span>
                      <span style={webStyle(styles.modalItemSubtitle)}>
                        {party.mobile || party.gstNumber || t("party")}
                      </span>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPartyModalTarget(null)}
              >
                <span style={webStyle(styles.modalCloseText)}>{t("close")}</span>
              </TouchableOpacity>
            </div>
          </div>
        </KeyboardAwareModal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    padding: isSmallDevice ? 10 : 16,
    paddingBottom: isSmallDevice ? 88 : 120,
    gap: isSmallDevice ? 12 : 18,
  },
  loadingWrap: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 18,
  },
  loadingSkeleton: { width: "100%" },
  card: {
    backgroundColor: colors.white,
    borderRadius: isSmallDevice ? 14 : 20,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: isSmallDevice ? 12 : 16,
    gap: isSmallDevice ? 10 : 14,
  },
  sectionTitle: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "700",
    color: colors.gray900,
  },
  directionTabs: {
    flexDirection: "row",
    gap: isSmallDevice ? 8 : 10,
  },
  directionTab: {
    flex: 1,
    minHeight: isSmallDevice ? 42 : 48,
    borderRadius: isSmallDevice ? 12 : 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  directionTabText: {
    fontSize: 13,
    color: colors.gray600,
    fontWeight: "800",
  },
  field: { gap: 6 },
  label: { fontSize: 13, color: colors.gray600, fontWeight: "600" },
  selector: {
    minHeight: isSmallDevice ? 42 : 48,
    borderRadius: isSmallDevice ? 10 : 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectorDisabled: { backgroundColor: colors.gray50 },
  selectorText: { flex: 1, fontSize: 14, color: colors.gray900 },
  selectorPlaceholder: { flex: 1, fontSize: 14, color: colors.gray400 },
  input: {
    minHeight: isSmallDevice ? 42 : 48,
    borderRadius: isSmallDevice ? 10 : 14,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    fontSize: 14,
    color: colors.gray900,
  },
  noteInput: {
    minHeight: isSmallDevice ? 78 : 90,
    paddingTop: isSmallDevice ? 10 : 12,
  },
  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: isSmallDevice ? 9 : 12,
    paddingVertical: isSmallDevice ? 7 : 9,
    borderRadius: isSmallDevice ? 10 : 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  activeChip: {
    backgroundColor: colors.primaryPale,
    borderColor: colors.primary,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.gray600 },
  activeChipText: { color: colors.primaryDark },
  flowArrowWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: isSmallDevice ? 20 : 28,
  },
  flowLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.gray200,
  },
  flowArrowCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    backgroundColor: colors.primaryPale,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    width: "100%",
    maxWidth: 520,
    maxHeight: "86%",
    padding: isSmallDevice ? 12 : 16,
    paddingBottom: isSmallDevice ? 20 : 28,
    gap: isSmallDevice ? 8 : 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.gray900 },
  modalItem: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  modalItemTitle: { fontSize: 14, fontWeight: "700", color: colors.gray900 },
  modalItemSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    textTransform: "capitalize",
  },
  modalCloseBtn: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.gray100,
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCloseText: { fontSize: 14, fontWeight: "700", color: colors.gray700 },
});
