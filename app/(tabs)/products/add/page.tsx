"use client";

import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";

import { router, Stack } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { colors } from "@/colors";

export default function AddProductScreen() {
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
        <span style={webStyle(styles.title)}>Add Product</span>
        <div style={webStyle(styles.placeholder)} />
      </div>
      <ProductForm />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
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
});
