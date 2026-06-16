"use client";

// app/expense/[id].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  webStyle,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ArrowLeft, Trash2, Pencil, Calendar, User, Building2, ReceiptText } from 'lucide-react-native';
import { colors } from '@/colors';
import { Expense } from '@/types/expense.types';
import expenseService from '@/services/ExpenseService';
import { formatDateValue } from '@/utils/date';
import { extractEntityPayload } from '@/utils/response';

const TYPE_CONFIG: Record<string, { bg: string; text: string; color: string; label: string; icon: any }> = {
  party: { bg: '#EDE9FE', text: '#7C3AED', color: '#7C3AED', label: 'Party Paid', icon: Building2 },
  user: { bg: '#D1FAE5', text: '#059669', color: '#059669', label: 'User Paid', icon: User },
};

const getTypeTheme = (type?: string) => {
  const key = type?.toLowerCase() || '';
  return TYPE_CONFIG[key] || { bg: colors.gray100, text: colors.gray600, color: colors.gray500, label: type || 'Unknown', icon: ReceiptText };
};

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: false }).start();
  }, []);

  const fetchExpense = useCallback(async () => {
  if (!id) return;

  try {
    setLoading(true);

    const res = await expenseService.fetchExpenseById(id);
    console.log('[ExpenseDetail] Fetched:', res);

    if (res.success) {
      setExpense(extractEntityPayload<Expense>(res));
    }

  } catch (error: any) {
    console.error('[ExpenseDetail] Error:', error);
    Alert.alert('Error', 'Failed to load expense details');
  } finally {
    setLoading(false);
  }
}, [id]);
  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            setDeleting(true);
            try {
              const res = await expenseService.deleteExpense(id);
              if (res.success) {
                Alert.alert('Deleted', 'Expense deleted successfully', [
                  { text: 'OK', onPress: () => router.back() },
                ]);
              } else {
                Alert.alert('Error', res.message || 'Failed to delete expense');
              }
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete expense');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (value?: any) =>
    formatDateValue(value, 'dd MMM yyyy, hh:mm a');

  const payerType = expense?.paidByType || expense?.paidByAccountType || (expense?.partyId ? 'party' : 'user');
  const typeTheme = getTypeTheme(payerType);
  const TypeIcon = typeTheme.icon;
  const paidByName =
    expense?.paidByName ||
    expense?.paidByAccountName ||
    expense?.paidBy ||
    'Unknown';
  const paidToName = expense?.paidToName || expense?.title || '—';
  const description = expense?.description || expense?.message || '—';

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>Expense Details</span>
            <div style={webStyle({ width: 38 })} />
          </div>
          <div style={webStyle(styles.loadingWrap)}>
            <ActivityIndicator size="large" color={colors.primary} />
            <span style={webStyle(styles.loadingText)}>Loading details...</span>
          </div>
        </SafeAreaView>
      </>
    );
  }

  if (!expense) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.container} edges={['top']}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>Expense Details</span>
            <div style={webStyle({ width: 38 })} />
          </div>
          <div style={webStyle(styles.loadingWrap)}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.gray300} />
            <span style={webStyle(styles.emptyTitle)}>Expense not found</span>
            <TouchableOpacity style={styles.retryBtn} onPress={() => router.back()}>
              <span style={webStyle(styles.retryBtnText)}>Go Back</span>
            </TouchableOpacity>
          </div>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.container} edges={['top']}>
        <div style={webStyle([styles.flex1, { opacity: fadeAnim }])}>
          <div style={webStyle(styles.header)}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={22} color={colors.gray800} />
            </TouchableOpacity>
            <span style={webStyle(styles.headerTitle)}>Expense Details</span>
            <div style={webStyle(styles.headerActions)}>
              <TouchableOpacity onPress={() => router.push(`/expense/edit/${id}` as any)} style={styles.editBtn}>
                <Pencil size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={deleting}>
                {deleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Trash2 size={16} color="#EF4444" />}
              </TouchableOpacity>
            </div>
          </div>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <div style={webStyle([styles.typeBanner, { backgroundColor: typeTheme.bg }])}>
              <div style={webStyle([styles.typeBannerIcon, { backgroundColor: typeTheme.color }])}>
                <TypeIcon size={20} color="#fff" />
              </div>
              <div style={webStyle(styles.typeBannerInfo)}>
                <span style={webStyle([styles.typeBannerLabel, { color: typeTheme.text }])}>{paidToName}</span>
                <span style={webStyle([styles.typeBannerSub, { color: typeTheme.text }])}>{typeTheme.label}</span>
              </div>
            </div>

            <div style={webStyle(styles.amountCard)}>
              <span style={webStyle(styles.amountLabel)}>Amount</span>
              <span style={webStyle([styles.amountValue, { color: typeTheme.color }])}>₹{expense.amount.toLocaleString('en-IN')}</span>
            </div>

            <div style={webStyle(styles.infoSection)}>
              <div style={webStyle(styles.infoRow)}>
                <div style={webStyle([styles.infoIconWrap, { backgroundColor: colors.primaryPale }])}>
                  <User size={16} color={colors.primary} />
                </div>
                <div style={webStyle(styles.infoContent)}>
                  <span style={webStyle(styles.infoLabel)}>Paid By</span>
                  <span style={webStyle(styles.infoValue)}>{paidByName}</span>
                </div>
              </div>
              <div style={webStyle(styles.infoDivider)} />
              <div style={webStyle(styles.infoRow)}>
                <div style={webStyle([styles.infoIconWrap, { backgroundColor: typeTheme.bg }])}>
                  <Building2 size={16} color={typeTheme.color} />
                </div>
                <div style={webStyle(styles.infoContent)}>
                  <span style={webStyle(styles.infoLabel)}>Paid By Type</span>
                  <span style={webStyle(styles.infoValue)}>{String(payerType || 'user').toUpperCase()}</span>
                </div>
              </div>
              <div style={webStyle(styles.infoDivider)} />
              <div style={webStyle(styles.infoRow)}>
                <div style={webStyle([styles.infoIconWrap, { backgroundColor: colors.primaryPale }])}>
                  <ReceiptText size={16} color={colors.primary} />
                </div>
                <div style={webStyle(styles.infoContent)}>
                  <span style={webStyle(styles.infoLabel)}>Paid To</span>
                  <span style={webStyle(styles.infoValue)}>{paidToName}</span>
                </div>
              </div>
              <div style={webStyle(styles.infoDivider)} />
              <div style={webStyle(styles.infoRow)}>
                <div style={webStyle([styles.infoIconWrap, { backgroundColor: colors.primaryPale }])}>
                  <Calendar size={16} color={colors.primary} />
                </div>
                <div style={webStyle(styles.infoContent)}>
                  <span style={webStyle(styles.infoLabel)}>Date</span>
                  <span style={webStyle(styles.infoValue)}>{formatDate(expense.date || expense.createdAt)}</span>
                </div>
              </div>
            </div>

            {description && description !== '—' && (
              <div style={webStyle(styles.messageCard)}>
                <span style={webStyle(styles.messageLabel)}>Description</span>
                <span style={webStyle(styles.messageText)}>{description}</span>
              </div>
            )}

            <div style={webStyle({ height: 40 })} />
          </ScrollView>
        </div>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.gray100, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryPale, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: colors.gray400 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray500, marginTop: 8 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, marginTop: 16 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  typeBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, padding: 18, marginBottom: 14 },
  typeBannerIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  typeBannerInfo: {},
  typeBannerLabel: { fontSize: 20, fontWeight: '800' },
  typeBannerSub: { fontSize: 13, marginTop: 2, opacity: 0.8 },
  amountCard: { backgroundColor: colors.white, borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.gray200 },
  amountLabel: { fontSize: 13, color: colors.gray500, marginBottom: 8 },
  amountValue: { fontSize: 36, fontWeight: '800' },
  infoSection: { backgroundColor: colors.white, borderRadius: 16, padding: 4, marginBottom: 14, borderWidth: 1, borderColor: colors.gray200 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  infoIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, color: colors.gray400, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: colors.gray800 },
  infoDivider: { height: 1, backgroundColor: colors.gray100, marginHorizontal: 14 },
  messageCard: { backgroundColor: colors.gray50, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.gray200 },
  messageLabel: { fontSize: 12, fontWeight: '600', color: colors.gray500, marginBottom: 8 },
  messageText: { fontSize: 14, color: colors.gray700, lineHeight: 20 },
});
