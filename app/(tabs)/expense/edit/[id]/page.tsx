"use client";

// app/expense/edit/[id].tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams } from "@/compat/expo-router";

import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  webStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/colors';
import { CreateExpenseDto, Expense } from '@/types/expense.types';
import expenseService from '@/services/ExpenseService';
import ExpenseForm from '@/components/ExpenseForm';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

const fetchExpense = useCallback(async () => {
  if (!id) return;

  try {
    setLoading(true);

    const res = await expenseService.fetchExpenseById(id);

    if (res.success) {
      const data = res.data;

      setExpense(
        data ? ("data" in data ? data.data : data) : null
      );
    } else {
      Alert.alert('Error', 'Failed to load expense');
    }

  } catch (error: any) {
    Alert.alert('Error', 'Failed to load expense details');
  } finally {
    setLoading(false);
  }
}, [id]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  const handleSubmit = async (data: CreateExpenseDto) => {
    if (!id) return;
    try {
      setUpdating(true);
      const res = await expenseService.updateExpense(id, data);
      if (res.success) {
        Alert.alert('Success', 'Expense updated successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', res.message || 'Failed to update expense');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update expense');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <div style={webStyle(styles.container)}>
          <SafeAreaView style={styles.headerSafe} edges={['top']}>
            <div style={webStyle(styles.header)}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={22} color={colors.gray800} />
              </TouchableOpacity>
              <div style={webStyle(styles.headerCenter)}>
                <span style={webStyle(styles.headerTitle)}>Edit Expense</span>
              </div>
              <div style={webStyle({ width: 38 })} />
            </div>
          </SafeAreaView>
          <div style={webStyle(styles.loadingWrap)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>Loading expense...</span>
          </div>
        </div>
      </>
    );
  }

  if (!expense) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <div style={webStyle(styles.container)}>
          <SafeAreaView style={styles.headerSafe} edges={['top']}>
            <div style={webStyle(styles.header)}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={22} color={colors.gray800} />
              </TouchableOpacity>
              <div style={webStyle(styles.headerCenter)}>
                <span style={webStyle(styles.headerTitle)}>Edit Expense</span>
              </div>
              <div style={webStyle({ width: 38 })} />
            </div>
          </SafeAreaView>
          <div style={webStyle(styles.loadingWrap)}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
            <span style={webStyle(styles.emptyTitle)}>Expense not found</span>
            <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
              <span style={webStyle(styles.retryBtnText)}>Go Back</span>
            </TouchableOpacity>
          </div>
        </div>
      </>
    );
  }

  const initialData: Partial<CreateExpenseDto> = {
    title: expense.title || expense.paidToName || '',
    paidToName: expense.paidToName || expense.title || '',
    description: expense.description || expense.message || '',
    amount: expense.amount,
    date: expense.date || expense.createdAt,
    paidById:
      expense.paidById ||
      expense.paidByAccountId ||
      expense.paidBy ||
      expense.partyId ||
      '',
    paidByType:
      expense.paidByType ||
      expense.paidByAccountType ||
      (expense.partyId ? 'party' : 'user'),
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <div style={webStyle(styles.container)}>
        <SafeAreaView style={styles.headerSafe} edges={['top']}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <div style={webStyle(styles.headerCenter)}>
              <span style={webStyle(styles.headerTitle)}>Edit Expense</span>
            </div>
            <div style={webStyle({ width: 38 })} />
          </div>
        </SafeAreaView>
        <ExpenseForm initialData={initialData} onSubmit={handleSubmit} isLoading={updating} submitButtonText="Update Expense" />
      </div>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSafe: { backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.gray400 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray500, marginTop: 8 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 16 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
