import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  Switch,
  webStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "@/compat/expo-router";

import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  RotateCw,
  Check,
} from "lucide-react";
import PartyService from "@/services/PartyService";
import ProductService from "@/services/ProductService";
import MaterialService from "@/services/MaterialService";
import TransactionService from "@/services/TransactionService";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import { generateText } from "@rork-ai/toolkit-sdk";
import { useAuthStore } from "@/store/auth.store";
import { getDeviceMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";
import { useRouter } from "next/router";

const { width: SCREEN_WIDTH, isXs: isSmallDevice } = getDeviceMetrics();

type ItemType = "metal" | "product";
type TransactionType =
  | "purchase"
  | "sales"
  | "purchase_return"
  | "sales_return";
type RateMode = "fixed" | "unfixed";
type GstType = "cgst_sgst" | "igst";
type PriorityType = "low" | "medium" | "high";

interface BaseItem {
  id: string;
  itemType: ItemType;
  ratePerKg: number;
  weightKg: number;
  totalAmount: number;
  name: string;
  weightUnit: string;
}

interface MetalItem extends BaseItem {
  itemType: "metal";
  metalId: string;
  kg: number;
  gram: number;
}

interface ProductItem extends BaseItem {
  itemType: "product";
  productId: string;
  weightPerUnitKg: number;
  quantity: number;
  originalRate: number;
}

type TransactionItemType = MetalItem | ProductItem;

interface GstData {
  includeGst: boolean;
  gstType: GstType;
  gstRate: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

interface TransactionData {
  partyId: string;
  partyName: string;
  transactionDate: string;
  transactionType: TransactionType;
  priority: PriorityType;
  note: string;
  items: TransactionItemType[];
  totalWeight: number;
  totalAmount: number;
  gst?: GstData;
  grandTotal: number;
}

export interface ExistingTransaction {
  id: string;
  transactionType?: string;
  partyId?: string;
  partyName?: string;
  transactionDate?: string;
  priority?: string;
  note?: string;
  items?: any[];
  totalWeight?: number;
  totalAmount?: number;
  gst?: any;
  grandTotal?: number;
}

interface TransactionFormProps {
  existingTransaction?: ExistingTransaction;
}

const TRANSACTION_TYPES: {
  key: TransactionType;
  label: string;
  color: string;
  bg: string;
}[] = [
  { key: "purchase", label: "Purchase", color: "#7C3AED", bg: "#EDE9FE" },
  { key: "sales", label: "Sales", color: "#059669", bg: "#D1FAE5" },
  {
    key: "purchase_return",
    label: "Purchase Return",
    color: "#D97706",
    bg: "#FEF3C7",
  },
  {
    key: "sales_return",
    label: "Sales Return",
    color: "#DC2626",
    bg: "#FEE2E2",
  },
];

const PAGE_SIZE = 20;
const GST_RATES = [5, 12, 18, 28];

const renderTypeIcon = (key: string, size: number, color: string) => {
  if (key === "purchase") return <ArrowDownLeft size={size} color={color} />;
  if (key === "sales") return <ArrowUpRight size={size} color={color} />;
  if (key === "purchase_return") return <RotateCcw size={size} color={color} />;
  if (key === "sales_return") return <RotateCw size={size} color={color} />;
  return null;
};

export default function TransactionForm({
  existingTransaction,
}: TransactionFormProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ partyId?: string; returnTo?: string }>();
  const { t } = useLanguage();
  const isEditMode = !!existingTransaction;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const partyReturnPath =
    params.returnTo === "party" && params.partyId
      ? (`/parties/partiesDigital/${params.partyId}` as any)
      : null;
  const transactionReturnPath =
    params.returnTo === "transaction" ? ("/transaction" as any) : null;
  const saveReturnPath =
    partyReturnPath || transactionReturnPath || ("/transaction" as any);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, []);

  const normalizeTransactionType = (type?: string): TransactionType => {
    const normalized = type?.toLowerCase().replace(/\s+/g, "_") || "purchase";
    if (
      ["purchase", "sales", "purchase_return", "sales_return"].includes(
        normalized,
      )
    ) {
      return normalized as TransactionType;
    }
    return "purchase";
  };

  const buildInitialTransaction = (): TransactionData => {
    if (existingTransaction) {
      const items: TransactionItemType[] = (
        existingTransaction.items || []
      ).map((item: any) => {
        if (item.itemType === "product") {
          return {
            id: item.id || `product-${Date.now()}-${Math.random()}`,
            itemType: "product" as const,
            productId: item.productId || "",
            name: item.name || "",
            weightPerUnitKg: Number(item.weightPerUnitKg || 0),
            quantity: Number(item.quantity || item.orderedQty || 1),
            ratePerKg: Number(item.ratePerKg || 0),
            weightKg: Number(item.weightKg || 0),
            totalAmount: Number(item.totalAmount || 0),
            originalRate: Number(item.ratePerKg || 0),
            weightUnit: item.weightUnit || "kg",
          } as ProductItem;
        }
        return {
          id: item.id || `metal-${Date.now()}-${Math.random()}`,
          itemType: "metal" as const,
          metalId: item.metalId || "",
          name: item.name || "",
          kg: Number(item.kg || 0),
          gram: Number(item.gram || 0),
          ratePerKg: Number(item.ratePerKg || 0),
          weightKg: Number(item.weightKg || 0),
          totalAmount: Number(item.totalAmount || 0),
          weightUnit: item.weightUnit || "kg",
        } as MetalItem;
      });

      return {
        partyId: existingTransaction.partyId || "",
        partyName: existingTransaction.partyName || "",
        transactionDate: existingTransaction.transactionDate
          ? existingTransaction.transactionDate.split("T")[0]
          : new Date().toISOString().split("T")[0],
        transactionType: normalizeTransactionType(
          existingTransaction.transactionType,
        ),
        priority: (existingTransaction.priority || "high") as PriorityType,
        note: existingTransaction.note || "",
        items,
        totalWeight: Number(existingTransaction.totalWeight || 0),
        totalAmount: Number(existingTransaction.totalAmount || 0),
        gst: existingTransaction.gst || undefined,
        grandTotal: Number(
          existingTransaction.grandTotal ||
            existingTransaction.totalAmount ||
            0,
        ),
      };
    }
    return {
      partyId: "",
      partyName: "",
      transactionDate: new Date().toISOString().split("T")[0],
      transactionType: "purchase",
      priority: "high" as PriorityType,
      note: "",
      items: [],
      totalWeight: 0,
      totalAmount: 0,
      grandTotal: 0,
    };
  };

  const [transaction, setTransaction] = useState<TransactionData>(
    buildInitialTransaction,
  );
  const [rateMode, setRateMode] = useState<RateMode>("fixed");
  const [globalRate, setGlobalRate] = useState("");

  const [includeGst, setIncludeGst] = useState<boolean>(
    existingTransaction?.gst?.includeGst || false,
  );
  const [gstType, setGstType] = useState<GstType>(
    existingTransaction?.gst?.gstType || "cgst_sgst",
  );
  const [gstRate, setGstRate] = useState<number>(
    existingTransaction?.gst?.gstRate || 18,
  );

  const gstCalculation = useMemo(() => {
    if (!includeGst) {
      return {
        gstAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        grandTotal: transaction.totalAmount,
      };
    }
    const subtotal = transaction.totalAmount;
    const gstAmount = subtotal * (gstRate / 100);
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    if (gstType === "cgst_sgst") {
      cgstAmount = gstAmount / 2;
      sgstAmount = gstAmount / 2;
    } else {
      igstAmount = gstAmount;
    }
    const grandTotal = subtotal + gstAmount;
    return { gstAmount, cgstAmount, sgstAmount, igstAmount, grandTotal };
  }, [includeGst, gstType, gstRate, transaction.totalAmount]);

  const [allParties, setAllParties] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allMaterials, setAllMaterials] = useState<any[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(
    null,
  );
  const [isSearchModalVisible, setIsSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "products" | "metals">(
    "all",
  );
  const [isPartyModalVisible, setIsPartyModalVisible] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [selectedPartyDetails, setSelectedPartyDetails] = useState<any>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [productsHasMore, setProductsHasMore] = useState(true);
  const [materialsPage, setMaterialsPage] = useState(1);
  const [materialsHasMore, setMaterialsHasMore] = useState(true);
  const [isRewritingNote, setIsRewritingNote] = useState(false);

  useEffect(() => {
    if (existingTransaction || !params.partyId || transaction.partyId) return;
    setTransaction((prev) => ({ ...prev, partyId: String(params.partyId) }));
  }, [existingTransaction, params.partyId, transaction.partyId]);
  const [currentUserPartyDetails, setCurrentUserPartyDetails] =
    useState<any>(null);

  const filteredParties = useMemo(() => {
    if (partySearchQuery.trim()) {
      const query = partySearchQuery.toLowerCase();
      return allParties.filter(
        (party) =>
          party.name?.toLowerCase().includes(query) ||
          party.partyType?.toLowerCase().includes(query) ||
          party.mobile?.toLowerCase().includes(query),
      );
    }
    return allParties;
  }, [partySearchQuery, allParties]);

  const fetchParties = async () => {
    try {
      setPartiesLoading(true);
      const res = await PartyService.fetchPartiesDropdown();
      if (res.success) {
        setAllParties(PartyService.extractPartyList(res));
      } else {
        setAllParties([]);
      }
    } catch (error) {
      console.log("[TransactionForm] Error fetching party dropdown:", error);
      setAllParties([]);
    } finally {
      setPartiesLoading(false);
    }
  };

  const loadSelectedPartyDetails = useCallback(async (partyId: string) => {
    if (!partyId) {
      setSelectedPartyDetails(null);
      return;
    }

    try {
      const res = await PartyService.fetchPartyWithBankDetails(partyId);
      if (res.success) {
        const party = PartyService.extractParty<any>(res);
        setSelectedPartyDetails(party);
        if (party?.name) {
          setTransaction((prev) =>
            prev.partyId === partyId && !prev.partyName
              ? { ...prev, partyName: party.name }
              : prev,
          );
        }
      }
    } catch (error) {
      console.log(
        "[TransactionForm] Error fetching selected party details:",
        error,
      );
    }
  }, []);

  const fetchProducts = async (page = 1, searchTerm = "") => {
    try {
      setProductsLoading(true);
      const params: Record<string, any> = { limit: PAGE_SIZE, page };
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const res = await ProductService.fetchAllProducts({ params });
      if (res.success) {
        const data = res.data?.data || res.data || [];
        const items = Array.isArray(data) ? data : [];
        if (page === 1) {
          setAllProducts(items);
        } else {
          setAllProducts((prev) => [...prev, ...items]);
        }
        setProductsHasMore(items.length >= PAGE_SIZE);
        setProductsPage(page);
      }
    } catch (error) {
      console.log("[TransactionForm] Error fetching products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchMaterials = async (page = 1) => {
    try {
      setMaterialsLoading(true);
      const params: Record<string, any> = { limit: PAGE_SIZE, page };
      const res = await MaterialService.fetchAllMaterial({ params });
      if (res.success) {
        const data = res.data?.data || res.data || [];
        const items = Array.isArray(data) ? data : [];
        if (page === 1) {
          setAllMaterials(items);
        } else {
          setAllMaterials((prev) => [...prev, ...items]);
        }
        setMaterialsHasMore(items.length >= PAGE_SIZE);
        setMaterialsPage(page);
      }
    } catch (error) {
      console.log("[TransactionForm] Error fetching materials:", error);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const loadMoreProducts = useCallback(() => {
    if (!productsLoading && productsHasMore)
      fetchProducts(productsPage + 1, searchQuery);
  }, [productsLoading, productsHasMore, productsPage, searchQuery]);

  const loadMoreMaterials = useCallback(() => {
    if (!materialsLoading && materialsHasMore)
      fetchMaterials(materialsPage + 1);
  }, [materialsLoading, materialsHasMore, materialsPage]);

  useEffect(() => {
    const init = async () => {
      setIsLoadingInitial(true);
      const fetchUserParty = async () => {
        try {
          const session: any = useAuthStore.getState().session;
          if (session?.user?.partyId) {
            console.log(
              "[TransactionForm] Fetching current user party:",
              session.user.partyId,
            );
            const res = await PartyService.fetchPartyWithBankDetails(
              session.user.partyId,
            );
            if (res.success) {
              const data = res.data?.data || res.data;
              setCurrentUserPartyDetails(data);
              console.log("[TransactionForm] User party loaded:", data?.name);
            }
          }
        } catch (error) {
          console.log("[TransactionForm] Error fetching user party:", error);
        }
      };
      await Promise.all([
        fetchParties(),
        fetchProducts(1),
        fetchMaterials(1),
        fetchUserParty(),
      ]);
      setIsLoadingInitial(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!transaction.partyId) {
      setSelectedPartyDetails(null);
      return;
    }
    loadSelectedPartyDetails(transaction.partyId);
  }, [transaction.partyId, loadSelectedPartyDetails]);

  useEffect(() => {
    if (rateMode === "unfixed" && globalRate) {
      const rate = parseFloat(globalRate) || 0;
      const updatedItems = transaction.items.map((item) => {
        if (item.itemType === "product") {
          const p = item as ProductItem;
          const totalWt = (p.quantity || 1) * (p.weightPerUnitKg || 0);
          return {
            ...p,
            ratePerKg: rate,
            weightKg: totalWt,
            totalAmount: totalWt * rate,
          };
        }
        const m = item as MetalItem;
        return { ...m, ratePerKg: rate, totalAmount: m.weightKg * rate };
      });
      const totalWeight = updatedItems.reduce(
        (s, i) => s + (i.weightKg || 0),
        0,
      );
      const totalAmount = updatedItems.reduce(
        (s, i) => s + (i.totalAmount || 0),
        0,
      );
      setTransaction((prev) => ({
        ...prev,
        items: updatedItems as TransactionItemType[],
        totalWeight,
        totalAmount,
      }));
    }
  }, [globalRate, rateMode]);

  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const results: any[] = [];
    const filteredProducts = query
      ? allProducts.filter((p) => p.name?.toLowerCase().includes(query))
      : allProducts;
    filteredProducts.forEach((product) => {
      const weightStr = product.productDetail?.weight || "0";
      const weightNum =
        parseFloat(String(weightStr).replace(/[^0-9.]/g, "")) || 0;
      results.push({
        id: product.id,
        name: product.name,
        type: "product",
        price: product.productDetail?.price || 0,
        weight: weightNum,
        weightUnit: String(weightStr).replace(/[0-9.\s]/g, "") || "kg",
        designCode: product.designCode || "",
        data: product,
      });
    });
    const filteredMaterials = query
      ? allMaterials.filter((m) => m.name?.toLowerCase().includes(query))
      : allMaterials;
    filteredMaterials.forEach((material) => {
      results.push({
        id: material.id,
        name: material.name,
        type: "metal",
        price: material.rate || 0,
        data: material,
      });
    });
    return results;
  }, [searchQuery, allProducts, allMaterials]);

  const filteredResults = useMemo(() => {
    if (activeTab === "all") return searchResults;
    return searchResults.filter((item) =>
      activeTab === "products"
        ? item.type === "product"
        : item.type === "metal",
    );
  }, [searchResults, activeTab]);

  const handleSearchInputChange = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) fetchProducts(1, query);
  };

  const handleOpenSearch = (index: number) => {
    setActiveSearchIndex(index);
    setIsSearchModalVisible(true);
    setSearchQuery("");
    setActiveTab("all");
  };

  const handleSelectItem = (index: number, result: any) => {
    const items = [...transaction.items];
    let newItem: TransactionItemType;
    const rate =
      rateMode === "unfixed" && globalRate
        ? parseFloat(globalRate) || 0
        : parseFloat(String(result.price)) || 0;

    if (result.type === "product") {
      let weightPerUnitKg = 0;
      const rawWeight = result.weight || 0;
      const rawUnit = (result.weightUnit || "kg").toLowerCase();
      if (rawUnit === "g" || rawUnit === "gm" || rawUnit === "gram") {
        weightPerUnitKg = rawWeight / 1000;
      } else {
        weightPerUnitKg = rawWeight;
      }
      const totalWt = weightPerUnitKg * 1;
      newItem = {
        itemType: "product",
        id: `product-${Date.now()}-${Math.random()}`,
        productId: result.data.id,
        name: result.data.name,
        weightPerUnitKg,
        quantity: 1,
        ratePerKg: rate,
        weightKg: totalWt,
        totalAmount: totalWt * rate,
        originalRate: parseFloat(String(result.price)) || 0,
        weightUnit: result.weightUnit || "kg",
      } as ProductItem;
    } else {
      newItem = {
        itemType: "metal",
        id: `metal-${Date.now()}-${Math.random()}`,
        metalId: result.data.id,
        name: result.data.name,
        kg: 0,
        gram: 0,
        ratePerKg: rate,
        weightKg: 0,
        totalAmount: 0,
        weightUnit: "kg",
      } as MetalItem;
    }

    if (index < items.length) {
      items[index] = newItem;
    } else {
      items.unshift(newItem);
    }
    updateTotals(items);
    setIsSearchModalVisible(false);
  };

  const updateItem = (index: number, updates: Partial<TransactionItemType>) => {
    const items = [...transaction.items];
    const item = { ...items[index], ...updates } as TransactionItemType;
    if (item.itemType === "product") {
      const productItem = item as ProductItem;
      productItem.weightKg =
        (productItem.quantity || 1) * (productItem.weightPerUnitKg || 0);
      productItem.totalAmount = productItem.weightKg * productItem.ratePerKg;
      items[index] = productItem;
    } else {
      const metalItem = item as MetalItem;
      metalItem.weightKg = (metalItem.kg || 0) + (metalItem.gram || 0) / 1000;
      metalItem.totalAmount = metalItem.weightKg * metalItem.ratePerKg;
      items[index] = metalItem;
    }
    updateTotals(items);
  };

  const updateTotals = (items: TransactionItemType[]) => {
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weightKg || 0),
      0,
    );
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0,
    );
    setTransaction((prev) => ({ ...prev, items, totalWeight, totalAmount }));
  };

  const deleteItem = (index: number) => {
    Alert.alert("Remove Item", "Are you sure you want to remove this item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          updateTotals(transaction.items.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= transaction.items.length) return;
    const items = [...transaction.items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    updateTotals(items);
  };

  const handlePartySelect = async (party: any) => {
    let transType = transaction.transactionType;
    if (party.partyType?.toLowerCase().includes("customer"))
      transType = "sales";
    else if (party.partyType?.toLowerCase().includes("supplier"))
      transType = "purchase";
    let partyDetails = party;
    try {
      const res = await PartyService.fetchPartyWithBankDetails(party.id);
      partyDetails = PartyService.extractParty<any>(res) || party;
    } catch {
      partyDetails = party;
    }
    setSelectedPartyDetails(partyDetails);
    setTransaction((prev) => ({
      ...prev,
      partyId: party.id,
      partyName: party.name,
      transactionType: transType,
    }));
    setIsPartyModalVisible(false);
  };

  const handleAINoteRewrite = async () => {
    if (!transaction.note || !transaction.note.trim() || isRewritingNote)
      return;
    setIsRewritingNote(true);
    try {
      const rewritten = await generateText({
        messages: [
          {
            role: "user",
            content: `Rewrite the following transaction note to be more professional and clear. Keep key details. Only return the rewritten text:\n\n"${transaction.note}"`,
          },
        ],
      });
      if (rewritten && rewritten.trim())
        setTransaction((prev) => ({ ...prev, note: rewritten.trim() }));
    } catch (err) {
      console.log("AI note rewrite error:", err);
    } finally {
      setIsRewritingNote(false);
    }
  };

  const currentTypeConfig = TRANSACTION_TYPES.find(
    (t) => t.key === transaction.transactionType,
  );

  const buildPdfHtml = (
    txnData: TransactionData,
    gstCalc: typeof gstCalculation,
  ): string => {
    const selectedParty =
      selectedPartyDetails?.id === txnData.partyId
        ? selectedPartyDetails
        : allParties.find((p) => p.id === txnData.partyId);
    const partyGst = selectedParty?.gstNumber || "";
    const partyMobile = selectedParty?.mobile || "";
    const partyEmail = selectedParty?.email || "";
    const partyAddress = selectedParty?.address || "";
    const partyType =
      selectedParty?.partyType || selectedParty?.partyTypeId || "";
    const partyPan = selectedParty?.panNumber || "";
    const partyAccountHolder = selectedParty?.accountHolderName || "";
    const partyAccount = selectedParty?.accountNumber || "";
    const partyBank = selectedParty?.bankName || "";
    const partyBranch = selectedParty?.branchName || "";
    const partyIfsc = selectedParty?.ifscCode || "";
    const partyAccountType = selectedParty?.accountType || "";
    const partyContactPerson = selectedParty?.contactPerson || "";
    const partyBalance =
      selectedParty?.currentBalance ?? selectedParty?.openingBalance;
    const currentUser: any = useAuthStore.getState().session?.user;
    const userParty = currentUserPartyDetails;
    const typeConfig = TRANSACTION_TYPES.find(
      (t) => t.key === txnData.transactionType,
    );
    const typeLabel = typeConfig?.label || txnData.transactionType;
    const typeColor = typeConfig?.color || colors.primary;
    const itemRows = txnData.items
      .map((item, idx) => {
        const isMetal = item.itemType === "metal";
        const qty = isMetal ? "-" : String((item as ProductItem).quantity);
        const wtPerUnit = isMetal
          ? "-"
          : (item as ProductItem).weightPerUnitKg.toFixed(3);
        return `<tr><td>${idx + 1}</td><td>${item.name}<br/><small style="color:#888">${isMetal ? "Metal" : "Product"}</small></td><td>${qty}</td><td>${wtPerUnit}</td><td>${item.weightKg.toFixed(3)} kg</td><td>₹${item.ratePerKg.toLocaleString("en-IN")}</td><td style="text-align:right;font-weight:600">₹${item.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
      })
      .join("");
    let gstSection = "";
    if (includeGst) {
      if (gstType === "cgst_sgst") {
        gstSection = `<tr><td colspan="6" style="text-align:right;color:#555">CGST @ ${gstRate / 2}%</td><td style="text-align:right">₹${gstCalc.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr><tr><td colspan="6" style="text-align:right;color:#555">SGST @ ${gstRate / 2}%</td><td style="text-align:right">₹${gstCalc.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
      } else {
        gstSection = `<tr><td colspan="6" style="text-align:right;color:#555">IGST @ ${gstRate}%</td><td style="text-align:right">₹${gstCalc.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>`;
      }
    }
    const partyDetailsHtml = `
      <div style="display:flex;gap:20px;margin-bottom:20px">
        <div style="flex:1;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:14px">
          <div style="font-size:12px;font-weight:700;color:${typeColor};margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid ${typeColor};padding-bottom:6px">From Party</div>
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${userParty?.name || "San Raj Metal Arts"}</div>
          ${currentUser?.name ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Contact:</strong> ${currentUser.name}</div>` : ""}
          ${currentUser?.phone || userParty?.mobile ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Phone:</strong> ${currentUser?.phone || userParty?.mobile}</div>` : ""}
          ${currentUser?.email || userParty?.email ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Email:</strong> ${currentUser?.email || userParty?.email}</div>` : ""}
          ${userParty?.address ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Address:</strong> ${userParty.address}</div>` : ""}
          ${userParty?.gstNumber ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>GST:</strong> ${userParty.gstNumber}</div>` : ""}
          ${userParty?.panNumber ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>PAN:</strong> ${userParty.panNumber}</div>` : ""}
          ${userParty?.accountNumber ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Account:</strong> ${userParty.accountNumber}</div>` : ""}
          ${userParty?.contactPerson ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Contact Person:</strong> ${userParty.contactPerson}</div>` : ""}
        </div>
        <div style="flex:1;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:14px">
          <div style="font-size:12px;font-weight:700;color:${typeColor};margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid ${typeColor};padding-bottom:6px">To Party</div>
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-bottom:4px">${txnData.partyName || "N/A"}</div>
          ${partyType ? `<div style="font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:.3px">${partyType}</div>` : ""}
          ${partyContactPerson ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Contact Person:</strong> ${partyContactPerson}</div>` : ""}
          ${partyMobile ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Phone:</strong> ${partyMobile}</div>` : ""}
          ${partyEmail ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Email:</strong> ${partyEmail}</div>` : ""}
          ${partyAddress ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Address:</strong> ${partyAddress}</div>` : ""}
          ${(partyGst || partyPan) ? `<div style="font-size:11px;color:#888;margin:8px 0 3px;text-transform:uppercase;font-weight:700">Tax Details</div>` : ""}
          ${partyGst ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>GST:</strong> ${partyGst}</div>` : ""}
          ${partyPan ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>PAN:</strong> ${partyPan}</div>` : ""}
          ${(partyAccountHolder || partyAccount || partyBank || partyBranch || partyIfsc || partyAccountType) ? `<div style="font-size:11px;color:#888;margin:8px 0 3px;text-transform:uppercase;font-weight:700">Account Details</div>` : ""}
          ${partyAccountHolder ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Account Holder:</strong> ${partyAccountHolder}</div>` : ""}
          ${partyAccount ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Account:</strong> ${partyAccount}</div>` : ""}
          ${partyBank ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Bank:</strong> ${partyBank}</div>` : ""}
          ${partyBranch ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Branch:</strong> ${partyBranch}</div>` : ""}
          ${partyIfsc ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>IFSC:</strong> ${partyIfsc}</div>` : ""}
          ${partyAccountType ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Account Type:</strong> ${partyAccountType}</div>` : ""}
          ${partyBalance !== undefined && partyBalance !== null ? `<div style="font-size:12px;color:#555;margin-bottom:2px"><strong>Balance:</strong> ₹${Number(partyBalance).toLocaleString("en-IN")}</div>` : ""}
        </div>
      </div>`;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{font-family:'Helvetica Neue',Arial,sans-serif;padding:30px;color:#1a1a1a;font-size:13px}.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid ${typeColor};padding-bottom:16px;margin-bottom:20px}.company{font-size:22px;font-weight:700;color:${typeColor}}.company-sub{font-size:11px;color:#666;margin-top:2px}.txn-badge{background:${typeColor};color:#fff;padding:6px 16px;border-radius:6px;font-weight:600;font-size:13px;text-transform:uppercase}.info-grid{display:flex;gap:20px;margin-bottom:20px}.info-box{flex:1;background:#f8f9fc;border:1px solid #e5e7eb;border-radius:8px;padding:12px}.info-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}.info-value{font-size:14px;font-weight:600;color:#1a1a1a}table{width:100%;border-collapse:collapse;margin-top:10px}th{background:#f3f0ff;color:#5b21b6;font-size:11px;text-transform:uppercase;letter-spacing:.3px;padding:10px 8px;text-align:left;border-bottom:2px solid #ddd6fe}td{padding:10px 8px;border-bottom:1px solid #f0f0f0;font-size:13px}.totals-row td{font-weight:700;border-top:2px solid #e5e7eb;font-size:14px}.grand-total td{font-size:16px;color:${typeColor};border-top:2px solid ${typeColor}}.footer{margin-top:40px;text-align:center;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}.gst-info{background:#f0fdf4;border:1px solid #dcfce7;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px}.note-box{background:#fffbeb;border:1px solid #fef3c7;border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:12px}</style></head><body><div class="header"><div><div class="company">San Raj Metal Arts</div><div class="company-sub">Transaction Invoice</div></div><div class="txn-badge">${typeLabel}</div></div>${partyDetailsHtml}<div class="info-grid"><div class="info-box"><div class="info-label">Transaction Date</div><div class="info-value">${txnData.transactionDate}</div></div><div class="info-box"><div class="info-label">Total Weight</div><div class="info-value">${txnData.totalWeight.toFixed(3)} kg</div></div><div class="info-box"><div class="info-label">Items</div><div class="info-value">${txnData.items.length}</div></div></div>${partyGst ? `<div style="font-size:11px;color:#666;margin-top:4px">GST: ${partyGst}</div>` : ""}</div><div class="info-box"><div class="info-label">Transaction Date</div><div class="info-value">${txnData.transactionDate}</div></div><div class="info-box"><div class="info-label">Total Weight</div><div class="info-value">${txnData.totalWeight.toFixed(3)} kg</div></div></div>${includeGst ? `<div class="gst-info"><strong>GST Applied:</strong> ${gstType === "cgst_sgst" ? `CGST (${gstRate / 2}%) + SGST (${gstRate / 2}%)` : `IGST (${gstRate}%)`} @ ${gstRate}%</div>` : ""}${txnData.note ? `<div class="note-box"><strong>Note:</strong> ${txnData.note}</div>` : ""}<table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Wt/Unit</th><th>Total Wt</th><th>Rate/kg</th><th style="text-align:right">Amount</th></tr></thead><tbody>${itemRows}<tr class="totals-row"><td colspan="6" style="text-align:right">Subtotal</td><td style="text-align:right">₹${txnData.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>${gstSection}<tr class="grand-total"><td colspan="6" style="text-align:right">Grand Total</td><td style="text-align:right">₹${gstCalc.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr></tbody></table><div class="footer">Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })} &bull; San Raj Metal Arts</div></body></html>`;
  };

  const buildPdfFileName = (txnData: TransactionData): string => {
    const partyName = (txnData.partyName || "Unknown")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 30);
    const typeLabel =
      TRANSACTION_TYPES.find((t) => t.key === txnData.transactionType)?.label ||
      "Transaction";
    const date =
      txnData.transactionDate || new Date().toISOString().split("T")[0];
    return `${partyName}_${typeLabel.replace(/\s+/g, "_")}_${date}`;
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const html = buildPdfHtml(transaction, gstCalculation);
      const fileName = buildPdfFileName(transaction);
      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const pdfDir = uri.substring(0, uri.lastIndexOf("/"));
        const newUri = `${pdfDir}/${fileName}.pdf`;
        try {
          const FileSystem = require("expo-file-system");
          await FileSystem.moveAsync({ from: uri, to: newUri });
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(newUri, {
              mimeType: "application/pdf",
              dialogTitle: `${fileName}.pdf`,
              UTI: "com.adobe.pdf",
            });
          } else {
            await Print.printAsync({ html });
          }
        } catch (renameError) {
          console.log("[PDF] Rename failed:", renameError);
          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(uri, {
              mimeType: "application/pdf",
              dialogTitle: `${fileName}.pdf`,
              UTI: "com.adobe.pdf",
            });
          } else {
            await Print.printAsync({ html });
          }
        }
      }
    } catch (error) {
      console.error("[PDF] Error:", error);
      Alert.alert(t("error"), t("failed_to_generate_pdf"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSubmit = async () => {
    if (!transaction.partyId) {
      Alert.alert(t("missing_info"), t("please_select_party"));
      return;
    }
    if (transaction.items.length === 0) {
      Alert.alert(t("missing_info"), t("please_add_item"));
      return;
    }

    setIsSubmitting(true);
    try {
      const items = transaction.items.map((item) => {
        if (item.itemType === "product") {
          const p = item as ProductItem;
          return {
            itemType: "product" as const,
            id: p.id,
            name: p.name,
            productId: p.productId,
            weightPerUnitKg: p.weightPerUnitKg,
            quantity: p.quantity,
            ratePerKg: p.ratePerKg,
            weightKg: p.weightKg,
            totalAmount: p.totalAmount,
          };
        }
        const m = item as MetalItem;
        return {
          itemType: "metal" as const,
          id: m.id,
          name: m.name,
          metalId: m.metalId,
          kg: m.kg,
          gram: m.gram,
          ratePerKg: m.ratePerKg,
          weightKg: m.weightKg,
          totalAmount: m.totalAmount,
        };
      });

      const computedTotalWeight = items.reduce(
        (s, i) => s + (i.weightKg || 0),
        0,
      );
      const computedTotalAmount = items.reduce(
        (s, i) => s + (i.totalAmount || 0),
        0,
      );
      const gstPayload: GstData | undefined = includeGst
        ? {
            includeGst: true,
            gstType,
            gstRate,
            gstAmount: gstCalculation.gstAmount,
            cgstAmount: gstCalculation.cgstAmount,
            sgstAmount: gstCalculation.sgstAmount,
            igstAmount: gstCalculation.igstAmount,
          }
        : undefined;

      const payload: Record<string, any> = {
        transactionType: transaction.transactionType.replace("_", " "),
        priority: transaction.priority,
        partyId: transaction.partyId,
        partyName: transaction.partyName,
        transactionDate: transaction.transactionDate,
        items,
        totalWeight: computedTotalWeight,
        totalAmount: computedTotalAmount,
        note: transaction.note || "",
        gst: gstPayload,
        grandTotal: gstCalculation.grandTotal,
      };

      console.log(
        "[TransactionForm] Submitting:",
        JSON.stringify(payload, null, 2),
      );

      let res;
      if (isEditMode && existingTransaction?.id) {
        res = await TransactionService.updateTransaction(
          existingTransaction.id,
          payload,
        );
      } else {
        res = await TransactionService.addNewTransaction(payload);
      }
      console.log("[TransactionForm] Response:", res);

      if (res.success) {
        const returnAfterSave = () => {
          if (!isEditMode) {
            setTransaction(buildInitialTransaction());
            setGlobalRate("");
            setRateMode("fixed");
            setIncludeGst(false);
          }
          router.replace(saveReturnPath);
        };

        Alert.alert(
          t("success"),
          res.message ||
            (isEditMode ? t("transaction_updated") : t("transaction_created")),
          [
            {
              text: t("download_pdf"),
              onPress: async () => {
                await handleGeneratePdf();
                returnAfterSave();
              },
            },
            {
              text: t("ok"),
              onPress: returnAfterSave,
            },
          ],
        );
      } else {
        Alert.alert(t("error"), res.message || t("failed_to_save_transaction"));
      }
    } catch (error: any) {
      console.error("[TransactionForm] Error:", error);
      Alert.alert(t("error"), error?.message || t("failed_to_save_transaction"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatWeight = (weight: number) =>
    `${Number(weight || 0).toFixed(3)} kg`;
  const selectedParty =
    selectedPartyDetails?.id === transaction.partyId
      ? selectedPartyDetails
      : allParties.find((p) => p.id === transaction.partyId);

  const handleSearchListEnd = useCallback(() => {
    if (activeTab === "all" || activeTab === "products") loadMoreProducts();
    if (activeTab === "all" || activeTab === "metals") loadMoreMaterials();
  }, [activeTab, loadMoreProducts, loadMoreMaterials]);

  const adjustDate = (days: number) => {
    const current = new Date(transaction.transactionDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + days);
    setTransaction((prev) => ({
      ...prev,
      transactionDate: current.toISOString().split("T")[0],
    }));
  };

  if (isLoadingInitial) {
    return (
      <div style={webStyle(styles.loadingContainer)}>
        <div style={webStyle(styles.loadingCard)}>
          <ActivityIndicator
            size="large"
            color={currentTypeConfig?.color || colors.primary}
          />
          <span style={webStyle(styles.loadingTitle)}>
            {isEditMode ? "Loading transaction" : "Setting up your transaction"}
          </span>
          <span style={webStyle(styles.loadingSubtext)}>
            Loading parties, products & materials...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={webStyle([styles.safeArea, { opacity: fadeAnim }])}>
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>Transaction Type</span>
            <div style={webStyle(styles.typeGrid)}>
              {TRANSACTION_TYPES.map((type) => {
                const isActive = transaction.transactionType === type.key;
                return (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.typeCard,
                      isActive && {
                        borderColor: type.color,
                        backgroundColor: type.bg,
                      },
                    ]}
                    onPress={() =>
                      setTransaction((prev) => ({
                        ...prev,
                        transactionType: type.key,
                      }))
                    }
                    activeOpacity={0.7}
                  >
                    <div
                      style={webStyle([
                        styles.typeIconCircle,
                        {
                          backgroundColor: isActive
                            ? type.color
                            : colors.gray100,
                        },
                      ])}
                    >
                      {renderTypeIcon(
                        type.key,
                        16,
                        isActive ? "#fff" : colors.gray500,
                      )}
                    </div>
                    <span
                      style={webStyle([
                        styles.typeLabel,
                        isActive && {
                          color: type.color,
                          fontWeight: "700" as const,
                        },
                      ])}
                    >
                      {type.label}
                    </span>
                    {isActive && (
                      <div
                        style={webStyle([
                          styles.typeCheckCircle,
                          { backgroundColor: type.color },
                        ])}
                      >
                        <Check size={10} color="#fff" />
                      </div>
                    )}
                  </TouchableOpacity>
                );
              })}
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <div style={webStyle(styles.fieldLabelRow)}>
              <span style={webStyle(styles.fieldLabel)}>
                Party <span style={webStyle(styles.requiredStar)}>*</span>
              </span>
              <TouchableOpacity
                style={[
                  styles.addPartyBtn,
                  {
                    backgroundColor: currentTypeConfig?.color || colors.primary,
                  },
                ]}
                onPress={() => router.push("/parties/add" as any)}
              >
                <Ionicons name="add" size={14} color="#fff" />
                <span style={webStyle(styles.addPartyBtnText)}>Add New</span>
              </TouchableOpacity>
            </div>
            <TouchableOpacity
              style={[
                styles.selectField,
                selectedParty && {
                  borderColor: currentTypeConfig?.color || colors.primaryLight,
                },
              ]}
              onPress={() => setIsPartyModalVisible(true)}
              activeOpacity={0.7}
            >
              <div
                style={webStyle([
                  styles.selectFieldIcon,
                  selectedParty && {
                    backgroundColor: currentTypeConfig?.bg || colors.purplePale,
                  },
                ])}
              >
                <Ionicons
                  name={selectedParty ? "person" : "person-add-outline"}
                  size={16}
                  color={
                    selectedParty
                      ? currentTypeConfig?.color || colors.primary
                      : colors.gray400
                  }
                />
              </div>
              <div style={webStyle(styles.flex1)}>
                {selectedParty ? (
                  <>
                    <span style={webStyle(styles.selectFieldName)}>
                      {selectedParty.name}
                    </span>
                    <span style={webStyle(styles.selectFieldMeta)}>
                      {[selectedParty.partyType, selectedParty.mobile]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </>
                ) : (
                  <span style={webStyle(styles.selectFieldPlaceholder)}>
                    Tap to select a party
                  </span>
                )}
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.gray300}
              />
            </TouchableOpacity>
          </div>

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>Transaction Date</span>
            <div style={webStyle(styles.dateRow)}>
              <TouchableOpacity
                style={styles.dateAdjustBtn}
                onPress={() => adjustDate(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={currentTypeConfig?.color || colors.primary}
                />
              </TouchableOpacity>
              <div style={webStyle(styles.dateField)}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={colors.gray400}
                />
                <TextInput
                  style={styles.dateInput}
                  value={transaction.transactionDate}
                  onChangeText={(text) =>
                    setTransaction((prev) => ({
                      ...prev,
                      transactionDate: text,
                    }))
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.gray400}
                />
              </div>
              <TouchableOpacity
                style={styles.dateAdjustBtn}
                onPress={() => adjustDate(1)}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={currentTypeConfig?.color || colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.todayBtn,
                  {
                    backgroundColor: currentTypeConfig?.bg || colors.purplePale,
                  },
                ]}
                onPress={() =>
                  setTransaction((prev) => ({
                    ...prev,
                    transactionDate: new Date().toISOString().split("T")[0],
                  }))
                }
              >
                <span
                  style={webStyle([
                    styles.todayBtnText,
                    { color: currentTypeConfig?.color || colors.primary },
                  ])}
                >
                  Today
                </span>
              </TouchableOpacity>
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>Rate Mode</span>
            <div style={webStyle(styles.rateModeContainer)}>
              <TouchableOpacity
                style={[
                  styles.rateModeBtn,
                  rateMode === "fixed" && {
                    backgroundColor: currentTypeConfig?.color || colors.primary,
                  },
                ]}
                onPress={() => setRateMode("fixed")}
              >
                <Ionicons
                  name="lock-closed"
                  size={14}
                  color={rateMode === "fixed" ? "#fff" : colors.gray500}
                />
                <span
                  style={webStyle([
                    styles.rateModeBtnText,
                    rateMode === "fixed" && styles.rateModeBtnTextActive,
                  ])}
                >
                  Fixed Rate
                </span>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.rateModeBtn,
                  rateMode === "unfixed" && styles.rateModeBtnActiveUnfixed,
                ]}
                onPress={() => setRateMode("unfixed")}
              >
                <Ionicons
                  name="lock-open"
                  size={14}
                  color={rateMode === "unfixed" ? "#fff" : colors.gray500}
                />
                <span
                  style={webStyle([
                    styles.rateModeBtnText,
                    rateMode === "unfixed" && styles.rateModeBtnTextActive,
                  ])}
                >
                  Custom Rate
                </span>
              </TouchableOpacity>
            </div>
            <span style={webStyle(styles.rateModeHint)}>
              {rateMode === "fixed"
                ? "Uses each product's own rate."
                : "Enter a custom rate for all items."}
            </span>
            {rateMode === "unfixed" && (
              <div style={webStyle(styles.globalRateField)}>
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={currentTypeConfig?.color || colors.primary}
                />
                <TextInput
                  style={styles.globalRateInput}
                  value={globalRate}
                  onChangeText={setGlobalRate}
                  placeholder="Enter rate (₹/unit)"
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                />
                <span style={webStyle(styles.globalRateUnit)}>₹/unit</span>
              </div>
            )}
          </div>

          <div style={webStyle(styles.section)}>
            <div style={webStyle(styles.sectionHeader)}>
              <span style={webStyle(styles.fieldLabel)}>
                Items <span style={webStyle(styles.requiredStar)}>*</span>
              </span>
              {transaction.items.length > 0 && (
                <div
                  style={webStyle([
                    styles.itemCountBadge,
                    {
                      backgroundColor:
                        currentTypeConfig?.color || colors.primary,
                    },
                  ])}
                >
                  <span style={webStyle(styles.itemCountText)}>
                    {transaction.items.length}
                  </span>
                </div>
              )}
            </div>
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => handleOpenSearch(transaction.items.length)}
              activeOpacity={0.7}
            >
              <div
                style={webStyle([
                  styles.addItemIcon,
                  {
                    backgroundColor: currentTypeConfig?.color || colors.primary,
                  },
                ])}
              >
                <Ionicons name="add" size={16} color="#fff" />
              </div>
              <div style={webStyle(styles.flex1)}>
                <span style={webStyle(styles.addItemTitle)}>Add Item</span>
                <span style={webStyle(styles.addItemSub)}>Search products or metals</span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.gray300}
              />
            </TouchableOpacity>

            <div style={webStyle(styles.itemsList)}>
              {transaction.items.map((item, index) => {
                const isMetal = item.itemType === "metal";
                const typeColor = currentTypeConfig?.color || colors.primary;
                const typeBg = currentTypeConfig?.bg || colors.purplePale;
                return (
                  <div style={webStyle(styles.itemCard)} key={item.id || `${item.itemType}-${index}`}>
                    <div style={webStyle(styles.itemCardHeader)}>
                      <div style={webStyle(styles.itemCardHeaderLeft)}>
                        <div
                          style={webStyle([
                            styles.itemTypeTag,
                            {
                              backgroundColor: isMetal
                                ? typeBg
                                : colors.greenLight,
                            },
                          ])}
                        >
                          <Ionicons
                            name={isMetal ? "water" : "cube"}
                            size={10}
                            color={isMetal ? typeColor : colors.green}
                          />
                          <span
                            style={webStyle([
                              styles.itemTypeTagText,
                              { color: isMetal ? typeColor : colors.green },
                            ])}
                          >
                            {isMetal ? "Metal" : "Product"}
                          </span>
                        </div>
                        <span style={webStyle(styles.itemCardName)}>
                          {item.name}
                        </span>
                      </div>
                      <div style={webStyle(styles.itemCardActions)}>
                        {transaction.items.length > 1 && (
                          <>
                            <TouchableOpacity
                              style={styles.itemMoveBtn}
                              onPress={() => moveItem(index, index - 1)}
                              disabled={index === 0}
                            >
                              <Ionicons
                                name="chevron-up"
                                size={13}
                                color={
                                  index === 0 ? colors.gray200 : colors.gray500
                                }
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.itemMoveBtn}
                              onPress={() => moveItem(index, index + 1)}
                              disabled={index === transaction.items.length - 1}
                            >
                              <Ionicons
                                name="chevron-down"
                                size={13}
                                color={
                                  index === transaction.items.length - 1
                                    ? colors.gray200
                                    : colors.gray500
                                }
                              />
                            </TouchableOpacity>
                          </>
                        )}
                        <TouchableOpacity
                          style={styles.itemRemoveBtn}
                          onPress={() => deleteItem(index)}
                        >
                          <Ionicons name="close" size={13} color={colors.red} />
                        </TouchableOpacity>
                      </div>
                    </div>
                    {item.itemType === "product" ? (
                      <>
                        <div style={webStyle(styles.itemFieldsGrid)}>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>Qty</span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={(item as ProductItem).quantity.toString()}
                              onChangeText={(text) =>
                                updateItem(index, {
                                  quantity: parseInt(text) || 1,
                                } as any)
                              }
                              keyboardType="numeric"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              Wt/Unit (kg)
                            </span>
                            <div
                              style={webStyle([
                                styles.itemFieldInput,
                                styles.itemFieldInputDisabled,
                              ])}
                            >
                              <span style={webStyle(styles.itemFieldDisabledText)}>
                                {(item as ProductItem).weightPerUnitKg.toFixed(
                                  3,
                                )}
                              </span>
                            </div>
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>Total Wt</span>
                            <div
                              style={webStyle([
                                styles.itemFieldInput,
                                styles.itemFieldInputDisabled,
                              ])}
                            >
                              <span style={webStyle(styles.itemFieldDisabledText)}>
                                {(item as ProductItem).weightKg.toFixed(3)} kg
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={webStyle([styles.itemFieldsGrid, { marginTop: 6 }])}>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              Rate (₹/kg)
                            </span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={item.ratePerKg.toString()}
                              onChangeText={(text) =>
                                updateItem(index, {
                                  ratePerKg: parseFloat(text) || 0,
                                })
                              }
                              keyboardType="numeric"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              Amount (₹)
                            </span>
                            <div
                              style={webStyle([
                                styles.itemFieldInput,
                                styles.itemFieldInputDisabled,
                              ])}
                            >
                              <span style={webStyle(styles.itemFieldDisabledText)}>
                                {formatCurrency(item.totalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={webStyle(styles.itemFieldsGrid)}>
                        <div style={webStyle(styles.itemFieldBox)}>
                          <span style={webStyle(styles.itemFieldLabel)}>Kg</span>
                          <TextInput
                            style={styles.itemFieldInput}
                            value={(item as MetalItem).kg.toString()}
                            onChangeText={(text) =>
                              updateItem(index, {
                                kg: parseFloat(text) || 0,
                              } as any)
                            }
                            keyboardType="numeric"
                          />
                        </div>
                        <div style={webStyle(styles.itemFieldBox)}>
                          <span style={webStyle(styles.itemFieldLabel)}>Gram</span>
                          <TextInput
                            style={styles.itemFieldInput}
                            value={(item as MetalItem).gram.toString()}
                            onChangeText={(text) =>
                              updateItem(index, {
                                gram: parseFloat(text) || 0,
                              } as any)
                            }
                            keyboardType="numeric"
                          />
                        </div>
                        <div style={webStyle(styles.itemFieldBox)}>
                          <span style={webStyle(styles.itemFieldLabel)}>Rate/kg (₹)</span>
                          <TextInput
                            style={styles.itemFieldInput}
                            value={item.ratePerKg.toString()}
                            onChangeText={(text) =>
                              updateItem(index, {
                                ratePerKg: parseFloat(text) || 0,
                              })
                            }
                            keyboardType="numeric"
                          />
                        </div>
                      </div>
                    )}
                    <div style={webStyle(styles.itemCardFooter)}>
                      <div style={webStyle(styles.itemWeightChip)}>
                        <Ionicons
                          name="scale-outline"
                          size={11}
                          color={colors.gray500}
                        />
                        <span style={webStyle(styles.itemWeightText)}>
                          {formatWeight(item.weightKg)}
                        </span>
                      </div>
                      <span
                        style={webStyle([styles.itemTotalAmount, { color: typeColor }])}
                      >
                        {formatCurrency(item.totalAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>Notes</span>
            <div style={webStyle(styles.notesField)}>
              <TextInput
                style={styles.notesInput}
                value={transaction.note}
                onChangeText={(text) =>
                  setTransaction((prev) => ({ ...prev, note: text }))
                }
                placeholder="Add transaction notes..."
                placeholderTextColor={colors.gray400}
                multiline
              />
            </div>
            {transaction.note && transaction.note.trim().length > 10 && (
              <TouchableOpacity
                style={[
                  styles.aiNoteBtn,
                  isRewritingNote && styles.aiNoteBtnLoading,
                ]}
                onPress={handleAINoteRewrite}
                disabled={isRewritingNote}
                activeOpacity={0.7}
              >
                {isRewritingNote ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color={currentTypeConfig?.color || colors.primary}
                    />
                    <span
                      style={webStyle([
                        styles.aiNoteBtnText,
                        { color: currentTypeConfig?.color || colors.primary },
                      ])}
                    >
                      Rewriting...
                    </span>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="sparkles"
                      size={16}
                      color={currentTypeConfig?.color || colors.primary}
                    />
                    <span
                      style={webStyle([
                        styles.aiNoteBtnText,
                        { color: currentTypeConfig?.color || colors.primary },
                      ])}
                    >
                      Rewrite with AI
                    </span>
                    <div
                      style={webStyle([
                        styles.aiBadge,
                        {
                          backgroundColor:
                            currentTypeConfig?.color || colors.primary,
                        },
                      ])}
                    >
                      <span style={webStyle(styles.aiBadgeText)}>AI</span>
                    </div>
                  </>
                )}
              </TouchableOpacity>
            )}
          </div>

          <div style={webStyle(styles.section)}>
            <div style={webStyle(styles.gstHeaderRow)}>
              <div style={webStyle(styles.gstHeaderLeft)}>
                <Ionicons
                  name="receipt-outline"
                  size={18}
                  color={currentTypeConfig?.color || colors.primary}
                />
                <span style={webStyle(styles.fieldLabel)}>GST</span>
              </div>
              <Switch
                value={includeGst}
                onValueChange={setIncludeGst}
                trackColor={{
                  false: colors.gray200,
                  true: currentTypeConfig?.bg || colors.purplePale,
                }}
                thumbColor={
                  includeGst
                    ? currentTypeConfig?.color || colors.primary
                    : colors.gray400
                }
              />
            </div>
            {includeGst && (
              <div style={webStyle(styles.gstContent)}>
                <span style={webStyle(styles.gstSubLabel)}>GST Type</span>
                <div style={webStyle(styles.gstTypeToggle)}>
                  <TouchableOpacity
                    style={[
                      styles.gstTypeOption,
                      gstType === "cgst_sgst" && {
                        borderColor: currentTypeConfig?.color || colors.primary,
                        backgroundColor:
                          currentTypeConfig?.bg || colors.purplePale,
                      },
                    ]}
                    onPress={() => setGstType("cgst_sgst")}
                    activeOpacity={0.7}
                  >
                    <span
                      style={webStyle([
                        styles.gstTypeText,
                        gstType === "cgst_sgst" && {
                          color: currentTypeConfig?.color || colors.primary,
                        },
                      ])}
                    >
                      CGST + SGST
                    </span>
                    <span
                      style={webStyle([
                        styles.gstTypeSubText,
                        gstType === "cgst_sgst" && {
                          color: currentTypeConfig?.color || colors.primary,
                        },
                      ])}
                    >
                      Intra-State
                    </span>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.gstTypeOption,
                      gstType === "igst" && {
                        borderColor: currentTypeConfig?.color || colors.primary,
                        backgroundColor:
                          currentTypeConfig?.bg || colors.purplePale,
                      },
                    ]}
                    onPress={() => setGstType("igst")}
                    activeOpacity={0.7}
                  >
                    <span
                      style={webStyle([
                        styles.gstTypeText,
                        gstType === "igst" && {
                          color: currentTypeConfig?.color || colors.primary,
                        },
                      ])}
                    >
                      IGST
                    </span>
                    <span
                      style={webStyle([
                        styles.gstTypeSubText,
                        gstType === "igst" && {
                          color: currentTypeConfig?.color || colors.primary,
                        },
                      ])}
                    >
                      Inter-State
                    </span>
                  </TouchableOpacity>
                </div>
                <span style={webStyle([styles.gstSubLabel, { marginTop: 14 }])}>
                  GST Rate
                </span>
                <div style={webStyle(styles.gstRateRow)}>
                  {GST_RATES.map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.gstRateChip,
                        gstRate === rate && {
                          borderColor:
                            currentTypeConfig?.color || colors.primary,
                          backgroundColor:
                            currentTypeConfig?.color || colors.primary,
                        },
                      ]}
                      onPress={() => setGstRate(rate)}
                      activeOpacity={0.7}
                    >
                      <span
                        style={webStyle([
                          styles.gstRateChipText,
                          gstRate === rate && styles.gstRateChipTextActive,
                        ])}
                      >
                        {rate}%
                      </span>
                    </TouchableOpacity>
                  ))}
                </div>
                {transaction.totalAmount > 0 && (
                  <div style={webStyle(styles.gstBreakdown)}>
                    <div style={webStyle(styles.gstBreakdownRow)}>
                      <span style={webStyle(styles.gstBreakdownLabel)}>Subtotal</span>
                      <span style={webStyle(styles.gstBreakdownValue)}>
                        {formatCurrency(transaction.totalAmount)}
                      </span>
                    </div>
                    {gstType === "cgst_sgst" ? (
                      <>
                        <div style={webStyle(styles.gstBreakdownRow)}>
                          <span style={webStyle(styles.gstBreakdownLabel)}>
                            CGST @ {gstRate / 2}%
                          </span>
                          <span style={webStyle(styles.gstBreakdownValue)}>
                            {formatCurrency(gstCalculation.cgstAmount)}
                          </span>
                        </div>
                        <div style={webStyle(styles.gstBreakdownRow)}>
                          <span style={webStyle(styles.gstBreakdownLabel)}>
                            SGST @ {gstRate / 2}%
                          </span>
                          <span style={webStyle(styles.gstBreakdownValue)}>
                            {formatCurrency(gstCalculation.sgstAmount)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div style={webStyle(styles.gstBreakdownRow)}>
                        <span style={webStyle(styles.gstBreakdownLabel)}>
                          IGST @ {gstRate}%
                        </span>
                        <span style={webStyle(styles.gstBreakdownValue)}>
                          {formatCurrency(gstCalculation.igstAmount)}
                        </span>
                      </div>
                    )}
                    <div style={webStyle(styles.gstBreakdownDivider)} />
                    <div style={webStyle(styles.gstBreakdownRow)}>
                      <span style={webStyle(styles.gstBreakdownTotal)}>
                        Total with GST
                      </span>
                      <span
                        style={webStyle([
                          styles.gstBreakdownTotalValue,
                          { color: currentTypeConfig?.color || colors.primary },
                        ])}
                      >
                        {formatCurrency(gstCalculation.grandTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={webStyle(styles.summaryCard)}>
            <div style={webStyle(styles.summaryHeader)}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color={currentTypeConfig?.color || colors.primary}
              />
              <span style={webStyle(styles.summaryTitle)}>Transaction Summary</span>
            </div>
            <div style={webStyle(styles.summaryDivider)} />
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>Type</span>
              <span
                style={webStyle([
                  styles.summaryValue,
                  { color: currentTypeConfig?.color },
                ])}
              >
                {currentTypeConfig?.label}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>Items</span>
              <span style={webStyle(styles.summaryValue)}>
                {transaction.items.length}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>Total Weight</span>
              <span style={webStyle(styles.summaryValue)}>
                {formatWeight(transaction.totalWeight)}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>Rate Mode</span>
              <span style={webStyle(styles.summaryValue)}>
                {rateMode === "fixed"
                  ? "Fixed"
                  : `Custom (₹${globalRate || "0"})`}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>Subtotal</span>
              <span style={webStyle(styles.summaryValue)}>
                {formatCurrency(transaction.totalAmount)}
              </span>
            </div>
            {includeGst && (
              <>
                <div style={webStyle(styles.summaryDivider)} />
                <div style={webStyle(styles.summaryRow)}>
                  <span style={webStyle(styles.summaryLabel)}>
                    GST ({gstType === "cgst_sgst" ? "CGST+SGST" : "IGST"} @{" "}
                    {gstRate}%)
                  </span>
                  <span style={webStyle(styles.summaryValue)}>
                    {formatCurrency(gstCalculation.gstAmount)}
                  </span>
                </div>
              </>
            )}
            <div style={webStyle(styles.summaryDivider)} />
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.grandTotalLabel)}>Grand Total</span>
              <span
                style={webStyle([
                  styles.grandTotalValue,
                  { color: currentTypeConfig?.color || colors.primary },
                ])}
              >
                {formatCurrency(gstCalculation.grandTotal)}
              </span>
            </div>
          </div>

          <TouchableOpacity
            style={[
              styles.pdfBtn,
              { borderColor: currentTypeConfig?.color || colors.primaryLight },
              isGeneratingPdf && { opacity: 0.6 },
            ]}
            onPress={handleGeneratePdf}
            disabled={isGeneratingPdf || transaction.items.length === 0}
            activeOpacity={0.7}
          >
            {isGeneratingPdf ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={currentTypeConfig?.color || colors.primary}
                />
                <span
                  style={webStyle([
                    styles.pdfBtnText,
                    { color: currentTypeConfig?.color || colors.primary },
                  ])}
                >
                  Generating PDF...
                </span>
              </>
            ) : (
              <>
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={currentTypeConfig?.color || colors.primary}
                />
                <span
                  style={webStyle([
                    styles.pdfBtnText,
                    { color: currentTypeConfig?.color || colors.primary },
                  ])}
                >
                  Preview / Download PDF
                </span>
              </>
            )}
          </TouchableOpacity>
          <div style={webStyle({ height: 24 })} />
        </ScrollView>
      </KeyboardAvoidingView>

      <div style={webStyle(styles.footerBar)}>
        <div style={webStyle(styles.footerLeft)}>
          <span style={webStyle(styles.footerLabel)}>Total</span>
          <span style={webStyle(styles.footerAmount)}>
            {formatCurrency(gstCalculation.grandTotal)}
          </span>
        </div>
        <TouchableOpacity
          style={[
            styles.footerSubmitBtn,
            { backgroundColor: currentTypeConfig?.color || colors.primary },
            isSubmitting && styles.footerSubmitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isEditMode ? "save" : "checkmark-circle"}
                size={18}
                color="#fff"
              />
              <span style={webStyle(styles.footerSubmitText)}>
                {isEditMode ? "Update Transaction" : "Create Transaction"}
              </span>
            </>
          )}
        </TouchableOpacity>
      </div>

      <KeyboardAwareModal visible={isPartyModalVisible} animationType="slide" transparent>
        <div style={webStyle(styles.modalOverlay)}>
          <div style={webStyle(styles.modalSheet)}>
            <div style={webStyle(styles.modalHandle)} />
            <div style={webStyle(styles.modalTopBar)}>
              <span style={webStyle(styles.modalTopTitle)}>Select Party</span>
              <TouchableOpacity
                onPress={() => setIsPartyModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.gray500} />
              </TouchableOpacity>
            </div>
            <TouchableOpacity
              style={[
                styles.addNewPartyModalBtn,
                { backgroundColor: currentTypeConfig?.color || colors.primary },
              ]}
              onPress={() => {
                setIsPartyModalVisible(false);
                router.push("/parties/add" as any);
              }}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <span style={webStyle(styles.addNewPartyModalBtnText)}>Add New Party</span>
            </TouchableOpacity>
            <div style={webStyle(styles.modalSearchRow)}>
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search parties..."
                placeholderTextColor={colors.gray400}
                value={partySearchQuery}
                onChangeText={setPartySearchQuery}
              />
              {partySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setPartySearchQuery("")}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.gray400}
                  />
                </TouchableOpacity>
              )}
            </div>
            {partiesLoading ? (
              <div style={webStyle(styles.modalLoadingWrap)}>
                <ActivityIndicator
                  size="small"
                  color={currentTypeConfig?.color || colors.primary}
                />
              </div>
            ) : (
              <FlatList
                data={filteredParties}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = item.id === transaction.partyId;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.partyItem,
                        isSelected && styles.partyItemSelected,
                      ]}
                      onPress={() => handlePartySelect(item)}
                      activeOpacity={0.7}
                    >
                      <div
                        style={webStyle([
                          styles.partyItemAvatar,
                          {
                            backgroundColor:
                              item.partyType === "Customer"
                                ? colors.greenLight
                                : currentTypeConfig?.bg || colors.purplePale,
                          },
                        ])}
                      >
                        <span
                          style={webStyle([
                            styles.partyItemAvatarText,
                            {
                              color:
                                item.partyType === "Customer"
                                  ? colors.green
                                  : currentTypeConfig?.color || colors.primary,
                            },
                          ])}
                        >
                          {(item.name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div style={webStyle(styles.flex1)}>
                        <span style={webStyle(styles.partyItemName)}>{item.name}</span>
                        <span style={webStyle(styles.partyItemMeta)}>
                          {[item.partyType, item.mobile]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                      {isSelected && (
                        <div
                          style={webStyle([
                            styles.partyItemCheck,
                            {
                              backgroundColor:
                                currentTypeConfig?.color || colors.primary,
                            },
                          ])}
                        >
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </div>
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={styles.partyListContent}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <div style={webStyle(styles.emptyListWrap)}>
                    <Ionicons
                      name="people-outline"
                      size={36}
                      color={colors.gray300}
                    />
                    <span style={webStyle(styles.emptyListMsg)}>No parties found</span>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </KeyboardAwareModal>

      <KeyboardAwareModal visible={isSearchModalVisible} animationType="slide">
        <SafeAreaView style={styles.searchScreen}>
          <div style={webStyle(styles.searchScreenHeader)}>
            <TouchableOpacity
              onPress={() => setIsSearchModalVisible(false)}
              style={styles.searchBackBtn}
            >
              <Ionicons name="arrow-back" size={20} color={colors.gray700} />
            </TouchableOpacity>
            <div style={webStyle(styles.searchBarWrap)}>
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search products or metals..."
                placeholderTextColor={colors.gray400}
                value={searchQuery}
                onChangeText={handleSearchInputChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    fetchProducts(1);
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.gray400}
                  />
                </TouchableOpacity>
              )}
            </div>
          </div>
          <div style={webStyle(styles.searchTabsRow)}>
            {(["all", "products", "metals"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.searchTabPill,
                  activeTab === tab && {
                    backgroundColor: currentTypeConfig?.color || colors.primary,
                    borderColor: currentTypeConfig?.color || colors.primary,
                  },
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <span
                  style={webStyle([
                    styles.searchTabPillText,
                    activeTab === tab && styles.searchTabPillTextActive,
                  ])}
                >
                  {tab === "all"
                    ? "All"
                    : tab === "products"
                      ? "Products"
                      : "Metals"}
                </span>
              </TouchableOpacity>
            ))}
          </div>
          <FlatList
            data={filteredResults}
            keyExtractor={(item, idx) => `${item.type}-${item.id}-${idx}`}
            renderItem={({ item }) => {
              const isMetal = item.type === "metal";
              return (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSelectItem(activeSearchIndex!, item)}
                  activeOpacity={0.7}
                >
                  <div
                    style={webStyle([
                      styles.searchResultIcon,
                      {
                        backgroundColor: isMetal
                          ? currentTypeConfig?.bg || colors.purplePale
                          : colors.greenLight,
                      },
                    ])}
                  >
                    <Ionicons
                      name={isMetal ? "water" : "cube"}
                      size={16}
                      color={
                        isMetal
                          ? currentTypeConfig?.color || colors.primary
                          : colors.green
                      }
                    />
                  </div>
                  <div style={webStyle(styles.searchResultInfo)}>
                    <span style={webStyle(styles.searchResultName)}>
                      {item.name}
                    </span>
                    <span style={webStyle(styles.searchResultMeta)}>
                      {isMetal ? "Metal" : "Product"}
                      {item.designCode ? ` · ${item.designCode}` : ""}
                      {item.weight > 0
                        ? ` · ${item.weight} ${item.weightUnit || "kg"}`
                        : ""}
                    </span>
                  </div>
                  <div style={webStyle(styles.searchResultRight)}>
                    <span style={webStyle(styles.searchResultPrice)}>₹{item.price}</span>
                  </div>
                </TouchableOpacity>
              );
            }}
            onEndReached={handleSearchListEnd}
            onEndReachedThreshold={0.3}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              productsLoading || materialsLoading ? (
                <div style={webStyle(styles.searchFooterLoader)}>
                  <ActivityIndicator
                    size="small"
                    color={currentTypeConfig?.color || colors.primary}
                  />
                </div>
              ) : null
            }
            ListEmptyComponent={
              <div style={webStyle(styles.searchEmpty)}>
                <Ionicons name="search" size={40} color={colors.gray300} />
                <span style={webStyle(styles.searchEmptyTitle)}>
                  {searchQuery.length > 0
                    ? "No items found"
                    : "Search for items"}
                </span>
              </div>
            }
            contentContainerStyle={styles.searchResultsContent}
          />
        </SafeAreaView>
      </KeyboardAwareModal>
    </div>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: colors.background,
  },
  loadingCard: {
    alignItems: "center" as const,
    backgroundColor: colors.white,
    borderRadius: isSmallDevice ? 12 : 14,
    padding: isSmallDevice ? 22 : 32,
    width: SCREEN_WIDTH * 0.8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  loadingSubtext: { marginTop: 4, fontSize: 13, color: colors.gray400 },
  scrollContent: { paddingBottom: isSmallDevice ? 8 : 16 },
  section: {
    marginTop: isSmallDevice ? 12 : 18,
    paddingHorizontal: isSmallDevice ? 10 : 16,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.gray500,
    marginBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  fieldLabelRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  requiredStar: { color: colors.red, fontSize: 12 },
  typeGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: isSmallDevice ? 6 : 10,
  },
  typeCard: {
    width: "47%" as any,
    flexBasis: "47%" as any,
    paddingVertical: isSmallDevice ? 10 : 14,
    paddingHorizontal: isSmallDevice ? 9 : 12,
    borderRadius: isSmallDevice ? 10 : 14,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    alignItems: "center" as const,
    gap: 8,
    position: "relative" as const,
  },
  typeIconCircle: {
    width: isSmallDevice ? 30 : 36,
    height: isSmallDevice ? 30 : 36,
    borderRadius: 18,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: colors.gray600,
    textAlign: "center" as const,
  },
  typeCheckCircle: {
    position: "absolute" as const,
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  addPartyBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPartyBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" as const },
  selectField: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 12,
    gap: 10,
  },
  selectFieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.gray100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  selectFieldName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.gray800,
  },
  selectFieldMeta: { fontSize: 12, color: colors.gray400, marginTop: 1 },
  selectFieldPlaceholder: { fontSize: 14, color: colors.gray400 },
  dateRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  dateAdjustBtn: {
    width: 36,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  dateField: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  dateInput: { flex: 1, fontSize: 14, color: colors.text },
  todayBtn: {
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 8,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  todayBtnText: { fontSize: 12, fontWeight: "600" as const },
  rateModeContainer: {
    flexDirection: "row" as const,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 3,
    gap: 3,
  },
  rateModeBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rateModeBtnActiveUnfixed: { backgroundColor: colors.yellow },
  rateModeBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.gray500,
  },
  rateModeBtnTextActive: { color: "#fff" },
  rateModeHint: {
    fontSize: 12,
    color: colors.gray400,
    marginTop: 6,
    fontStyle: "italic" as const,
  },
  globalRateField: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.yellow,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
    marginTop: 10,
  },
  globalRateInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600" as const,
    color: colors.text,
  },
  globalRateUnit: {
    fontSize: 13,
    color: colors.gray500,
    fontWeight: "500" as const,
  },
  itemCountBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  itemCountText: { color: "#fff", fontSize: 11, fontWeight: "700" as const },
  addItemBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderStyle: "dashed" as const,
    padding: 12,
    gap: 10,
    marginBottom: 10,
  },
  addItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  addItemTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.gray800,
  },
  addItemSub: { fontSize: 11, color: colors.gray400, marginTop: 1 },
  itemsList: { gap: 8 },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  itemCardHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 10,
  },
  itemCardHeaderLeft: { flex: 1, gap: 4 },
  itemTypeTag: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    alignSelf: "flex-start" as const,
  },
  itemTypeTagText: {
    fontSize: 9,
    fontWeight: "700" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  itemCardName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.gray800,
    marginTop: 2,
  },
  itemCardActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 2,
  },
  itemMoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.gray50,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  itemRemoveBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: colors.redLight,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginLeft: 2,
  },
  itemFieldsGrid: { flexDirection: "row" as const, gap: 8, marginBottom: 10 },
  itemFieldBox: { flex: 1 },
  itemFieldLabel: {
    fontSize: 9,
    fontWeight: "600" as const,
    color: colors.gray400,
    marginBottom: 4,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  itemFieldInput: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 14,
    backgroundColor: colors.gray50,
    color: colors.text,
    textAlign: "center" as const,
  },
  itemFieldInputDisabled: {
    backgroundColor: colors.gray100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  itemFieldDisabledText: {
    fontSize: 14,
    color: colors.gray500,
    fontWeight: "500" as const,
    textAlign: "center" as const,
  },
  itemCardFooter: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  itemWeightChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: colors.gray50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  itemWeightText: {
    fontSize: 12,
    color: colors.gray500,
    fontWeight: "500" as const,
  },
  itemTotalAmount: { fontSize: 16, fontWeight: "700" as const },
  notesField: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden" as const,
  },
  notesInput: {
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top" as const,
    minHeight: 72,
    color: colors.text,
  },
  aiNoteBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.purplePale,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.purplePale,
  },
  aiNoteBtnLoading: { opacity: 0.7 },
  aiNoteBtnText: { fontSize: 13, fontWeight: "600" as const },
  aiBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  aiBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" as const },
  gstHeaderRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  gstHeaderLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  gstContent: {
    marginTop: 12,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 14,
  },
  gstSubLabel: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: colors.gray500,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  gstTypeToggle: { flexDirection: "row" as const, gap: 8 },
  gstTypeOption: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  gstTypeText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.gray500,
  },
  gstTypeSubText: { fontSize: 10, color: colors.gray400, marginTop: 2 },
  gstRateRow: { flexDirection: "row" as const, gap: 8 },
  gstRateChip: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    backgroundColor: colors.gray50,
  },
  gstRateChipText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.gray500,
  },
  gstRateChipTextActive: { color: "#fff" },
  gstBreakdown: {
    marginTop: 14,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  gstBreakdownRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 6,
  },
  gstBreakdownLabel: { fontSize: 13, color: colors.gray500 },
  gstBreakdownValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.gray700,
  },
  gstBreakdownDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 6,
  },
  gstBreakdownTotal: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  gstBreakdownTotalValue: { fontSize: 16, fontWeight: "800" as const },
  summaryCard: {
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 14,
    backgroundColor: colors.white,
  },
  summaryHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: colors.gray800,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 13, color: colors.gray500 },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.gray700,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.gray900,
  },
  grandTotalValue: { fontSize: 20, fontWeight: "800" as const },
  pdfBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
  },
  pdfBtnText: { fontSize: 14, fontWeight: "600" as const },
  footerBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  footerLeft: {},
  footerLabel: {
    fontSize: 10,
    color: colors.gray400,
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: 0.3,
  },
  footerAmount: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: colors.gray900,
  },
  footerSubmitBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 10,
  },
  footerSubmitDisabled: { opacity: 0.5 },
  footerSubmitText: { color: "#fff", fontSize: 15, fontWeight: "600" as const },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: isSmallDevice ? 12 : 20,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 680,
    backgroundColor: colors.white,
    borderRadius: 8,
    maxHeight: "82%",
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: "center" as const,
    marginTop: 10,
  },
  modalTopBar: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  modalTopTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: colors.gray900,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.gray100,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  addNewPartyModalBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addNewPartyModalBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  modalSearchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors.gray50,
    borderRadius: 9,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: colors.text },
  modalLoadingWrap: { padding: 40, alignItems: "center" as const },
  partyListContent: { paddingHorizontal: 16, paddingBottom: 20 },
  partyItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.gray50,
    gap: 10,
  },
  partyItemSelected: {
    backgroundColor: colors.purplePale,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  partyItemAvatar: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  partyItemAvatarText: { fontSize: 14, fontWeight: "700" as const },
  partyItemName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.gray800,
  },
  partyItemMeta: { fontSize: 11, color: colors.gray400, marginTop: 1 },
  partyItemCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  emptyListWrap: { padding: 40, alignItems: "center" as const, gap: 8 },
  emptyListMsg: { fontSize: 13, color: colors.gray400 },
  searchScreen: { flex: 1, backgroundColor: colors.background },
  searchScreenHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  searchBackBtn: { padding: 6 },
  searchBarWrap: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: colors.gray50,
    borderRadius: 9,
    paddingHorizontal: 10,
    height: 40,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchBarInput: { flex: 1, fontSize: 14, color: colors.text },
  searchTabsRow: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  searchTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchTabPillText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.gray500,
  },
  searchTabPillTextActive: { color: "#fff" },
  searchResultsContent: { padding: 12 },
  searchResultItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  searchResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  searchResultInfo: { flex: 1 },
  searchResultName: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: colors.gray800,
  },
  searchResultMeta: { fontSize: 11, color: colors.gray400, marginTop: 1 },
  searchResultRight: { alignItems: "flex-end" as const },
  searchResultPrice: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: colors.gray800,
  },
  searchFooterLoader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 16,
    gap: 8,
  },
  searchEmpty: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 48,
  },
  searchEmptyTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: colors.gray500,
    marginTop: 12,
  },
});
