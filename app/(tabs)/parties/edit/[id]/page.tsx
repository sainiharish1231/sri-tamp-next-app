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

export default function EditPartyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [initialFormData, setInitialFormData] = useState<any>();

  const extractPhoneWithoutCode = (
    fullPhone: string,
    diallingCode?: string,
  ): string => {
    if (!fullPhone) return "";
    if (diallingCode && fullPhone.startsWith(diallingCode)) {
      return fullPhone.replace(diallingCode, "");
    }
    const digits = fullPhone.replace(/\D/g, "");
    return digits;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const countriesResponse: any =
          await CountriesService.fetchAllCategory();
        const countriesData = extractCountries(countriesResponse);

        const partyResponse: any = await PartyService.fetchPartyById(
          id as string,
        );
        console.log("Edit party response:", JSON.stringify(partyResponse));

        if (!partyResponse.success) {
          throw new Error(partyResponse.message || "Failed to load party data");
        }

        const partyData =
          PartyService.extractParty<any>(partyResponse) || partyResponse.data;
        if (!partyData || typeof partyData !== "object") {
          console.error("Invalid party data received:", partyData);
          throw new Error("Party data not found in response");
        }

        const bankDetailsResponse = await PartyService.fetchPartyBankDetails(
          id as string,
        ).catch(() => null);
        const bankDetails =
          PartyService.extractParty<any>(bankDetailsResponse) ||
          bankDetailsResponse?.data?.data ||
          {};

        const matchedCountry = countriesData.find(
          (c: Country) =>
            c.id === partyData.countryId ||
            c.code === partyData.countryCode ||
            c.dialling_code === partyData.diallingCode,
        );

        const india = countriesData.find(
          (c: Country) =>
            c.name?.toLowerCase() === "india" ||
            c.code === "IN" ||
            c.dialling_code === "+91",
        );

        const defaultCountry = matchedCountry || india;
        const defaultDiallingCode =
          partyData.diallingCode || defaultCountry?.dialling_code || "+91";
        const defaultCountryCode =
          partyData.countryCode || defaultCountry?.code || "IN";
        const defaultCountryId = defaultCountry?.id || "";

        setInitialFormData({
          id: partyData.id || (id as string),
          name: partyData.name || "",
          userName: partyData.userName || partyData.contactPerson || "",
          contactPerson: partyData.contactPerson || partyData.userName || "",
          mobile: extractPhoneWithoutCode(
            partyData.mobile || "",
            defaultDiallingCode,
          ),
          address: partyData.address || "",
          email: partyData.email || "",
          gstNumber: partyData.gstNumber || "",
          panNumber: partyData.panNumber || "",
          accountHolderName:
            bankDetails.accountHolderName || partyData.accountHolderName || "",
          accountNumber: bankDetails.accountNumber || partyData.accountNumber || "",
          bankName: bankDetails.bankName || partyData.bankName || "",
          branchName: bankDetails.branchName || partyData.branchName || "",
          ifscCode: bankDetails.ifscCode || partyData.ifscCode || "",
          accountType: bankDetails.accountType || partyData.accountType || "",
          currentBalance: String(
            partyData.currentBalance ?? partyData.balance ?? partyData.openingBalance ?? 0,
          ),
          countryId: defaultCountryId,
          countryCode: defaultCountryCode,
          diallingCode: defaultDiallingCode,
          isActive: partyData.isActive ?? true,
        });
      } catch (error: any) {
        console.error("Fetch error:", error);
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
          <span style={webStyle(styles.headerTitle)}>Edit Party</span>
          <div style={webStyle({ width: 40 })} />
        </div>
        <div style={webStyle(styles.loadingContainer)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>Loading party data...</span>
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
        <span style={webStyle(styles.headerTitle)}>Edit Party</span>
        <div style={webStyle({ width: 40 })} />
      </div>

      <PartyForm
        existingParty={initialFormData}
        isEditing={true}
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
