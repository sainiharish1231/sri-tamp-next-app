import React, { useState, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  webStyle,
} from "react-native";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import FloatingInput from "@/components/FloatingInput";
import FloatingTextarea from "@/components/FloatingTextarea";
import PartyService from "@/services/PartyService";
import CountriesService from "@/services/CountriesService";
import { Country } from "@/types/country.types";
import Toast from "@/utils/Toast";

interface PartyFormData {
  name: string;
  userName: string;
  mobile: string;
  address: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  accountType: "" | "Saving" | "Current";

  countryId: string;
  countryCode: string;
  diallingCode: string;
  isActive: boolean;
}

export default function PartyForm({ existingParty, isEditing = false }: any) {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  const [form, setForm] = useState<PartyFormData>({
    name: existingParty?.name || "",
    userName: existingParty?.userName || existingParty?.contactPerson || "",
    mobile: existingParty?.mobile?.replace(/^\+91/, "") || "",
    address: existingParty?.address || "",
    email: existingParty?.email || "",
    gstNumber: existingParty?.gstNumber || "",
    panNumber: existingParty?.panNumber || "",
    accountHolderName: existingParty?.accountHolderName || "",
    accountNumber: existingParty?.accountNumber || "",
    bankName: existingParty?.bankName || "",
    branchName: existingParty?.branchName || "",
    ifscCode: existingParty?.ifscCode || "",
    accountType: existingParty?.accountType || "",

    countryId: "",
    countryCode: "",
    diallingCode: existingParty?.diallingCode || "+91",
    isActive: existingParty?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [isApiLoaded, setIsApiLoaded] = useState(false);

  const defaultIndia: Country = {
    id: "in",
    name: "India",
    code: "IN",
    dialling_code: "+91",
    flag: "🇮🇳",
    isoCode: "356",
  };

  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultIndia);

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (existingParty && existingParty.diallingCode && isApiLoaded) {
      const country = countries.find(
        (c) => c.dialling_code === existingParty.diallingCode,
      );
      if (country) {
        setSelectedCountry(country);
        setForm((prev) => ({
          ...prev,
          diallingCode: country.dialling_code,
          countryCode: country.code,
        }));
      }
    }
  }, [existingParty, countries, isApiLoaded]);

  const fetchCountries = async () => {
    try {
      const response: any = await CountriesService.fetchAllCategory();

      if (response?.success && response?.data) {
        const countriesData = (response.data || []).map((c: any) => ({
          ...c,
          code: c.code || c.isoCode || c.countryCode || c.iso || "IN",
        }));
        setCountries(countriesData);
        setFilteredCountries(countriesData);

        if (!existingParty) {
          const indiaInList = countriesData.find(
            (c: Country) => c.dialling_code === "+91",
          );

          setForm((prev) => ({
            ...prev,
            diallingCode: "+91",
            countryCode: "IN",
          }));

          if (indiaInList && indiaInList.dialling_code === "+91") {
            setSelectedCountry(indiaInList);
          } else {
            setSelectedCountry(defaultIndia);
          }
        }

        setIsApiLoaded(true);
      } else {
        setIsApiLoaded(true);
      }
    } catch (err) {
      console.log("Error fetching countries:", err);
      setIsApiLoaded(true);
    }
  };

  useEffect(() => {
    if (!countrySearch.trim()) {
      setFilteredCountries(countries);
      return;
    }

    const query = countrySearch.toLowerCase().trim();
    const filtered = countries.filter(
      (country) =>
        country.name?.toLowerCase().includes(query) ||
        country.dialling_code?.toLowerCase().includes(query) ||
        country.code?.toLowerCase().includes(query),
    );
    setFilteredCountries(filtered);
  }, [countrySearch, countries]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setForm((prev) => ({
      ...prev,
      diallingCode: country.dialling_code,
      countryCode: country.code,
    }));
    setShowCountryModal(false);
    setCountrySearch("");
    clearFieldError("mobile");
  };

  const setFieldError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const clearAllErrors = () => {
    setErrors({});
  };

  const handleInputChange = (field: keyof PartyFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      clearFieldError(field);
    }
  };

  const handleTaxInputChange = (
    field: "gstNumber" | "panNumber" | "ifscCode",
    value: string,
    maxLength: number,
  ) => {
    handleInputChange(
      field,
      value.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLength),
    );
  };

  const uppercaseTaxField = (field: "gstNumber" | "panNumber" | "ifscCode") => {
    const value = form[field];
    if (value) {
      handleInputChange(field, value.toUpperCase());
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Party name is required";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "Party name must be at least 2 characters";
    }

    if (form.userName.trim() && form.userName.trim().length < 2) {
      newErrors.userName = "User name must be at least 2 characters";
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d+$/.test(form.mobile)) {
      newErrors.mobile = "Phone number must contain only digits";
    } else if (form.mobile.length < 4) {
      newErrors.mobile = "Phone number must be at least 4 digits";
    } else if (form.mobile.length > 15) {
      newErrors.mobile = "Phone number cannot exceed 15 digits";
    }

    if (form.email && form.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email =
          "Please enter a valid email address (e.g., name@example.com)";
      }
    }

    if (form.gstNumber && form.gstNumber.trim()) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(form.gstNumber.toUpperCase())) {
        newErrors.gstNumber =
          "Invalid GST number format (e.g., 22AAAAA0000A1Z5)";
      }
    }

    if (form.panNumber && form.panNumber.trim()) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(form.panNumber.toUpperCase())) {
        newErrors.panNumber = "Invalid PAN number format (e.g., ABCDE1234F)";
      }
    }

    if (
      form.accountNumber.trim() &&
      !/^[0-9]{9,18}$/.test(form.accountNumber.trim())
    ) {
      newErrors.accountNumber =
        "Invalid account number. It should be 9 to 18 digits only.";
    }

    if (form.ifscCode.trim()) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(form.ifscCode.toUpperCase())) {
        newErrors.ifscCode = "Invalid IFSC code";
      }
    }

    if (
      form.accountType &&
      form.accountType !== "Saving" &&
      form.accountType !== "Current"
    ) {
      newErrors.accountType = "Account type must be Saving or Current";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Show first error in toast
      const firstErrorField = Object.keys(newErrors)[0];
      const firstErrorMessage = newErrors[firstErrorField];

      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: firstErrorMessage,
      });

      // Scroll to first error
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);

      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const partyData = {
        name: form.name.trim(),
        userName: form.userName.trim(),
        mobile: form.mobile.replace(/\D/g, ""),
        address: form.address.trim(),
        email: form.email.trim(),
        gstNumber: form.gstNumber.toUpperCase(),
        panNumber: form.panNumber.toUpperCase(),
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        bankName: form.bankName.trim(),
        branchName: form.branchName.trim(),
        ifscCode: form.ifscCode.toUpperCase(),
        accountType: form.accountType,

        diallingCode: selectedCountry.dialling_code,
        countryCode: selectedCountry.code,
        isActive: form.isActive,
      };

      let response;
      if (existingParty) {
        response = await PartyService.updateParty(existingParty.id, partyData);
      } else {
        response = await PartyService.addNewParty(partyData);
      }

      if (response?.success) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2:
            response.message ||
            `Party ${existingParty ? "updated" : "created"} successfully`,
        });
        router.back();
      } else {
        // Handle backend validation errors
        if (response?.message && typeof response.message === "object") {
          const backendErrors = response.message;
          const fieldMapping: Record<string, string> = {
            mobile: "mobile",
            email: "email",
            gstNumber: "gstNumber",
            panNumber: "panNumber",
            accountNumber: "accountNumber",
            accountHolderName: "accountHolderName",
            bankName: "bankName",
            branchName: "branchName",
            ifscCode: "ifscCode",
            accountType: "accountType",
            name: "name",
            userName: "userName",
            address: "address",
          };

          Object.keys(backendErrors).forEach((key) => {
            const fieldName = fieldMapping[key];
            if (fieldName) {
              setFieldError(fieldName, backendErrors[key]);
            }
          });

          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Please check the form for errors",
          });
        } else if (typeof response?.message === "string") {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: response.message,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to save party",
          });
        }
      }
    } catch (error: any) {
      console.log("Submit error:", error);

      if (error?.message && typeof error.message === "object") {
        const backendErrors = error.message;
        const fieldMapping: Record<string, string> = {
          mobile: "mobile",
          email: "email",
          gstNumber: "gstNumber",
          panNumber: "panNumber",
          accountNumber: "accountNumber",
          accountHolderName: "accountHolderName",
          bankName: "bankName",
          branchName: "branchName",
          ifscCode: "ifscCode",
          accountType: "accountType",

          name: "name",
          userName: "userName",
          address: "address",
        };

        Object.keys(backendErrors).forEach((key) => {
          const fieldName = fieldMapping[key];
          if (fieldName) {
            setFieldError(fieldName, backendErrors[key]);
          }
        });
        Toast.show({
          type: "error",
          text1: "Validation Error",
          text2: "Please check the form for errors",
        });
      } else if (typeof error?.message === "string") {
        Toast.show({ type: "error", text1: "Error", text2: error.message });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to save party",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <div style={webStyle(styles.container)}>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            automaticallyAdjustKeyboardInsets={true}
            scrollEnabled={true}
            keyboardDismissMode="on-drag"
          >
            <div style={webStyle(styles.formContainer)}>
              {/* Party Name */}
              <FloatingInput
                label="Party Name"
                value={form.name}
                onChangeText={(text) => handleInputChange("name", text)}
                error={errors.name}
                required
                autoCapitalize="words"
              />

              <FloatingInput
                label="User Name / Contact Person"
                value={form.userName}
                onChangeText={(text) => handleInputChange("userName", text)}
                error={errors.userName}
                placeholder="Mahesh Sharma"
                autoCapitalize="words"
              />

              {/* Mobile Number */}
              <div style={webStyle(styles.inputGroup)}>
                <span style={webStyle(styles.label)}>
                  Mobile Number <span style={webStyle(styles.required)}>*</span>
                </span>

                <div style={webStyle(styles.phoneRow)}>
                  <TouchableOpacity
                    onPress={() => setShowCountryModal(true)}
                    style={styles.countryCodeSelector}
                  >
                    <span style={webStyle(styles.countryCodeText)}>
                      {selectedCountry.dialling_code}
                    </span>
                    <Ionicons name="chevron-down" size={14} color="#6B7280" />
                  </TouchableOpacity>

                  <div style={webStyle(styles.mobileInputContainer)}>
                    <TextInput
                      style={[
                        styles.mobileInput,
                        errors.mobile && styles.inputError,
                      ]}
                      value={form.mobile}
                      onChangeText={(text) =>
                        handleInputChange("mobile", text.replace(/\D/g, ""))
                      }
                      placeholder="Enter mobile number"
                      keyboardType="phone-pad"
                      maxLength={15}
                    />
                  </div>
                </div>

                {errors.mobile && (
                  <span style={webStyle(styles.errorText)}>{errors.mobile}</span>
                )}

                {form.mobile && (
                  <div style={webStyle(styles.fullNumberContainer)}>
                    <span style={webStyle(styles.fullNumberText)}>
                      Full number: {selectedCountry.dialling_code} {form.mobile}
                    </span>
                  </div>
                )}
              </div>

              {/* Address */}
              <FloatingTextarea
                label="Address"
                value={form.address}
                onChangeText={(text) => handleInputChange("address", text)}
                error={errors.address}
                rows={3}
                placeholder="Enter full address"
              />

              {/* Email */}
              <FloatingInput
                label="Email Address"
                value={form.email}
                onChangeText={(text) => handleInputChange("email", text)}
                error={errors.email}
                placeholder="example@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
              />

              <span style={webStyle(styles.sectionTitle)}>Tax Details</span>

              {/* GST Number */}
              <FloatingInput
                label="GST Number"
                value={form.gstNumber}
                onChangeText={(text) =>
                  handleTaxInputChange("gstNumber", text, 15)
                }
                onBlur={() => uppercaseTaxField("gstNumber")}
                error={errors.gstNumber}
                placeholder="22AAAAA0000A1Z5"
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                maxLength={15}
              />

              {/* PAN Number */}
              <FloatingInput
                label="PAN Number"
                value={form.panNumber}
                onChangeText={(text) =>
                  handleTaxInputChange("panNumber", text, 10)
                }
                onBlur={() => uppercaseTaxField("panNumber")}
                error={errors.panNumber}
                placeholder="ABCDE1234F"
                autoCapitalize="characters"
                autoCorrect={false}
                spellCheck={false}
                textContentType="none"
                importantForAutofill="no"
                maxLength={10}
              />

              <span style={webStyle(styles.sectionTitle)}>Bank Details</span>

              <FloatingInput
                label="Account Holder Name"
                value={form.accountHolderName}
                onChangeText={(text) =>
                  handleInputChange("accountHolderName", text)
                }
                error={errors.accountHolderName}
                placeholder="Sharma Traders"
                autoCapitalize="words"
              />

              <FloatingInput
                label="Account Number"
                value={form.accountNumber}
                onChangeText={(text) =>
                  handleInputChange("accountNumber", text.replace(/\D/g, ""))
                }
                error={errors.accountNumber}
                placeholder="123456789012"
                keyboardType="numeric"
                maxLength={18}
              />

              <FloatingInput
                label="Bank Name"
                value={form.bankName}
                onChangeText={(text) => handleInputChange("bankName", text)}
                error={errors.bankName}
                placeholder="HDFC Bank"
                autoCapitalize="words"
              />

              <FloatingInput
                label="Branch Name"
                value={form.branchName}
                onChangeText={(text) => handleInputChange("branchName", text)}
                error={errors.branchName}
                placeholder="Jaipur Main Branch"
                autoCapitalize="words"
              />

              <FloatingInput
                label="IFSC Code"
                value={form.ifscCode}
                onChangeText={(text) =>
                  handleTaxInputChange("ifscCode", text, 11)
                }
                onBlur={() => uppercaseTaxField("ifscCode")}
                error={errors.ifscCode}
                placeholder="HDFC0001234"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={11}
              />

              <div style={webStyle(styles.inputGroup)}>
                <span style={webStyle(styles.label)}>Account Type</span>
                <div style={webStyle(styles.accountTypeRow)}>
                  {(["Saving", "Current"] as const).map((type) => {
                    const isSelected = form.accountType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.accountTypeChip,
                          isSelected && styles.accountTypeChipSelected,
                        ]}
                        onPress={() =>
                          handleInputChange(
                            "accountType",
                            isSelected ? "" : type,
                          )
                        }
                      >
                        <span
                          style={webStyle([
                            styles.accountTypeText,
                            isSelected && styles.accountTypeTextSelected,
                          ])}
                        >
                          {type}
                        </span>
                      </TouchableOpacity>
                    );
                  })}
                </div>
                {errors.accountType && (
                  <span style={webStyle(styles.errorText)}>{errors.accountType}</span>
                )}
              </div>

              {/* <FloatingInput
                label="Current Balance"
                value={form.currentBalance}
                onChangeText={(text) => {
                  const val = text.replace(/[^0-9.-]/g, "");
                  handleInputChange("currentBalance", val);
                }}
                error={errors.currentBalance}
                placeholder="Enter current balance"
                keyboardType="numeric"
              /> */}

              <div style={webStyle(styles.bottomSpacer)} />

              {/* Buttons */}
              <div style={webStyle(styles.actionButtons)}>
                <TouchableOpacity
                  className=" border border-gray-400"
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={() => router.back()}
                >
                  <span style={webStyle(styles.cancelBtnText)}>Cancel</span>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.submitBtn,
                    loading && styles.disabledButton,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons
                        name={existingParty ? "save" : "add-circle"}
                        size={20}
                        color="white"
                      />
                      <span style={webStyle(styles.submitBtnText)}>
                        {existingParty ? "Update Party" : "Create Party"}
                      </span>
                    </>
                  )}
                </TouchableOpacity>
              </div>
            </div>
          </ScrollView>
        </div>
      </TouchableWithoutFeedback>

      {/* Country Modal */}
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
                  keyExtractor={(item, index) =>
                    item?.id || item?.code || index.toString()
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.countryItem,
                        selectedCountry?.dialling_code ===
                          item?.dialling_code && styles.countryItemSelected,
                      ]}
                      onPress={() => handleCountrySelect(item)}
                    >
                      <span style={webStyle(styles.countryFlag)}>
                        {item?.flag || "🌍"}
                      </span>
                      <span style={webStyle(styles.countryName)}>{item?.name || ""}</span>
                      <span style={webStyle(styles.countryDialCode)}>
                        {item?.dialling_code || ""}
                      </span>
                      {selectedCountry?.dialling_code ===
                        item?.dialling_code && (
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  )}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || "#F5F5F5",
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 80,
    flexGrow: 1,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 6,
    marginBottom: 12,
  },
  required: {
    color: "#EF4444",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countryCodeSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 52,
    gap: 4,
    minWidth: 78,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  mobileInputContainer: {
    flex: 1,
  },
  mobileInput: {
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  fullNumberContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  fullNumberText: {
    fontSize: 13,
    color: "#6B7280",
  },
  verifiedText: {
    color: "#10B981",
    fontWeight: "600",
  },
  accountTypeRow: {
    flexDirection: "row",
    gap: 10,
  },
  accountTypeChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  accountTypeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  accountTypeText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "700",
  },
  accountTypeTextSelected: {
    color: colors.primaryDark,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,

    paddingVertical: 16,
    borderRadius: 12,
  },
  cancelBtn: {
    backgroundColor: colors.secondary,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },
  submitBtn: {
    backgroundColor: colors.primary,
  },
  submitBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
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
    fontWeight: "700",
    color: "#1F2937",
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
    color: "#1F2937",
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
    backgroundColor: "#EFF6FF",
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
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
  bottomSpacer: {
    height: Platform.OS === "ios" ? 100 : 60,
  },
});
