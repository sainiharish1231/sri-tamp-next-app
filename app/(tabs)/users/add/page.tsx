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
import { useRouter } from "next/navigation";
import UserService from "@/services/UserService";
import CountriesService from "@/services/CountriesService";
import { colors } from "@/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserForm, UserFormData } from "@/components/UserForm";
import { getDeviceMetrics } from "@/utils/responsive";

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

export default function AddUserScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [fetchingCountries, setFetchingCountries] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response: any = await CountriesService.fetchAllCategory();
        const countriesData = extractCountries(response);
        setCountries(countriesData);
      } catch (error) {
        console.log("[AddUser] Failed to fetch countries:", error);
        Alert.alert("Error", "Failed to load countries");
      } finally {
        setFetchingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  const handleSubmit = async (formData: UserFormData) => {
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        balance: formData.balance,
        role: formData.role,
        countryCode: formData.countryCode,
        diallingCode: formData.diallingCode,
        email: formData.email || "",
        address: formData.address || "",
        pin: formData.pin || undefined,
        isActive: formData.isActive,
      };


      const res = await UserService.createUser(payload);

      if (res.success) {
        Alert.alert("Success", res.message || "User created successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to create user");
      }
    } catch (error: any) {
      console.error("[AddUser] Error creating user:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create user",
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchingCountries) {
    return (
      <SafeAreaView style={styles.container}>
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>Add New User</span>
          <div style={webStyle(styles.headerPlaceholder)} />
        </div>
        <div style={webStyle(styles.loadingContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>Loading countries...</span>
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
        <span style={webStyle(styles.headerTitle)}>Add New User</span>
        <div style={webStyle(styles.headerPlaceholder)} />
      </div>

      <UserForm
        countries={countries}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isEditing={false}
        loading={loading}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
