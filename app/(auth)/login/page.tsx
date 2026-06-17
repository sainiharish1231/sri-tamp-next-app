"use client";

import { colors } from "@/colors";
import { Toast } from "@/utils/toast";
import { LinearGradient } from "expo-linear-gradient";

import { useRouter } from "next/navigation";

import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import { useLanguage } from "@/hooks/use-language";
import AuthService from "@/services/AuthService";
import { useAuthStore } from "@/store/auth.store";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Animated,
  webStyle,
} from "react-native";
import { Country } from "@/types/country.types";
import CountriesService from "@/services/CountriesService";
import { getDeviceMetrics } from "@/utils/responsive";

const { width, height, isXs: isSmallDevice } = getDeviceMetrics();

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { setSession, isAuthenticated } = useAuthStore();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [forgotPhoneError, setForgotPhoneError] = useState("");
  const [forgotEmailError, setForgotEmailError] = useState("");

  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  // UI states
  const [showPin, setShowPin] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Country states
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const forgotModalAnim = useRef(new Animated.Value(0)).current;
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const pinInputRef = useRef<TextInput>(null);
  const forgotPhoneInputRef = useRef<TextInput>(null);
  const forgotEmailInputRef = useRef<TextInput>(null);

  const defaultCountry: Country = {
    id: "in",
    name: "India",
    code: "IN",
    dialling_code: "+91",
    flag: "🇮🇳",
    isoCode: "356",
  };

  const [selectedCountry, setSelectedCountry] =
    useState<Country>(defaultCountry);

  // Entry animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  // Forgot modal animation
  useEffect(() => {
    if (showForgotModal) {
      Animated.spring(forgotModalAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: false,
      }).start();
    } else {
      forgotModalAnim.setValue(0);
    }
  }, [showForgotModal]);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated]);

  // Fetch countries
  useEffect(() => {
    fetchCountries();
  }, []);

  // Filter countries
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredCountries(countries);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = countries.filter(
        (country) =>
          country.name.toLowerCase().includes(query) ||
          country.dialling_code.includes(query) ||
          country?.code?.toLowerCase().includes(query),
      );
      setFilteredCountries(filtered);
    }
  }, [searchQuery, countries]);

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardHeight(0);
      },
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const fetchCountries = async () => {
    try {
      setCountriesLoading(true);
      const response: any = await CountriesService.fetchAllCategory();
      if (response.success && response.data) {
        const countriesData = response.data || [];
        setCountries(countriesData);
        const india = countriesData.find(
          (c: Country) =>
            c.id === "in" ||
            c.code === "IN" ||
            c.name.toLowerCase() === "india",
        );
        if (india) setSelectedCountry(india);
      }
    } catch (err) {
      console.log("Error fetching countries:", err);
    } finally {
      setCountriesLoading(false);
    }
  };

  const shakeError = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: false,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Validation functions
  const validatePhone = useCallback((): boolean => {
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneError(t("phone_required") || "Phone number is required");
      shakeError();
      return false;
    }
    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setPhoneError(t("invalid_phone") || "Enter valid 10-digit phone number");
      shakeError();
      return false;
    }
    setPhoneError("");
    return true;
  }, [phone, t]);

  const validatePin = useCallback((): boolean => {
    const trimmedPin = pin.trim();
    if (!trimmedPin) {
      setLoginError(t("pin_required") || "PIN is required");
      shakeError();
      return false;
    }
    if (!/^[0-9]{6}$/.test(trimmedPin)) {
      setLoginError(t("invalid_pin") || "Enter valid 6-digit PIN");
      shakeError();
      return false;
    }
    setLoginError("");
    return true;
  }, [pin, t]);

  const validateForgotPhone = useCallback((): boolean => {
    const trimmedPhone = forgotPhone.trim();
    if (!trimmedPhone) {
      setForgotPhoneError(t("mobile_required"));
      return false;
    }
    if (!/^[0-9]{10}$/.test(trimmedPhone)) {
      setForgotPhoneError(t("invalid_mobile"));
      return false;
    }
    setForgotPhoneError("");
    return true;
  }, [forgotPhone, t]);

  const validateForgotEmail = useCallback((): boolean => {
    const trimmedEmail = forgotEmail.trim();
    if (!trimmedEmail) {
      setForgotEmailError(t("email_required"));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setForgotEmailError(t("invalid_email"));
      return false;
    }
    setForgotEmailError("");
    return true;
  }, [forgotEmail, t]);

  const clearErrors = () => {
    setPhoneError("");
    setLoginError("");
  };

  const clearForgotErrors = () => {
    setForgotPhoneError("");
    setForgotEmailError("");
  };

  const showToast = (
    type: "success" | "error",
    text1: string,
    text2?: string,
  ) => {
    Toast.show({
      type,
      text1,
      text2,
      visibilityTime: 3500,
      position: "top",
      topOffset: Platform.OS === "ios" ? 60 : 30,
      text1Style: {
        fontSize: 16,
        fontWeight: "600",
      },
      text2Style: {
        fontSize: 14,
      },
    });
  };

  const handleLogin = async () => {
    Keyboard.dismiss();
    clearErrors();

    if (!validatePhone() || !validatePin()) {
      showToast("error", t("validation_error"), t("please_fix_errors"));
      return;
    }

    setLoading(true);
    try {
      const fullPhoneNumber = `${selectedCountry.dialling_code}${phone}`;
      const userWithToken = await AuthService.login(fullPhoneNumber, pin);
      const { token, ...user } = userWithToken;
      await setSession({ token, user });

      showToast(
        "success",
        t("login_success") || "Login Successful!",
        t("welcome") || "Welcome back!",
      );

      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1500);
    } catch (err: any) {
      console.log("❌ Login failed:", err);

      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        t("login_failed") ||
        "Login failed";
      setLoginError(errorMsg);
      shakeError();
      showToast("error", t("login_failed"), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeForgotModal = () => {
    Keyboard.dismiss();
    setShowForgotModal(false);
    setForgotPhone("");
    setForgotEmail("");
    clearForgotErrors();
  };

  const handleForgotPassword = async () => {
    Keyboard.dismiss();
    clearForgotErrors();

    const isPhoneValid = validateForgotPhone();
    const isEmailValid = validateForgotEmail();

    if (!isPhoneValid || !isEmailValid) {
      showToast("error", t("validation_error"), t("please_fix_errors"));
      return;
    }

    setForgotLoading(true);
    try {
      const fullPhoneNumber = `${selectedCountry.dialling_code}${forgotPhone.trim()}`;
      const response: any = await AuthService.forgotPassword({
        phone: fullPhoneNumber,
        email: forgotEmail.trim().toLowerCase(),
      });

      showToast(
        "success",
        t("reset_request_sent"),
        response?.data?.message ||
          response?.message ||
          t("check_email_instructions"),
      );
      closeForgotModal();
    } catch (err: any) {
      console.log("❌ Forgot password failed:", err);

      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        t("forgot_password_failed");
      showToast("error", t("request_failed"), errorMsg);
    } finally {
      setForgotLoading(false);
    }
  };

  const renderCountryItem = useCallback(
    ({ item }: { item: Country }) => (
      <TouchableOpacity
        style={styles.countryItem}
        onPress={() => {
          setSelectedCountry(item);
          setShowCountryModal(false);
          setSearchQuery("");
        }}
        activeOpacity={0.7}
      >
        <span style={webStyle(styles.countryFlag)}>{item.flag}</span>
        <div style={webStyle(styles.countryInfo)}>
          <span style={webStyle(styles.countryName)}>{item.name}</span>
          <span style={webStyle(styles.countryCode)}>{item.dialling_code}</span>
        </div>
        {selectedCountry.code === item.code && (
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        )}
      </TouchableOpacity>
    ),
    [selectedCountry.code, colors.primary],
  );

  return (
    <div style={webStyle(styles.container)}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            <div
              style={webStyle([
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ])}
            >
              {/* Header Section */}
              <div style={webStyle(styles.headerSection)}>
                <span style={webStyle(styles.welcomeText)}>{t("welcome")}</span>
                <span style={webStyle(styles.subtitleText)}>
                  {t("continue_to_account")}
                </span>
              </div>

              {/* Login Form Card */}
              <div
                style={webStyle([
                  styles.formCard,
                  { transform: [{ translateX: shakeAnimation }] },
                ])}
              >
                {/* Phone Input */}
                <div style={webStyle(styles.inputGroup)}>
                  <span style={webStyle(styles.inputLabel)}>{t("phone_number")}</span>
                  <div style={webStyle(styles.phoneRow)}>
                    <TouchableOpacity
                      onPress={() => setShowCountryModal(true)}
                      style={[
                        styles.countryButton,
                        phoneError && styles.inputError,
                      ]}
                      activeOpacity={0.7}
                    >
                      <span style={webStyle(styles.flagText)}>
                        {selectedCountry.flag}
                      </span>
                      <span style={webStyle(styles.dialCode)}>
                        {selectedCountry.dialling_code}
                      </span>
                      <Ionicons name="chevron-down" size={16} color="#6B7280" />
                    </TouchableOpacity>

                    <div
                      style={webStyle([
                        styles.phoneInputContainer,
                        phoneError && styles.inputError,
                      ])}
                    >
                      <TextInput
                        ref={phoneInputRef}
                        style={styles.phoneInput}
                        placeholder={t("enter_phone")}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={10}
                        value={phone}
                        onChangeText={(text) => {
                          setPhone(text);
                          if (phoneError) setPhoneError("");
                        }}
                        onBlur={validatePhone}
                      />
                    </div>
                  </div>
                  {phoneError && (
                    <div style={webStyle(styles.errorContainer)}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <span style={webStyle(styles.errorText)}>{phoneError}</span>
                    </div>
                  )}
                </div>

                {/* PIN Input */}
                <div style={webStyle(styles.inputGroup)}>
                  <span style={webStyle(styles.inputLabel)}>{t("pin")}</span>
                  <div
                    style={webStyle([
                      styles.pinInputContainer,
                      loginError && styles.inputError,
                    ])}
                  >
                    <TextInput
                      ref={pinInputRef}
                      style={styles.pinInput}
                      placeholder={t("enter_pin")}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry={!showPin}
                      value={pin}
                      onChangeText={(text) => {
                        setPin(text);
                        if (loginError) setLoginError("");
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPin(!showPin)}
                      style={styles.eyeButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPin ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#6B7280"
                      />
                    </TouchableOpacity>
                  </div>
                  {loginError && (
                    <div style={webStyle(styles.errorContainer)}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <span style={webStyle(styles.errorText)}>{loginError}</span>
                    </div>
                  )}
                </div>

                {/* Forgot Password */}
                <TouchableOpacity
                  onPress={() => setShowForgotModal(true)}
                  style={styles.forgotButton}
                  activeOpacity={0.7}
                >
                  <span style={webStyle(styles.forgotText)}>{t("forgot_password")}</span>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={loading}
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <div style={webStyle(styles.loginButtonContent)}>
                        <Ionicons
                          name="log-in-outline"
                          size={20}
                          color="white"
                        />
                        <span style={webStyle(styles.loginButtonText)}>
                          {t("sign_in")}
                        </span>
                      </div>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity
                  onPress={() => router.push("/")}
                  style={styles.registerButton}
                  activeOpacity={0.7}
                >
                  <span style={webStyle(styles.registerText)}>
                    {t("dont_have_account")}{" "}
                    <span style={webStyle(styles.registerLink)}>{t("sign_up")}</span>
                  </span>
                </TouchableOpacity>
              </div>
            </div>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Country Selection Modal */}
      <KeyboardAwareModal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryModal(false)}
      >
        <div style={webStyle(styles.countryModalOverlay)}>
          <TouchableWithoutFeedback onPress={() => setShowCountryModal(false)}>
            <div style={webStyle(styles.modalBackdrop)} />
          </TouchableWithoutFeedback>

          <div style={webStyle(styles.countryModalContent)}>
            <div style={webStyle(styles.countryModalHeader)}>
              <div style={webStyle(styles.modalHandle)} />
              <div style={webStyle(styles.countryModalTitleRow)}>
                <span style={webStyle(styles.countryModalTitle)}>
                  {t("select_country")}
                </span>
                <TouchableOpacity
                  onPress={() => setShowCountryModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close-circle" size={28} color="#6B7280" />
                </TouchableOpacity>
              </div>

              <div style={webStyle(styles.searchContainer)}>
                <Ionicons name="search" size={20} color="#9CA3AF" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t("search_country_or_code")}
                  placeholderTextColor="#9CA3AF"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </div>
            </div>

            {countriesLoading ? (
              <div style={webStyle(styles.loadingContainer)}>
                <ActivityIndicator size="large" color={colors.primary} />
                <span style={webStyle(styles.loadingText)}>{t("loading_countries")}</span>
              </div>
            ) : (
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.id || item.code}
                renderItem={renderCountryItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.countryList}
                ListEmptyComponent={
                  <div style={webStyle(styles.emptyState)}>
                    <Ionicons name="globe-outline" size={48} color="#D1D5DB" />
                    <span style={webStyle(styles.emptyStateText)}>
                      {t("no_countries_found")}
                    </span>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </KeyboardAwareModal>

      {/* Forgot Password Modal */}
      <KeyboardAwareModal
        visible={showForgotModal}
        animationType="none"
        transparent={true}
        onRequestClose={closeForgotModal}
      >
        <div
          style={webStyle([
            styles.forgotModalOverlay,
            {
              opacity: forgotModalAnim,
              transform: [
                {
                  translateY: forgotModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0],
                  }),
                },
              ],
            },
          ])}
        >
          <TouchableWithoutFeedback onPress={closeForgotModal}>
            <div style={webStyle(styles.modalBackdrop)} />
          </TouchableWithoutFeedback>

          <ScrollView
            contentContainerStyle={styles.forgotScrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <div style={webStyle(styles.forgotModalContent)}>
              <div style={webStyle(styles.modalHandle)} />

              <div style={webStyle(styles.forgotHeader)}>
                <div style={webStyle(styles.forgotIconContainer)}>
                  <Ionicons
                    name="key-outline"
                    size={28}
                    color={colors.primary}
                  />
                </div>
                <span style={webStyle(styles.forgotTitle)}>{t("forgot_password")}</span>
                <span style={webStyle(styles.forgotSubtitle)}>
                  {t("forgot_password_help")}
                </span>
              </div>

              {/* Phone Input */}
              <div style={webStyle(styles.inputGroup)}>
                <span style={webStyle(styles.inputLabel)}>{t("mobile_number")}</span>
                <div style={webStyle(styles.phoneRow)}>
                  <TouchableOpacity
                    onPress={() => setShowCountryModal(true)}
                    style={[
                      styles.countryButtonSmall,
                      forgotPhoneError && styles.inputError,
                    ]}
                    activeOpacity={0.7}
                  >
                    <span style={webStyle(styles.flagText)}>{selectedCountry.flag}</span>
                    <span style={webStyle(styles.dialCodeSmall)}>
                      {selectedCountry.dialling_code}
                    </span>
                    <Ionicons name="chevron-down" size={14} color="#6B7280" />
                  </TouchableOpacity>

                  <div
                    style={webStyle([
                      styles.phoneInputContainer,
                      forgotPhoneError && styles.inputError,
                    ])}
                  >
                    <TextInput
                      ref={forgotPhoneInputRef}
                      style={styles.phoneInput}
                      placeholder={t("enter_mobile_number")}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={10}
                      value={forgotPhone}
                      onChangeText={(text) => {
                        setForgotPhone(text);
                        if (forgotPhoneError) setForgotPhoneError("");
                      }}
                      onBlur={validateForgotPhone}
                    />
                  </div>
                </div>
                {forgotPhoneError && (
                  <div style={webStyle(styles.errorContainer)}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <span style={webStyle(styles.errorTextSmall)}>
                      {forgotPhoneError}
                    </span>
                  </div>
                )}
              </div>

              {/* Email Input */}
              <div style={webStyle(styles.inputGroup)}>
                <span style={webStyle(styles.inputLabel)}>{t("email_address")}</span>
                <div
                  style={webStyle([
                    styles.emailInputContainer,
                    forgotEmailError && styles.inputError,
                  ])}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9CA3AF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={forgotEmailInputRef}
                    style={styles.emailInput}
                    placeholder={t("enter_email_address")}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={forgotEmail}
                    onChangeText={(text) => {
                      setForgotEmail(text);
                      if (forgotEmailError) setForgotEmailError("");
                    }}
                    onBlur={validateForgotEmail}
                  />
                </div>
                {forgotEmailError && (
                  <div style={webStyle(styles.errorContainer)}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <span style={webStyle(styles.errorTextSmall)}>
                      {forgotEmailError}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={webStyle(styles.forgotActions)}>
                <TouchableOpacity
                  onPress={closeForgotModal}
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                >
                  <span style={webStyle(styles.cancelButtonText)}>{t("cancel")}</span>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                  style={[
                    styles.submitButton,
                    forgotLoading && styles.buttonDisabled,
                  ]}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, "#7C3AED"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <div style={webStyle(styles.submitButtonContent)}>
                        <Ionicons name="send-outline" size={18} color="white" />
                        <span style={webStyle(styles.submitButtonText)}>
                          {t("send_reset_link")}
                        </span>
                      </div>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </div>
            </div>
          </ScrollView>
        </div>
      </KeyboardAwareModal>
    </div>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100vh",
  },
  gradient: {
    flex: 1,
    minHeight: "100vh",
  },
  decorativeCircle1: {
    position: "absolute",
    top: -100,
    left: -50,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorativeCircle2: {
    position: "absolute",
    top: height * 0.3,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  decorativeCircle3: {
    position: "absolute",
    bottom: -50,
    left: width * 0.3,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: isSmallDevice ? 24 : 48,
    paddingHorizontal: isSmallDevice ? 14 : 24,
  },
  content: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: isSmallDevice ? 18 : 26,
  },
  logoContainer: {
    marginBottom: isSmallDevice ? 14 : 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    width: isSmallDevice ? 72 : 100,
    height: isSmallDevice ? 72 : 100,
    borderRadius: isSmallDevice ? 20 : 30,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: isSmallDevice ? 28 : 34,
    fontWeight: "800",
    color: "white",
    marginBottom: 6,
    letterSpacing: 0,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: isSmallDevice ? 13 : 15,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
    lineHeight: isSmallDevice ? 19 : 22,
    fontWeight: "500",
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: isSmallDevice ? 20 : 24,
    padding: isSmallDevice ? 16 : 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.46)",
    shadowColor: "#1F2937",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 34,
    elevation: 12,
  },
  inputGroup: {
    marginBottom: isSmallDevice ? 14 : 20,
  },
  inputLabel: {
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: isSmallDevice ? 6 : 8,
    letterSpacing: 0,
  },
  phoneRow: {
    flexDirection: "row",
    gap: isSmallDevice ? 8 : 12,
  },
  countryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: isSmallDevice ? 12 : 14,
    paddingHorizontal: isSmallDevice ? 10 : 14,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: isSmallDevice ? 5 : 8,
  },
  countryButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 10 : 12,
    paddingVertical: isSmallDevice ? 12 : 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  flagText: {
    fontSize: isSmallDevice ? 18 : 22,
  },
  dialCode: {
    fontSize: isSmallDevice ? 13 : 16,
    fontWeight: "600",
    color: "#374151",
  },
  dialCodeSmall: {
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "600",
    color: "#374151",
  },
  phoneInputContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: isSmallDevice ? 12 : 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minHeight: isSmallDevice ? 48 : 54,
    overflow: "hidden",
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
  },
  pinInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: isSmallDevice ? 12 : 14,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minHeight: isSmallDevice ? 48 : 54,
  },
  pinInput: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
  },
  eyeButton: {
    padding: isSmallDevice ? 10 : 12,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  errorText: {
    color: "#EF4444",
    fontSize: isSmallDevice ? 11 : 13,
    fontWeight: "500",
  },
  errorTextSmall: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: isSmallDevice ? 16 : 24,
  },
  forgotText: {
    color: "#7C3AED",
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "600",
  },
  loginButton: {
    borderRadius: isSmallDevice ? 14 : 18,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loginButtonGradient: {
    paddingVertical: isSmallDevice ? 13 : 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "white",
    fontSize: isSmallDevice ? 15 : 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButton: {
    alignItems: "center",
    marginTop: isSmallDevice ? 14 : 20,
  },
  registerText: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#6B7280",
  },
  registerLink: {
    color: "#7C3AED",
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
  },
  countryModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  countryModalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    width: "100%",
    maxWidth: 520,
    maxHeight: height * (isSmallDevice ? 0.68 : 0.75),
  },
  countryModalHeader: {
    padding: isSmallDevice ? 14 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  countryModalTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  countryModalTitle: {
    fontSize: isSmallDevice ? 18 : 22,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: isSmallDevice ? 9 : 12,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isSmallDevice ? 10 : 14,
    paddingHorizontal: isSmallDevice ? 14 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  countryFlag: {
    fontSize: isSmallDevice ? 22 : 28,
    marginRight: isSmallDevice ? 10 : 16,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  countryCode: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#6B7280",
  },
  countryList: {
    paddingBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    marginTop: 12,
    color: "#9CA3AF",
    fontSize: 14,
  },
  forgotModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  forgotKeyboardView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  forgotScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
  },
  forgotModalContent: {
    backgroundColor: "white",
    borderRadius: 8,
    width: "100%",
    maxWidth: 520,
    padding: isSmallDevice ? 16 : 24,
    minHeight: height * (isSmallDevice ? 0.44 : 0.5),
  },
  forgotHeader: {
    alignItems: "center",
    marginBottom: isSmallDevice ? 20 : 32,
  },
  forgotIconContainer: {
    width: isSmallDevice ? 50 : 64,
    height: isSmallDevice ? 50 : 64,
    borderRadius: isSmallDevice ? 12 : 16,
    backgroundColor: "#F3E8FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: isSmallDevice ? 10 : 16,
  },
  forgotTitle: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  forgotSubtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: isSmallDevice ? 17 : 20,
  },
  emailInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: isSmallDevice ? 12 : 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: isSmallDevice ? 12 : 16,
  },
  inputIcon: {
    marginRight: isSmallDevice ? 8 : 12,
  },
  emailInput: {
    flex: 1,
    paddingVertical: isSmallDevice ? 12 : 16,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
  },
  forgotActions: {
    flexDirection: "row",
    gap: isSmallDevice ? 8 : 12,
    marginTop: isSmallDevice ? 16 : 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 12 : 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: isSmallDevice ? 14 : 16,
  },
  submitButton: {
    flex: 2,
    borderRadius: isSmallDevice ? 12 : 16,
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: isSmallDevice ? 12 : 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "white",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "700",
    letterSpacing: 0,
  },
});
