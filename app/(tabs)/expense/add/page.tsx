"use client";

import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Alert, webStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft } from "lucide-react";
import { colors } from "@/colors";
import { CreateExpenseDto } from "@/types/expense.types";
import expenseService from "@/services/ExpenseService";
import ExpenseForm from "@/components/ExpenseForm";

export default function AddExpenseScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: CreateExpenseDto) => {
    try {
      setLoading(true);
      const res = await expenseService.addNewExpense(data);

      if (res.success) {
        Alert.alert("Success", "Expense added successfully", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Failed to add expense");
      }
    } catch (error: any) {
      console.log("[AddExpense] Error:", error);
      Alert.alert("Error", error?.message || "Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={["top"]}>
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <ArrowLeft size={22} />
          </TouchableOpacity>
          <div style={webStyle(styles.headerCenter)}>
            <span style={webStyle(styles.headerTitle)}>Add Expense</span>
          </div>
          <div style={webStyle({ width: 38 })} />
        </div>

        <ExpenseForm
          onSubmit={handleSubmit}
          isLoading={loading}
          submitButtonText="Add Expense"
        />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.gray900 },
});
