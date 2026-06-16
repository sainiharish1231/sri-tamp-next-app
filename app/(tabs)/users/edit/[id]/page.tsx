"use client";

import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  webStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import UserService from "@/services/UserService";
import CountriesService from "@/services/CountriesService";
import { colors } from "@/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserForm, UserFormData } from "@/components/UserForm";
import { getDeviceMetrics } from "@/utils/responsive";
import { extractEntityPayload } from "@/utils/response";

const { isXs: isSmallDevice, isMd: isTablet } = getDeviceMetrics();

interface Country {
  id: string;
  name: string;
  code: string;
  dialling_code: string;
  flag: string;
}

const extractCountries = (response: any): Country[] => {
  const data = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(data) ? data : [];
};

export default function EditUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [initialFormData, setInitialFormData] = useState<
    Partial<UserFormData> | undefined
  >();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const countriesResponse: any =
          await CountriesService.fetchAllCategory();
        const countriesData = extractCountries(countriesResponse);
        setCountries(countriesData);

        const userResponse = await UserService.fetchUserById(id!);
        console.log("[EditUser] User response:", JSON.stringify(userResponse));

        if (!userResponse.success || !userResponse.data) {
          throw new Error(userResponse.message || "Failed to load user data");
        }

        const userData =
          extractEntityPayload<any>(userResponse) || userResponse.data;

        setInitialFormData({
          name: userData.name || "",
          phone: userData.phone || "",
          balance: Number(userData.balance ?? userData.currentBalance ?? 0),
          role:
            userData.role === "admin"
              ? "internal_user"
              : (userData.role as "internal_user" | "user" | "party"),
          email: userData.email || "",
          address: userData.address || "",
          gstNumber: userData.gstNumber || "",
          countryCode: userData.countryCode || "",
          diallingCode: userData.diallingCode || "",
          isActive: userData.isActive ?? true,
        });
      } catch (error: any) {
        console.error("[EditUser] Fetch error:", error);
        Alert.alert("Error", error.message || "Failed to load data");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, router]);

  const handleSubmit = async (formData: UserFormData) => {
    setSubmitting(true);
    try {
      console.log("[EditUser] Submitting update:", {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
      });

      const payload: Record<string, any> = {
        phone: formData.phone,
        countryCode: formData.countryCode,
        diallingCode: formData.diallingCode,
        balance: Number(formData.balance) || 0,
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.name.trim()) {
        payload.name = formData.name.trim();
      }
      if (formData.email) {
        payload.email = formData.email.trim();
      }
      if (formData.pin) {
        payload.pin = formData.pin;
      }

      console.log("[EditUser] Final payload:", JSON.stringify(payload));

      const res = await UserService.updateUser(id!, payload);

      if (res.success) {
        Alert.alert("Success", res.message || "User updated successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to update user");
      }
    } catch (error: any) {
      console.error("[EditUser] Error updating user:", error);
      Alert.alert("Error", error.message || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !initialFormData) {
    return (
      <SafeAreaView style={styles.container}>
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>Edit User</span>
          <div style={webStyle(styles.headerPlaceholder)} />
        </div>
        <div style={webStyle(styles.loadingContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>Loading user data...</span>
        </div>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <span style={webStyle(styles.headerTitle)}>Edit User</span>
        <div style={webStyle(styles.headerPlaceholder)} />
      </div>

      <UserForm
        initialData={initialFormData}
        countries={countries}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isEditing={true}
        loading={submitting}
      />
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 16 : 20,
    paddingVertical: isTablet ? 20 : isSmallDevice ? 12 : 16,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerTitle: {
    fontSize: isTablet ? 24 : isSmallDevice ? 18 : 20,
    fontWeight: "700" as const,
    color: "white",
  },
  headerPlaceholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.gray500,
  },
});
