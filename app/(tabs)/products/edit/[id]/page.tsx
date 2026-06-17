"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "@/utils/toast";

import { useLocalSearchParams } from "@/compat/expo-router";

import { TouchableOpacity, StyleSheet, ActivityIndicator, webStyle } from "react-native";
import { ChevronLeft } from "lucide-react";
import ProductForm from "@/components/ProductForm";
import ProductService from "@/services/ProductService";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "@/utils/Toast";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await ProductService.fetchProductById(id!);
      console.log("[EditProduct] fetchProduct response:", response);
      if (response?.data) {
        setProduct(response.data);
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Product not found",
        });
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load product",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#8b5cf6" />
        <span style={webStyle(styles.loadingText)}>Loading product...</span>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <span style={webStyle(styles.title)}>Edit Product</span>
        <div style={webStyle(styles.placeholder)} />
      </div>

      {product ? (
        <ProductForm existingProduct={product} isEditMode={true} />
      ) : (
        <div style={webStyle(styles.notFound)}>
          <span style={webStyle(styles.notFoundText)}>Product not found</span>
          <TouchableOpacity
            style={styles.goBackBtn}
            onPress={() => router.back()}
          >
            <span style={webStyle(styles.goBackText)}>Go Back</span>
          </TouchableOpacity>
        </div>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700" as const,
    color: "#1F2937",
    textAlign: "center",
    marginLeft: -32,
  },
  placeholder: {
    width: 32,
  },
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notFoundText: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 16,
  },
  goBackBtn: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  goBackText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
