import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
  webStyle,
} from "react-native";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import FloatingInput from "@/components/FloatingInput";
import FloatingTextarea from "@/components/FloatingTextarea";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface Country {
  id: string;
  name: string;
  code: string;
  dialling_code: string;
  flag: string;
}

export interface UserFormData {
  name: string;
  phone: string;
  balance: number;
  role: "internal_user" | "user" | "party";
  email: string;
  address: string;
  gstNumber?: string;
  pin?: string;
  countryCode: string;
  diallingCode: string;
  isActive: boolean;
}

interface InternalFormState {
  name: string;
  phone: string;
  balance: string;
  role: "internal_user" | "user" | "party";
  email: string;
  address: string;
  pin: string;
  isActive: boolean;
}

interface UserFormProps {
  initialData?: Partial<UserFormData>;
  countries: Country[];
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  loading?: boolean;
}

const ROLE_OPTIONS = [
  {
    value: "internal_user" as const,
    label: "Internal",
    icon: "👤",
    color: colors.blue,
  },
  {
    value: "user" as const,
    label: "User",
    icon: "👥",
    color: colors.primary,
  },
  {
    value: "party" as const,
    label: "Party",
    icon: "🏢",
    color: colors.green,
  },
];

const EMPTY_FORM: InternalFormState = {
  name: "",
  phone: "",
  balance: "0",
  role: "internal_user",
  email: "",
  address: "",
  pin: "",
  isActive: true,
};

const getCountryCodeFromName = (countryName: string): string => {
  const countryMap: Record<string, string> = {
    india: "IN",
    afghanistan: "AF",
    pakistan: "PK",
    usa: "US",
    "united states": "US",
    uk: "GB",
    "united kingdom": "GB",
    uae: "AE",
    "saudi arabia": "SA",
    china: "CN",
    japan: "JP",
    germany: "DE",
    france: "FR",
    australia: "AU",
    canada: "CA",
    russia: "RU",
    brazil: "BR",
    mexico: "MX",
    indonesia: "ID",
    bangladesh: "BD",
    nepal: "NP",
    "sri lanka": "LK",
    bhutan: "BT",
    myanmar: "MM",
    thailand: "TH",
    vietnam: "VN",
    malaysia: "MY",
    singapore: "SG",
    philippines: "PH",
  };

  const lowerName = countryName.toLowerCase();
  return countryMap[lowerName] || lowerName.substring(0, 2).toUpperCase();
};

export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  countries,
  onSubmit,
  onCancel,
  isEditing = false,
  loading = false,
}) => {
  const [form, setForm] = useState<InternalFormState>({ ...EMPTY_FORM });
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  useEffect(() => {
    if (countries.length > 0 && !selectedCountry) {
      const india = countries.find(
        (c) =>
          c.name?.toLowerCase() === "india" ||
          c.code === "IN" ||
          c.dialling_code === "+91",
      );

      if (india) {
        const countryCode = india.code || getCountryCodeFromName(india.name);
        const enhancedCountry = { ...india, code: countryCode };
        setSelectedCountry(enhancedCountry);
      } else if (countries[0]) {
        const countryCode =
          countries[0].code || getCountryCodeFromName(countries[0].name);
        const enhancedCountry = { ...countries[0], code: countryCode };
        setSelectedCountry(enhancedCountry);
      }
    }
  }, [countries]);

  useEffect(() => {
    if (isEditing && initialData && countries.length > 0) {
      console.log("initialData>>>>>>>>",initialData)
      setForm({
        name: initialData.name || "",
        phone: initialData.phone || "",
        balance: initialData.balance?.toString() || "0",
        role: initialData.role || "internal_user",
        email: initialData.email || "",
        address: initialData.address || "",
        pin: initialData.pin || "",
        isActive: initialData.isActive ?? true,
      });

      if (initialData.countryCode) {
        const foundCountry = countries.find(
          (c) => c.code === initialData.countryCode,
        );
        if (foundCountry) {
          const countryCode =
            foundCountry.code || getCountryCodeFromName(foundCountry.name);
          const enhancedCountry = { ...foundCountry, code: countryCode };
          setSelectedCountry(enhancedCountry);
        }
      } else if (initialData.diallingCode) {
        const foundCountry = countries.find(
          (c) => c.dialling_code === initialData.diallingCode,
        );
        if (foundCountry) {
          const countryCode =
            foundCountry.code || getCountryCodeFromName(foundCountry.name);
          const enhancedCountry = { ...foundCountry, code: countryCode };
          setSelectedCountry(enhancedCountry);
        }
      }
    }
  }, [isEditing, initialData, countries]);

  const filteredCountries = countries.filter(
    (country) =>
      country.name?.toLowerCase().includes(countrySearch.toLowerCase()) ||
      country.dialling_code?.includes(countrySearch) ||
      country.code?.toLowerCase().includes(countrySearch.toLowerCase()),
  );

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (form.name.trim() && form.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (form.name.trim().length > 50) {
      errors.name = "Name cannot exceed 50 characters";
    }

    if (!selectedCountry) {
      errors.country = "Please select a country";
    }

    if (!form.phone) {
      errors.phone = "Phone number is required";
    } else if (!/^\d+$/.test(form.phone)) {
      errors.phone = "Phone number must contain only digits";
    } else if (form.phone.length < 4) {
      errors.phone = "Phone number must be at least 4 digits";
    } else if (form.phone.length > 15) {
      errors.phone = "Phone number cannot exceed 15 digits";
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Invalid email format";
    }

    if (form.pin && !/^[0-9]{6}$/.test(form.pin)) {
      errors.pin = "PIN must be 6 digits";
    }

    if (parseFloat(form.balance) < 0) {
      errors.balance = "Balance cannot be negative";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Error", "Please fix the errors in the form");
      return;
    }

    if (!selectedCountry) {
      Alert.alert("Error", "Please select a country");
      return;
    }

    let finalCountryCode = selectedCountry.code;
    if (!finalCountryCode || finalCountryCode === "undefined") {
      finalCountryCode = getCountryCodeFromName(selectedCountry.name);
    }

    const finalDialCode = selectedCountry.dialling_code;
    const fullPhoneNumber = `${form.phone}`;

    const submitData: UserFormData = {
      name: form.name.trim(),
      phone: fullPhoneNumber,
      balance: parseFloat(form.balance),
      role: form.role,
      email: form.email.trim(),
      address: form.address.trim(),
      pin: form.pin.trim() || undefined,
      countryCode: finalCountryCode,
      diallingCode: finalDialCode,
      isActive: form.isActive,
    };

    await onSubmit(submitData);
  };

  const handleInputChange = (field: keyof InternalFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <div style={webStyle(styles.formContainer)}>
          <FloatingInput
            label="Full Name"
            value={form.name}
            onChangeText={(text) => handleInputChange("name", text)}
            error={formErrors.name}
            leftIcon="account"
            autoCapitalize="words"
            editable={!loading}
          />

          <div style={webStyle(styles.inputGroup)}>
            <span style={webStyle(styles.label)}>
              User Role <span style={webStyle(styles.required)}>*</span>
            </span>
            <div style={webStyle(styles.roleContainer)}>
              {ROLE_OPTIONS.map((role) => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleOption,
                    form.role === role.value && {
                      backgroundColor: role.color + "10",
                      borderColor: role.color,
                    },
                  ]}
                  onPress={() => setForm({ ...form, role: role.value })}
                  disabled={loading}
                >
                  <span
                    style={webStyle([
                      styles.roleOptionText,
                      form.role === role.value && { color: role.color },
                    ])}
                  >
                    {role.icon} {role.label}
                  </span>
                </TouchableOpacity>
              ))}
            </div>
          </div>

          <div style={webStyle(styles.inputGroup)}>
            <span style={webStyle(styles.label)}>
              Country <span style={webStyle(styles.required)}>*</span>
            </span>
            <TouchableOpacity
              style={[
                styles.countrySelector,
                formErrors.country && styles.countrySelectorError,
              ]}
              onPress={() => setShowCountryModal(true)}
              disabled={loading}
            >
              {selectedCountry ? (
                <span style={webStyle(styles.selectedCountryText)}>
                  {selectedCountry.flag} {selectedCountry.name} (
                  {selectedCountry.dialling_code})
                </span>
              ) : (
                <span style={webStyle(styles.placeholder)}>Select country</span>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.gray500} />
            </TouchableOpacity>
            {formErrors.country && (
              <span style={webStyle(styles.errorText)}>{formErrors.country}</span>
            )}
          </div>

          <div style={webStyle(styles.phoneRow)}>
            <TouchableOpacity
              onPress={() => setShowCountryModal(true)}
              style={styles.countryCodeSelector}
              disabled={loading}
            >
              <span style={webStyle(styles.countryCodeText)}>
                {selectedCountry?.dialling_code || "+91"}
              </span>
              <Ionicons name="chevron-down" size={14} color="#6B7280" />
            </TouchableOpacity>

            <div style={webStyle(styles.phoneInput)}>
              <FloatingInput
                label="Phone Number"
                value={form.phone}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, "");
                  handleInputChange("phone", cleaned);
                }}
                error={formErrors.phone}
                required
                leftIcon="phone"
                maxLength={15}
                keyboardType="phone-pad"
                editable={!loading}
              />
            </div>
          </div>

          <FloatingInput
            label="PIN"
            value={form.pin}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "");
              handleInputChange("pin", cleaned);
            }}
            error={formErrors.pin}
            leftIcon="key-outline"
            maxLength={6}
            keyboardType="number-pad"
            editable={!loading}
          />

          <FloatingInput
            label="Email Address"
            value={form.email}
            onChangeText={(text) => handleInputChange("email", text)}
            error={formErrors.email}
            leftIcon="email-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <FloatingTextarea
            label="Address"
            value={form.address}
            onChangeText={(text) => handleInputChange("address", text)}
            rows={3}
            editable={!loading}
          />

          <FloatingInput
            label="Opening Balance"
            value={form.balance}
            onChangeText={(text) => {
              const val = text.replace(/[^0-9.]/g, "");
              handleInputChange("balance", val);
            }}
            error={formErrors.balance}
            leftIcon="cash"
            keyboardType="numeric"
            editable={!loading}
          />

          <div style={webStyle(styles.inputGroup)}>
            <span style={webStyle(styles.label)}>Status</span>
            <div style={webStyle(styles.statusRow)}>
              {[
                { label: "Active", value: true },
                { label: "Inactive", value: false },
              ].map((option) => {
                const selected = form.isActive === option.value;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[
                      styles.statusChip,
                      selected && styles.statusChipSelected,
                    ]}
                    onPress={() =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: option.value,
                      }))
                    }
                    disabled={loading}
                  >
                    <span
                      style={webStyle([
                        styles.statusChipText,
                        selected && styles.statusChipTextSelected,
                      ])}
                    >
                      {option.label}
                    </span>
                  </TouchableOpacity>
                );
              })}
            </div>
          </div>

          <div style={webStyle(styles.actionButtons)}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={loading}
            >
              <span style={webStyle(styles.cancelBtnText)}>Cancel</span>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.submitBtn,
                loading && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons
                    name={isEditing ? "save" : "person-add"}
                    size={20}
                    color="white"
                  />
                  <span style={webStyle(styles.submitBtnText)}>
                    {isEditing ? "Update User" : "Create User"}
                  </span>
                </>
              )}
            </TouchableOpacity>
          </div>
        </div>
      </ScrollView>

      <KeyboardAwareModal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
          <div style={webStyle(styles.modalOverlay)}>
            <TouchableWithoutFeedback>
              <div style={webStyle(styles.modalContent)}>
                <div style={webStyle(styles.modalHeader)}>
                  <span style={webStyle(styles.modalTitle)}>Select Country</span>
                  <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </div>

                <div style={webStyle(styles.searchBox)}>
                  <Ionicons name="search" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.searchBoxInput}
                    placeholder="Search country or code..."
                    placeholderTextColor="#9CA3AF"
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                  />
                </div>

                <FlatList
                  data={filteredCountries}
                  keyExtractor={(item) => item.id || item.name}
                  renderItem={({ item }) => {
                    const displayCode =
                      item.code || getCountryCodeFromName(item.name);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.countryItem,
                          selectedCountry?.id === item.id &&
                            styles.countryItemSelected,
                        ]}
                        onPress={() => {
                          const enhancedCountry = {
                            ...item,
                            code: displayCode,
                          };
                          setSelectedCountry(enhancedCountry);
                          setFormErrors((prev) => ({ ...prev, country: "" }));
                          setCountrySearch("");
                          setShowCountryModal(false);
                        }}
                      >
                        <span style={webStyle(styles.countryFlag)}>{item.flag}</span>
                        <span style={webStyle(styles.countryName)}>{item.name}</span>
                        <span style={webStyle(styles.countryDialCode)}>
                          {item.dialling_code}
                        </span>
                        {selectedCountry?.id === item.id && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <div style={webStyle(styles.emptyContainer)}>
                      <Ionicons
                        name="globe-outline"
                        size={48}
                        color="#D1D5DB"
                      />
                      <span style={webStyle(styles.emptyText)}>No countries found</span>
                    </div>
                  }
                />
              </div>
            </TouchableWithoutFeedback>
          </div>
        </TouchableWithoutFeedback>
      </KeyboardAwareModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formContainer: {
    paddingHorizontal: isSmallDevice ? 12 : 20,
    paddingTop: isSmallDevice ? 12 : 20,
    paddingBottom: isSmallDevice ? 20 : 30,
  },
  inputGroup: {
    marginBottom: isSmallDevice ? 10 : 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 8,
  },
  required: {
    color: colors.red,
  },
  roleContainer: {
    flexDirection: "row",
    gap: isSmallDevice ? 6 : 8,
  },
  roleOption: {
    flex: 1,
    padding: isSmallDevice ? 10 : 14,
    borderRadius: isSmallDevice ? 10 : 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: colors.white,
  },
  roleOptionText: {
    fontSize: isSmallDevice ? 13 : 14,
    color: colors.text,
    fontWeight: "600" as const,
  },
  statusRow: {
    flexDirection: "row",
    gap: isSmallDevice ? 6 : 8,
  },
  statusChip: {
    flex: 1,
    minHeight: isSmallDevice ? 42 : 48,
    borderRadius: isSmallDevice ? 10 : 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  statusChipText: {
    fontSize: isSmallDevice ? 13 : 14,
    color: colors.gray600,
    fontWeight: "700" as const,
  },
  statusChipTextSelected: {
    color: colors.primaryDark,
  },
  countrySelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    backgroundColor: colors.white,
  },
  countrySelectorError: {
    borderColor: "#EF4444",
  },
  selectedCountryText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: colors.text,
    fontWeight: "500" as const,
  },
  placeholder: {
    color: "#9CA3AF",
    fontSize: isSmallDevice ? 14 : 16,
  },
  errorText: {
    fontSize: 12,
    color: colors.red,
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  countryCodeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 9 : 12,
    height: isSmallDevice ? 52 : 60,
    gap: 4,
    minWidth: 78,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: "row",
    gap: isSmallDevice ? 8 : 12,
    marginTop: isSmallDevice ? 16 : 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallDevice ? 5 : 8,
    paddingVertical: isSmallDevice ? 11 : 14,
    borderRadius: isSmallDevice ? 10 : 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelBtn: {
    backgroundColor: colors.gray200,
  },
  cancelBtnText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600" as const,
    color: colors.gray700,
  },
  submitBtn: {
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "white",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 8,
    width: "100%",
    maxWidth: 520,
    maxHeight: "75%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: colors.text,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  searchBoxInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  countryItemSelected: {
    backgroundColor: colors.primary + "10",
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500" as const,
    color: colors.text,
  },
  countryDialCode: {
    fontSize: 16,
    color: "#6B7280",
    marginRight: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    color: "#9CA3AF",
    fontSize: 16,
  },
});
