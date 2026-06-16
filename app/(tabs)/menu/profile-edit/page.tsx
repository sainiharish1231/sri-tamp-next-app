"use client";

import React, { useCallback, useEffect, useState } from "react";
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
import { Stack, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  IndianRupee,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
} from "lucide-react-native";
import { colors } from "@/colors";
import PartyService from "@/services/PartyService";
import UserService from "@/services/UserService";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId, extractUserId } from "@/utils/access";
import { getDeviceMetrics } from "@/utils/responsive";

const responsive = getDeviceMetrics();
const headerActionSize = responsive.isXs ? 36 : 40;

const firstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
};

const isSuccessfulResponse = (response: any) =>
  response?.success !== false && response?.data?.success !== false;

const digitsOnly = (value: unknown) => String(value ?? "").replace(/\D/g, "");

const normalizeDiallingCode = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return "+91";
  if (text.startsWith("+")) return `+${digitsOnly(text) || "91"}`;
  return `+${digitsOnly(text) || "91"}`;
};

const normalizeCountryCode = (value: unknown) =>
  firstText(value, "IN").toUpperCase();

const toBalanceText = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? String(parsed) : "0";
};

const extractProfileEntity = (response: any) => {
  const candidates = [
    response?.data?.data,
    response?.data?.user,
    response?.data,
    response?.user,
    response,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate[0] || null;
    if (!candidate || typeof candidate !== "object") continue;
    if (candidate.user && typeof candidate.user === "object") {
      return candidate.user;
    }
    if (candidate.data && typeof candidate.data === "object") {
      return Array.isArray(candidate.data)
        ? candidate.data[0] || null
        : candidate.data;
    }
    return candidate;
  }

  return null;
};

type ProfileForm = {
  name: string;
  phone: string;
  countryCode: string;
  diallingCode: string;
  balance: string;
  email: string;
  address: string;
};

export default function ProfileEditScreen() {
  const router = useRouter();
  const { session, setSession } = useAuthStore();
  const sessionUser = session?.user;
  const sessionUserId = extractUserId(sessionUser);
  const sessionPartyId = extractPartyId(sessionUser);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchedUser, setFetchedUser] = useState<any>(sessionUser || null);
  const [fetchedParty, setFetchedParty] = useState<any>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    phone: "",
    countryCode: "IN",
    diallingCode: "+91",
    balance: "0",
    email: "",
    address: "",
  });

  const updateField = (key: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const loadProfile = useCallback(async () => {
    if (!sessionUser) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let nextUser: any = sessionUser;
      let nextParty: any = null;

      if (sessionUserId) {
        const userRes = await UserService.fetchUserById(sessionUserId);
        if (isSuccessfulResponse(userRes)) {
          nextUser = extractProfileEntity(userRes) || nextUser;
        }
      } else if (sessionPartyId) {
        const userRes = await UserService.fetchUserByPartyId(sessionPartyId);
        if (isSuccessfulResponse(userRes)) {
          nextUser = extractProfileEntity(userRes) || nextUser;
        }
      }

      if (sessionPartyId) {
        const partyRes =
          await PartyService.fetchPartyWithBankDetails(sessionPartyId);
        if (isSuccessfulResponse(partyRes)) {
          nextParty = PartyService.extractParty<any>(partyRes);
        }
      }

      setFetchedUser(nextUser);
      setFetchedParty(nextParty);
      setForm({
        name: firstText(nextUser?.name, nextParty?.name),
        phone: digitsOnly(
          firstText(nextUser?.phone, nextParty?.mobile, nextParty?.phone),
        ),
        countryCode: normalizeCountryCode(
          firstText(nextUser?.countryCode, nextParty?.countryCode),
        ),
        diallingCode: normalizeDiallingCode(
          firstText(nextUser?.diallingCode, nextParty?.diallingCode),
        ),
        balance: toBalanceText(
          nextUser?.balance ??
            nextUser?.currentBalance ??
            nextParty?.currentBalance ??
            nextParty?.balance ??
            nextUser?.openingBalance ??
            nextParty?.openingBalance,
        ),
        email: firstText(nextUser?.email, nextParty?.email),
        address: firstText(nextUser?.address, nextParty?.address),
      });
    } catch (error) {
      console.log("[ProfileEdit] Failed to load profile:", error);
      Alert.alert("Error", "Failed to load profile details");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [router, sessionPartyId, sessionUser, sessionUserId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    const name = form.name.trim();
    const phone = digitsOnly(form.phone);
    const countryCode = normalizeCountryCode(form.countryCode);
    const diallingCode = normalizeDiallingCode(form.diallingCode);
    const balance = Number(form.balance || 0);
    const email = form.email.trim();
    const address = form.address.trim();
    const userId = extractUserId(fetchedUser) || sessionUserId;
    const partyId = extractPartyId(fetchedUser) || sessionPartyId;

    if (!name) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }

    if (phone.length < 4 || phone.length > 15) {
      Alert.alert(
        "Invalid phone",
        "Phone number must contain 4 to 15 digits.",
      );
      return;
    }

    if (!Number.isFinite(balance)) {
      Alert.alert("Invalid balance", "Balance must be a valid number.");
      return;
    }

    if (!partyId && balance < 0) {
      Alert.alert("Invalid balance", "Balance cannot be negative.");
      return;
    }

    if (!userId && !partyId) {
      Alert.alert("Error", "Profile account was not found.");
      return;
    }

    try {
      setSaving(true);
      const userPayload: Record<string, any> = {
        name,
        phone,
        countryCode,
        diallingCode,
      };
      if (balance >= 0) {
        userPayload.balance = balance;
      }
      const existingRole = fetchedUser?.role || sessionUser?.role;
      if (["internal_user", "user", "party"].includes(existingRole)) {
        userPayload.role = existingRole;
      }
      if (email) userPayload.email = email;
      if (
        fetchedUser?.isActive !== undefined ||
        sessionUser?.isActive !== undefined
      ) {
        userPayload.isActive = fetchedUser?.isActive ?? sessionUser?.isActive;
      }
      let updatedParty = fetchedParty;

      if (userId) {
        await UserService.updateUser(userId, userPayload);
      }

      if (partyId) {
        const partyPayload: Record<string, any> = {
          name,
          userName: firstText(fetchedParty?.userName, fetchedParty?.contactPerson),
          mobile: phone,
          countryCode,
          diallingCode,
          currentBalance: balance,
          email: email || fetchedParty?.email || "",
          address,
          gstNumber: fetchedParty?.gstNumber || "",
          panNumber: fetchedParty?.panNumber || "",
          accountHolderName: fetchedParty?.accountHolderName || "",
          accountNumber: fetchedParty?.accountNumber || "",
          bankName: fetchedParty?.bankName || "",
          branchName: fetchedParty?.branchName || "",
          ifscCode: fetchedParty?.ifscCode || "",
          accountType: fetchedParty?.accountType || "",
          isActive: fetchedParty?.isActive ?? true,
        };
        await PartyService.updateParty(partyId, partyPayload);
        updatedParty = {
          ...(fetchedParty || {}),
          ...partyPayload,
          id: partyId,
        };
      }

      await setSession({
        token: session?.token || sessionUser?.token,
        user: {
          ...(sessionUser || {}),
          ...(fetchedUser || {}),
          ...userPayload,
          address,
          id: userId || sessionUser?.id,
          partyId,
          party: updatedParty || sessionUser?.party,
        },
      });

      Alert.alert("Success", "Profile updated successfully.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.log("[ProfileEdit] Failed to update profile:", error);
      Alert.alert("Error", error?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    key: keyof ProfileForm,
    label: string,
    icon: React.ReactNode,
    options: {
      keyboardType?: "default" | "email-address" | "phone-pad";
      multiline?: boolean;
      maxLength?: number;
    } = {},
  ) => (
    <div style={webStyle(styles.field)}>
      <span style={webStyle(styles.label)}>{label}</span>
      <div
        style={webStyle([
          styles.inputWrap,
          options.multiline && styles.inputWrapMultiline,
        ])}
      >
        <div style={webStyle(styles.inputIcon)}>{icon}</div>
        <TextInput
          style={[styles.input, options.multiline && styles.inputMultiline]}
          value={form[key]}
          onChangeText={(value) => updateField(key, value)}
          placeholder={label}
          placeholderTextColor={colors.gray400}
          keyboardType={options.keyboardType || "default"}
          multiline={options.multiline}
          maxLength={options.maxLength}
          textAlignVertical={options.multiline ? "top" : "center"}
        />
      </div>
    </div>
  );

  const renderPhoneInput = () => (
    <div style={webStyle(styles.field)}>
      <span style={webStyle(styles.label)}>Phone</span>
      <div style={webStyle(styles.phoneGroup)}>
        <div style={webStyle(styles.countryMiniInput)}>
          <span style={webStyle(styles.miniLabel)}>Country</span>
          <TextInput
            style={styles.miniInput}
            value={form.countryCode}
            onChangeText={(value) =>
              updateField("countryCode", value.replace(/[^a-zA-Z]/g, "").slice(0, 3))
            }
            placeholder="IN"
            placeholderTextColor={colors.gray400}
            autoCapitalize="characters"
            maxLength={3}
          />
        </div>
        <div style={webStyle(styles.dialMiniInput)}>
          <span style={webStyle(styles.miniLabel)}>Code</span>
          <TextInput
            style={styles.miniInput}
            value={form.diallingCode}
            onChangeText={(value) => updateField("diallingCode", value)}
            placeholder="+91"
            placeholderTextColor={colors.gray400}
            keyboardType="phone-pad"
            maxLength={5}
          />
        </div>
        <div style={webStyle(styles.phoneMainInput)}>
          <div style={webStyle(styles.inputIcon)}>
            <Phone size={18} color={colors.primary} />
          </div>
          <TextInput
            style={styles.input}
            value={form.phone}
            onChangeText={(value) => updateField("phone", digitsOnly(value))}
            placeholder="Phone number"
            placeholderTextColor={colors.gray400}
            keyboardType="phone-pad"
            maxLength={15}
          />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={["top"]}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>Edit Profile</span>
            <div style={webStyle(styles.headerSpacer)} />
          </div>
          <div style={webStyle(styles.centerState)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.stateText)}>Loading profile...</span>
          </div>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <KeyboardAvoidingView
          style={styles.flex1}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <div style={webStyle(styles.header)}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>Edit Profile</span>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveHeaderBtn, saving && styles.actionDisabled]}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.primaryDark} />
              ) : (
                <Save size={18} color={colors.primaryDark} />
              )}
            </TouchableOpacity>
          </div>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <div style={webStyle(styles.heroCard)}>
              <div style={webStyle(styles.avatar)}>
                <span style={webStyle(styles.avatarText)}>
                  {firstText(form.name, "User").charAt(0).toUpperCase()}
                </span>
              </div>
              <div style={webStyle(styles.heroTextWrap)}>
                <span style={webStyle(styles.heroTitle)}>
                  {firstText(form.name, "User")}
                </span>
                <span style={webStyle(styles.heroSubtitle)}>
                  Keep your account details up to date
                </span>
              </div>
            </div>

            <div style={webStyle(styles.formCard)}>
              {renderInput(
                "name",
                "Name",
                <User size={18} color={colors.primary} />,
              )}
              {renderPhoneInput()}
              {renderInput(
                "balance",
                "Balance",
                <IndianRupee size={18} color={colors.primary} />,
                { keyboardType: "phone-pad" },
              )}
              {renderInput(
                "email",
                "Email",
                <Mail size={18} color={colors.primary} />,
                { keyboardType: "email-address" },
              )}
              {renderInput(
                "address",
                "Address",
                <MapPin size={18} color={colors.primary} />,
                { multiline: true },
              )}
            </div>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.actionDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Save size={18} color="#fff" />
              )}
              <span style={webStyle(styles.saveBtnText)}>
                {saving ? "Saving..." : "Save Changes"}
              </span>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: responsive.space,
    paddingVertical: responsive.isXs ? 10 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: headerActionSize,
    height: headerActionSize,
    borderRadius: responsive.radius,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  saveHeaderBtn: {
    width: headerActionSize,
    height: headerActionSize,
    borderRadius: responsive.radius,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: { width: headerActionSize },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
    fontSize: responsive.font.lg,
    fontWeight: "800",
    color: colors.gray900,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: responsive.space,
  },
  stateText: { fontSize: responsive.font.md, color: colors.gray500 },
  content: {
    padding: responsive.space,
    gap: responsive.space,
    paddingBottom: 120,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 12 : 14,
    backgroundColor: colors.primary,
    borderRadius: responsive.isXs ? 16 : 20,
    padding: responsive.cardPadding,
  },
  avatar: {
    width: responsive.isXs ? 52 : 60,
    height: responsive.isXs ? 52 : 60,
    borderRadius: responsive.isXs ? 16 : 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: responsive.isXs ? 24 : 28,
    fontWeight: "900",
  },
  heroTextWrap: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontSize: responsive.font.xl,
    fontWeight: "900",
    color: colors.white,
  },
  heroSubtitle: {
    marginTop: 4,
    fontSize: responsive.font.sm,
    color: "#E0E7FF",
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: responsive.isXs ? 14 : 18,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: responsive.cardPadding,
    gap: responsive.isXs ? 12 : 14,
  },
  inlineRow: {
    flexDirection: "row",
    gap: responsive.isXs ? 8 : 10,
  },
  inlineField: { flex: 1, minWidth: 0 },
  phoneGroup: {
    minHeight: responsive.isXs ? 54 : 58,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: responsive.radius,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    paddingHorizontal: responsive.isXs ? 8 : 10,
    gap: responsive.isXs ? 6 : 8,
  },
  countryMiniInput: {
    width: responsive.isXs ? 54 : 62,
    borderRightWidth: 1,
    borderRightColor: colors.gray200,
    paddingRight: responsive.isXs ? 6 : 8,
  },
  dialMiniInput: {
    width: responsive.isXs ? 58 : 66,
    borderRightWidth: 1,
    borderRightColor: colors.gray200,
    paddingRight: responsive.isXs ? 6 : 8,
  },
  miniLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.gray400,
    textTransform: "uppercase",
  },
  miniInput: {
    marginTop: 2,
    paddingVertical: 0,
    color: colors.gray900,
    fontSize: responsive.font.sm,
    fontWeight: "900",
  },
  phoneMainInput: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: responsive.isXs ? 8 : 10,
  },
  field: { gap: 6 },
  label: {
    fontSize: responsive.font.sm,
    fontWeight: "800",
    color: colors.gray700,
  },
  inputWrap: {
    minHeight: responsive.isXs ? 48 : 52,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: responsive.radius,
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
    paddingHorizontal: responsive.isXs ? 10 : 12,
    gap: responsive.isXs ? 8 : 10,
  },
  inputWrapMultiline: {
    minHeight: 96,
    alignItems: "flex-start",
    paddingTop: responsive.isXs ? 10 : 12,
  },
  inputIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: colors.gray900,
    fontSize: responsive.font.md,
    fontWeight: "600",
    paddingVertical: 0,
  },
  inputMultiline: {
    minHeight: 74,
    paddingTop: 2,
    paddingBottom: 8,
  },
  saveBtn: {
    minHeight: responsive.isXs ? 48 : 52,
    borderRadius: responsive.radius,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: responsive.font.md,
    fontWeight: "900",
  },
  actionDisabled: { opacity: 0.65 },
});
