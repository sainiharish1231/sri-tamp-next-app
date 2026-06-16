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
import PartyService from "@/services/PartyService";
import CountriesService from "@/services/CountriesService";
import { colors } from "@/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import PartyForm from "@/components/PartyForm";
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

export default function AddPartyScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [fetchingCountries, setFetchingCountries] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response: any = await CountriesService.fetchAllCategory();
        setCountries(extractCountries(response));
      } catch (error) {
        console.error("Failed to fetch countries:", error);
      } finally {
        setFetchingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  const handleSubmit = async (formData: any) => {
    setLoading(true);
    try {
      const selectedCountry = countries.find(
        (c) =>
          c.id === formData.countryId ||
          c.code === formData.countryCode ||
          c.dialling_code === formData.diallingCode,
      );
      if (!selectedCountry && (!formData.countryCode || !formData.diallingCode)) {
        Alert.alert("Error", "Please select a valid country");
        return;
      }

      const res: any = await PartyService.addNewParty({
        name: formData.name,
        userName: formData.userName || "",
        mobile: formData.mobile.trim(),
        address: formData.address || "",
        email: formData.email || "",
        gstNumber: formData.gstNumber || "",
        panNumber: formData.panNumber || "",
        accountHolderName: formData.accountHolderName || "",
        accountNumber: formData.accountNumber || "",
        bankName: formData.bankName || "",
        branchName: formData.branchName || "",
        ifscCode: formData.ifscCode || "",
        accountType: formData.accountType || "",
        currentBalance: Number(formData.currentBalance) || 0,
        countryCode: formData.countryCode || selectedCountry?.code,
        diallingCode:
          formData.diallingCode || selectedCountry?.dialling_code,
        isActive: formData.isActive,
      });

      if (res.success) {
        Alert.alert("Success", res.message || "Party created successfully", [
          { text: "OK", onPress: () => router.replace("/parties" as any) },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to create party");
      }
    } catch (error: any) {
      console.error("Error creating party:", error);
      Alert.alert("Error", error.message || "Failed to create party");
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
          <span style={webStyle(styles.headerTitle)}>Add New Party</span>
          <div style={webStyle({ width: 40 })} />
        </div>
        <div style={webStyle(styles.loadingContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>Loading...</span>
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
        <span style={webStyle(styles.headerTitle)}>Add New Party</span>
        <div style={webStyle({ width: 40 })} />
      </div>

      <PartyForm
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: colors.primarytext,
  },
});
