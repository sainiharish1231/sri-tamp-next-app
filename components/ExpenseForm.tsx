// components/ExpenseForm.tsx
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
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import {
  CreateExpenseDto,
  PAID_BY_TYPES,
  PaidByType,
} from "@/types/expense.types";
import UserService from "@/services/UserService";
import PartyService from "@/services/PartyService";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface User {
  id: string;
  name: string;
  balance?: number;
}

interface Party {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  initialData?: Partial<CreateExpenseDto> & Record<string, any>;
  onSubmit: (data: CreateExpenseDto) => Promise<void>;
  isLoading?: boolean;
  submitButtonText?: string;
}

const getInitialPaidByType = (value?: string): PaidByType =>
  value === PAID_BY_TYPES.PARTY ? PAID_BY_TYPES.PARTY : PAID_BY_TYPES.USER;

export default function ExpenseForm({
  initialData,
  onSubmit,
  isLoading = false,
  submitButtonText = "Add Expense",
}: ExpenseFormProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayerPicker, setShowPayerPicker] = useState(false);

  const [formData, setFormData] = useState<CreateExpenseDto>({
    title: String(initialData?.title || initialData?.paidToName || "").trim(),
    paidToName: String(initialData?.paidToName || initialData?.title || "").trim(),
    description: String(initialData?.description || initialData?.message || "").trim(),
    amount: Number(initialData?.amount || 0),
    date: initialData?.date || new Date().toISOString(),
    paidById: String(
      initialData?.paidById ||
        initialData?.paidBy ||
        initialData?.paidByAccountId ||
        initialData?.partyId ||
        "",
    ).trim(),
    paidByType: getInitialPaidByType(
      String(
        initialData?.paidByType ||
          initialData?.paidByAccountType ||
          (initialData?.partyId ? PAID_BY_TYPES.PARTY : "") ||
          "",
      ),
    ),
  });

  useEffect(() => {
    void fetchUsersAndParties();
  }, []);

  const fetchUsersAndParties = async () => {
    try {
      setLoading(true);
      const [usersRes, partiesRes] = await Promise.all([
        UserService.fetchAllUsers(),
        PartyService.fetchPartiesDropdown(),
      ]);

      if (usersRes.success) {
        setUsers(usersRes.data?.data || []);
      }

      if (partiesRes.success) {
        setParties(PartyService.extractPartyList(partiesRes));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load users and parties");
    } finally {
      setLoading(false);
    }
  };

  const currentPayerOptions = useMemo(() => {
    return formData.paidByType === PAID_BY_TYPES.PARTY ? parties : users;
  }, [formData.paidByType, parties, users]);

  const currentPayerName = useMemo(() => {
    if (!formData.paidById) return "";
    if (formData.paidByType === PAID_BY_TYPES.PARTY) {
      return parties.find((party) => party.id === formData.paidById)?.name || "";
    }
    return users.find((user) => user.id === formData.paidById)?.name || "";
  }, [formData.paidById, formData.paidByType, parties, users]);

  const handleSubmit = async () => {
    const paidToName = formData.paidToName.trim();
    const description = formData.description.trim();

    if (!formData.amount || formData.amount <= 0) {
      Alert.alert("Validation Error", "Please enter a valid amount");
      return;
    }

    if (!paidToName) {
      Alert.alert("Validation Error", "Please enter paid to name");
      return;
    }

    if (!description) {
      Alert.alert("Validation Error", "Please enter description");
      return;
    }

    if (!formData.paidById) {
      Alert.alert("Validation Error", "Please select who paid");
      return;
    }

    await onSubmit({
      title: paidToName,
      paidToName,
      description,
      amount: Number(formData.amount),
      date: formData.date,
      paidById: formData.paidById,
      paidByType: formData.paidByType,
    });
  };

  if (loading) {
    return (
      <div style={webStyle(styles.loadingContainer)}>
        <ActivityIndicator size="large" color={colors.primary} />
        <span style={webStyle(styles.loadingText)}>Loading...</span>
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
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={styles.scrollContent}
      >
        <div style={webStyle(styles.form)}>
          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>Paid By Type *</span>
            <div style={webStyle(styles.segmentRow)}>
              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  formData.paidByType === PAID_BY_TYPES.USER &&
                    styles.segmentButtonActive,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    paidByType: PAID_BY_TYPES.USER,
                    paidById: "",
                  })
                }
              >
                <span
                  style={webStyle(
                    formData.paidByType === PAID_BY_TYPES.USER
                      ? styles.segmentTextActive
                      : styles.segmentText,
                  )}
                >
                  User
                </span>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentButton,
                  formData.paidByType === PAID_BY_TYPES.PARTY &&
                    styles.segmentButtonActive,
                ]}
                onPress={() =>
                  setFormData({
                    ...formData,
                    paidByType: PAID_BY_TYPES.PARTY,
                    paidById: "",
                  })
                }
              >
                <span
                  style={webStyle(
                    formData.paidByType === PAID_BY_TYPES.PARTY
                      ? styles.segmentTextActive
                      : styles.segmentText,
                  )}
                >
                  Party
                </span>
              </TouchableOpacity>
            </div>
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>Paid By *</span>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowPayerPicker(true)}
            >
              <span
                style={webStyle(
                  formData.paidById ? styles.pickerText : styles.pickerPlaceholder,
                )}
              >
                {formData.paidById
                  ? currentPayerName || "Select Payer"
                  : `Select ${formData.paidByType === PAID_BY_TYPES.PARTY ? "Party" : "User"}`}
              </span>
              <Ionicons name="chevron-down" size={20} color={colors.gray500} />
            </TouchableOpacity>
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>Paid To *</span>
            <TextInput
              style={styles.input}
              value={formData.paidToName}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  paidToName: text,
                  title: text,
                })
              }
              placeholder="Vendor / person / account name"
              placeholderTextColor={colors.gray400}
            />
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>Amount (₹) *</span>
            <div style={webStyle(styles.amountInputContainer)}>
              <span style={webStyle(styles.currencySymbol)}>₹</span>
              <TextInput
                style={styles.amountInput}
                value={formData.amount ? String(formData.amount) : ""}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  setFormData({ ...formData, amount: Number.isNaN(num) ? 0 : num });
                }}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={colors.gray400}
              />
            </div>
          </div>

          <div style={webStyle(styles.field)}>
            <span style={webStyle(styles.label)}>Description *</span>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
              placeholder="Enter expense details..."
              placeholderTextColor={colors.gray400}
              multiline
              textAlignVertical="top"
            />
          </div>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <span style={webStyle(styles.submitButtonText)}>{submitButtonText}</span>
            )}
          </TouchableOpacity>

          <KeyboardAwareModal visible={showPayerPicker} transparent animationType="slide">
            <div style={webStyle(styles.modalOverlay)}>
              <div style={webStyle(styles.modalContent)}>
                <div style={webStyle(styles.modalHeader)}>
                  <span style={webStyle(styles.modalTitle)}>
                    Select {formData.paidByType === PAID_BY_TYPES.PARTY ? "Party" : "User"}
                  </span>
                  <TouchableOpacity onPress={() => setShowPayerPicker(false)}>
                    <Ionicons name="close" size={24} color={colors.gray600} />
                  </TouchableOpacity>
                </div>

                <ScrollView>
                  {currentPayerOptions.length === 0 ? (
                    <div style={webStyle(styles.emptyModal)}>
                      <span style={webStyle(styles.emptyModalTitle)}>
                        No {formData.paidByType === PAID_BY_TYPES.PARTY ? "parties" : "users"} found
                      </span>
                      <span style={webStyle(styles.emptyModalText)}>
                        Add a record first, then come back here.
                      </span>
                    </div>
                  ) : null}

                  {currentPayerOptions.map((item: any) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.modalItem}
                      onPress={() => {
                        setFormData({ ...formData, paidById: item.id });
                        setShowPayerPicker(false);
                      }}
                    >
                      <span style={webStyle(styles.modalItemText)}>
                        {item.name}
                      </span>
                      {formData.paidById === item.id && (
                        <Ionicons name="checkmark" size={20} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </div>
            </div>
          </KeyboardAwareModal>
        </div>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: isSmallDevice ? 88 : 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.gray500,
  },
  form: {
    padding: isSmallDevice ? 12 : 20,
  },
  field: {
    marginBottom: isSmallDevice ? 14 : 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.gray700,
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: isSmallDevice ? 40 : 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.gray700,
  },
  segmentTextActive: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    paddingVertical: isSmallDevice ? 10 : 12,
  },
  pickerText: {
    fontSize: isSmallDevice ? 14 : 15,
    color: colors.gray900,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: colors.gray400,
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: isSmallDevice ? 10 : 14,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray700,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 16,
    paddingVertical: isSmallDevice ? 10 : 12,
    color: colors.gray900,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 12,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    paddingVertical: isSmallDevice ? 10 : 12,
    fontSize: isSmallDevice ? 14 : 15,
    color: colors.gray900,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: isSmallDevice ? 11 : 14,
    alignItems: "center",
    marginTop: isSmallDevice ? 14 : 20,
    marginBottom: isSmallDevice ? 28 : 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "80%",
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.gray900,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.gray900,
  },
  emptyModal: {
    alignItems: "center",
    paddingVertical: 28,
  },
  emptyModalTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.gray800,
    marginBottom: 4,
  },
  emptyModalText: {
    fontSize: 13,
    color: colors.gray500,
    textAlign: "center",
  },
});
