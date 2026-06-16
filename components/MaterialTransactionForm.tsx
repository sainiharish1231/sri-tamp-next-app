import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  webStyle,
} from "react-native";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import SkeletonLoader from "@/components/SkeletonLoader";
import { colors } from "@/colors";
import MaterialTransactionService from "@/services/MaterialTransactionService";
import MaterialService from "@/services/MaterialService";
import PartyService from "@/services/PartyService";
import ProductService from "@/services/ProductService";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId, getAccessFlags } from "@/utils/access";
import { getDeviceMetrics } from "@/utils/responsive";
import { useLanguage } from "@/hooks/use-language";
import {
  calculateProductAmount,
  getProductRateInfo,
  getProductWeightInfo,
} from "@/utils/productPricing";
import { downloadTransactionPdf } from "@/utils/transactionPdf";

const metrics = getDeviceMetrics();
const isSmallDevice = metrics.isXs;
const SCREEN_WIDTH = metrics.width;
const PAGE_SIZE = 1000;
const GST_RATES = [5, 12, 18, 28];

type ItemType = "metal" | "product";
type TransactionType =
  | "purchase"
  | "sales"
  | "purchase_return"
  | "sales_return";
type RateMode = "fixed" | "unfixed";
type GstType = "cgst_sgst" | "igst";

interface BaseItem {
  id: string;
  itemType: ItemType;
  name: string;
  ratePerKg: number;
  weightKg: number;
  totalAmount: number;
  weightUnit: string;
  rateUnit: string;
}

interface ProductItem extends BaseItem {
  itemType: "product";
  productId: string;
  weightPerUnitKg: number;
  quantity: number;
  originalRate: number;
}

interface MetalItem extends BaseItem {
  itemType: "metal";
  metalId: string;
  kg: number;
  gram: number;
}

type TransactionItem = ProductItem | MetalItem;

interface GstData {
  includeGst: boolean;
  gstType: GstType;
  gstRate: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

interface TransactionState {
  transactionNo: string;
  partyId: string;
  partyName: string;
  transactionType: TransactionType;
  transactionDate: string;
  returnReferenceNo: string;
  returnReason: string;
  note: string;
  items: TransactionItem[];
  totalWeight: number;
  totalAmount: number;
  grandTotal: number;
}

const TRANSACTION_TYPES: {
  value: TransactionType;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeStyle: "purchase" | "sales" | "purchaseReturn" | "salesReturn";
}[] = [
  {
    value: "purchase",
    labelKey: "purchase",
    icon: "arrow-down-circle",
    activeStyle: "purchase",
  },
  {
    value: "sales",
    labelKey: "sales",
    icon: "arrow-up-circle",
    activeStyle: "sales",
  },
  {
    value: "purchase_return",
    labelKey: "purchase_return",
    icon: "return-down-back",
    activeStyle: "purchaseReturn",
  },
  {
    value: "sales_return",
    labelKey: "sales_return",
    icon: "return-up-back",
    activeStyle: "salesReturn",
  },
];

const parseNumber = (value: any) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractList = <T,>(response: any): T[] => {
  const data = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(data) ? data : [];
};

const extractEntity = (response: any) =>
  response?.data?.data ?? response?.data ?? response ?? null;

const parseWeightPerUnitKg = (rawWeight: any) => {
  const weightText = String(rawWeight || "").trim();
  if (!weightText) return 0;

  const weightNumber =
    parseFloat(String(weightText).replace(/[^0-9.]/g, "")) || 0;
  const weightUnit =
    String(weightText)
      .replace(/[0-9.\s]/g, "")
      .toLowerCase() || "kg";

  if (weightUnit === "g" || weightUnit === "gm" || weightUnit === "gram") {
    return weightNumber / 1000;
  }

  return weightNumber;
};

const generateTransactionNo = () => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}`;
  const timePart = `${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes(),
  ).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  return `MT-${datePart}-${timePart}`;
};

const buildEmptyState = (partyId = ""): TransactionState => ({
  transactionNo: generateTransactionNo(),
  partyId,
  partyName: "",
  transactionType: "sales",
  transactionDate: new Date().toISOString().split("T")[0],
  returnReferenceNo: "",
  returnReason: "",
  note: "",
  items: [],
  totalWeight: 0,
  totalAmount: 0,
  grandTotal: 0,
});

const normalizeExistingItems = (items: any[] = []): TransactionItem[] =>
  items.map((item, index) => {
    const itemType =
      item?.itemType === "metal" || item?.type === "metal" || item?.metalId
        ? "metal"
        : "product";

    if (itemType === "metal") {
      const weightKg = parseNumber(item?.weightKg);
      const kg = parseNumber(item?.kg ?? Math.trunc(weightKg));
      const gram = parseNumber(
        item?.gram ?? Number(((weightKg - kg) * 1000).toFixed(0)),
      );
      const ratePerKg = parseNumber(item?.ratePerKg ?? item?.rate);
      return {
        id: String(item?.id || `metal-${index}-${Date.now()}`),
        itemType: "metal",
        metalId: String(item?.metalId || item?.productId || ""),
        name: item?.name || "Metal",
        kg,
        gram,
        ratePerKg,
        weightKg: weightKg || kg + gram / 1000,
        totalAmount:
          parseNumber(item?.totalAmount) ||
          (weightKg || kg + gram / 1000) * ratePerKg,
        weightUnit: item?.weightUnit || "kg",
        rateUnit: item?.rateUnit || "kg",
      } satisfies MetalItem;
    }

    const quantity = parseNumber(
      item?.quantity ?? item?.orderedQty ?? item?.qty ?? 0,
    );
    const weightPerUnitKg = parseNumber(item?.weightPerUnitKg);
    const ratePerKg = parseNumber(item?.ratePerKg ?? item?.rate);
    const weightKg =
      parseNumber(item?.weightKg) || quantity * (weightPerUnitKg || 0);

    return {
      id: String(item?.id || `product-${index}-${Date.now()}`),
      itemType: "product",
      productId: String(item?.productId || ""),
      name: item?.name || "Product",
      weightPerUnitKg,
      quantity,
      ratePerKg,
      weightKg,
      totalAmount:
        parseNumber(item?.totalAmount) ||
        calculateProductAmount(
          quantity,
          weightKg,
          ratePerKg,
          item?.rateUnit || "kg",
        ),
      originalRate: ratePerKg,
      weightUnit: item?.weightUnit || "kg",
      rateUnit: item?.rateUnit || "kg",
    } satisfies ProductItem;
  });

const normalizeExistingTransaction = (transaction: any): TransactionState => {
  const items = normalizeExistingItems(transaction?.items || []);
  const totalWeight =
    parseNumber(transaction?.summary?.totalWeight) ||
    parseNumber(transaction?.totalWeight) ||
    items.reduce((sum, item) => sum + item.weightKg, 0);
  const totalAmount =
    parseNumber(transaction?.summary?.totalAmount) ||
    parseNumber(transaction?.totalAmount) ||
    items.reduce((sum, item) => sum + item.totalAmount, 0);

  return {
    transactionNo: transaction?.transactionNo || generateTransactionNo(),
    partyId: String(transaction?.partyId || transaction?.party?.id || ""),
    partyName: transaction?.partyName || transaction?.party?.name || "",
    transactionType: (transaction?.transactionType ||
      "sales") as TransactionType,
    transactionDate:
      String(transaction?.transactionDate || "")
        .split("T")[0]
        .trim() || new Date().toISOString().split("T")[0],
    returnReferenceNo:
      transaction?.returnReferenceNo ||
      transaction?.returnDetails?.referenceNo ||
      "",
    returnReason:
      transaction?.returnReason || transaction?.returnDetails?.reason || "",
    note: transaction?.note || "",
    items,
    totalWeight,
    totalAmount,
    grandTotal:
      parseNumber(transaction?.grandTotal) ||
      parseNumber(transaction?.summary?.grandTotal) ||
      totalAmount,
  };
};

export default function MaterialTransactionForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    partyId?: string;
    id?: string;
    returnTo?: string;
  }>();
  const { t } = useLanguage();
  const sessionUser = useAuthStore((state) => state.session?.user);
  const { isParty: isPartyUser } = getAccessFlags(sessionUser?.role);
  const sessionPartyId = extractPartyId(sessionUser);
  const isEditMode = !!params.id;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const defaultPartyId = String(params.partyId || sessionPartyId || "");

  const [transaction, setTransaction] = useState<TransactionState>(() =>
    buildEmptyState(defaultPartyId),
  );
  const [rateMode, setRateMode] = useState<RateMode>("fixed");
  const [globalRate, setGlobalRate] = useState("");
  const [includeGst, setIncludeGst] = useState(false);
  const [gstType, setGstType] = useState<GstType>("cgst_sgst");
  const [gstRate, setGstRate] = useState(18);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [parties, setParties] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedPartyDetails, setSelectedPartyDetails] = useState<any>(null);
  const [partyModalVisible, setPartyModalVisible] = useState(false);
  const [partySearch, setPartySearch] = useState("");
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(
    null,
  );
  const [itemSearch, setItemSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "products" | "metals">(
    "all",
  );

  const isReturnTransaction = transaction.transactionType.includes("return");
  const returnPartyId = transaction.partyId || String(params.partyId || "");

  const partyReturnPath =
    params.returnTo === "party" && returnPartyId
      ? (`/parties/partiesDigital/${returnPartyId}` as any)
      : null;
  const transactionReturnPath =
    params.returnTo === "transaction" ? ("/transaction" as any) : null;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [fadeAnim]);

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

    const gstAmount = transaction.totalAmount * (gstRate / 100);
    const cgstAmount = gstType === "cgst_sgst" ? gstAmount / 2 : 0;
    const sgstAmount = gstType === "cgst_sgst" ? gstAmount / 2 : 0;
    const igstAmount = gstType === "igst" ? gstAmount : 0;

    return {
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      grandTotal: transaction.totalAmount + gstAmount,
    };
  }, [gstRate, gstType, includeGst, transaction.totalAmount]);

  const selectedParty =
    selectedPartyDetails?.id === transaction.partyId
      ? selectedPartyDetails
      : parties.find((party) => party.id === transaction.partyId) || null;

  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return parties;
    const query = partySearch.toLowerCase();
    return parties.filter((party) =>
      [party.name, party.mobile, party.partyType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [parties, partySearch]);

  const searchResults = useMemo(() => {
    const query = itemSearch.toLowerCase().trim();
    const results: any[] = [];

    const filteredProducts = query
      ? products.filter((product) =>
          product.name?.toLowerCase().includes(query),
        )
      : products;
    filteredProducts.forEach((product) => {
      const rateInfo = getProductRateInfo(product);
      const weightInfo = getProductWeightInfo(product);
      results.push({
        id: String(product.id || product._id || ""),
        name: product.name || t("product"),
        type: "product",
        price: rateInfo.amount,
        rateUnit: rateInfo.unit,
        weight: parseWeightPerUnitKg(`${weightInfo.weight} ${weightInfo.unit}`),
        designCode: product.designCode || "",
        data: product,
      });
    });

    const filteredMaterials = query
      ? materials.filter((material) =>
          material.name?.toLowerCase().includes(query),
        )
      : materials;
    filteredMaterials.forEach((material) => {
      results.push({
        id: String(material.id || material._id || ""),
        name: material.name || t("metal"),
        type: "metal",
        price: parseNumber(material.rate ?? material.price),
        rateUnit: "kg",
        weight: 0,
        data: material,
      });
    });

    if (activeTab === "products") {
      return results.filter((item) => item.type === "product");
    }
    if (activeTab === "metals") {
      return results.filter((item) => item.type === "metal");
    }
    return results;
  }, [activeTab, itemSearch, materials, products, t]);

  const updateTotals = useCallback((items: TransactionItem[]) => {
    const totalWeight = items.reduce((sum, item) => sum + item.weightKg, 0);
    const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
    setTransaction((prev) => ({
      ...prev,
      items,
      totalWeight,
      totalAmount,
      grandTotal: totalAmount,
    }));
  }, []);

  const resetForm = useCallback(
    (partyId = defaultPartyId) => {
      setTransaction(buildEmptyState(partyId));
      setRateMode("fixed");
      setGlobalRate("");
      setIncludeGst(false);
      setGstType("cgst_sgst");
      setGstRate(18);
      setItemSearch("");
      setPartySearch("");
      setActiveTab("all");
    },
    [defaultPartyId],
  );

  const loadSelectedPartyDetails = useCallback(async (partyId: string) => {
    if (!partyId) {
      setSelectedPartyDetails(null);
      return;
    }
    try {
      const res = await PartyService.fetchPartyWithBankDetails(partyId);
      if (res?.success) {
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
      console.log("[MaterialTransactionForm] Party details error:", error);
    }
  }, []);

  useEffect(() => {
    if (!transaction.partyId) {
      setSelectedPartyDetails(null);
      return;
    }
    loadSelectedPartyDetails(transaction.partyId);
  }, [loadSelectedPartyDetails, transaction.partyId]);

  useEffect(() => {
    if (rateMode !== "unfixed" || !globalRate.trim()) return;
    const rate = parseNumber(globalRate);
    const nextItems = transaction.items.map((item) => {
      if (item.itemType === "product") {
        const weightKg = item.quantity * item.weightPerUnitKg;
        return {
          ...item,
          ratePerKg: rate,
          rateUnit: "kg",
          weightKg,
          totalAmount: calculateProductAmount(
            item.quantity,
            weightKg,
            rate,
            "kg",
          ),
        };
      }
      const weightKg = item.kg + item.gram / 1000;
      return {
        ...item,
        ratePerKg: rate,
        rateUnit: "kg",
        weightKg,
        totalAmount: weightKg * rate,
      };
    });
    updateTotals(nextItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalRate, rateMode]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        setPartiesLoading(true);
        setItemsLoading(true);

        const [partyRes, productsRes, materialsRes, transactionRes] =
          await Promise.all([
            isPartyUser && sessionPartyId
              ? PartyService.fetchPartyWithBankDetails(sessionPartyId)
              : PartyService.fetchPartiesDropdown(),
            ProductService.fetchAllProducts({ params: { limit: PAGE_SIZE } }),
            MaterialService.fetchAllMaterial({ params: { limit: PAGE_SIZE } }),
            isEditMode && params.id
              ? MaterialTransactionService.fetchMaterialTransactionById(
                  String(params.id),
                )
              : Promise.resolve(null),
          ]);

        const partyList =
          isPartyUser && sessionPartyId
            ? (() => {
                const party = PartyService.extractParty(partyRes);
                return party ? [party] : [];
              })()
            : PartyService.extractPartyList(partyRes);

        setParties(partyList);
        setProducts(extractList(productsRes));
        setMaterials(extractList(materialsRes));

        if (transactionRes && (transactionRes as any)?.success) {
          const existing = extractEntity(transactionRes);
          const normalized = normalizeExistingTransaction(existing);
          setTransaction(normalized);
          setRateMode(existing?.rateMode || "fixed");
          setGlobalRate(
            existing?.globalRate ? String(existing.globalRate) : "",
          );
          setIncludeGst(!!existing?.gst?.includeGst);
          setGstType(existing?.gst?.gstType || "cgst_sgst");
          setGstRate(existing?.gst?.gstRate || 18);
          const party =
            partyList.find((entry: any) => entry.id === normalized.partyId) ||
            null;
          setSelectedPartyDetails(party);
          return;
        }

        const nextPartyId = String(
          params.partyId || (isPartyUser ? sessionPartyId : "") || "",
        );
        const nextState = buildEmptyState(nextPartyId);
        const party =
          partyList.find((entry: any) => entry.id === nextPartyId) || null;
        nextState.partyName = party?.name || "";
        setTransaction(nextState);
        setSelectedPartyDetails(party);
      } catch (error) {
        console.log("[MaterialTransactionForm] Init error:", error);
        Alert.alert(t("error"), t("failed_to_load_material_transaction_form"));
      } finally {
        setLoading(false);
        setPartiesLoading(false);
        setItemsLoading(false);
      }
    };

    loadInitialData();
  }, [isEditMode, isPartyUser, params.id, params.partyId, sessionPartyId, t]);

  const formatCurrency = (amount: number) =>
    `\u20b9${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatWeight = (weight: number) =>
    `${Number(weight || 0).toFixed(3)} kg`;

  const handleTransactionTypeChange = (transactionType: TransactionType) => {
    setTransaction((prev) => ({
      ...prev,
      transactionType,
      ...(transactionType.includes("return")
        ? {}
        : { returnReferenceNo: "", returnReason: "" }),
    }));
  };

  const handlePartySelect = (party: any) => {
    setSelectedPartyDetails(party);
    setTransaction((prev) => ({
      ...prev,
      partyId: party.id,
      partyName: party.name,
      items: [],
      totalWeight: 0,
      totalAmount: 0,
      grandTotal: 0,
    }));
    setPartyModalVisible(false);
    setPartySearch("");
  };

  const adjustDate = (days: number) => {
    const current = new Date(transaction.transactionDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + days);
    setTransaction((prev) => ({
      ...prev,
      transactionDate: current.toISOString().split("T")[0],
    }));
  };

  const handleOpenItemSearch = (index: number) => {
    if (!transaction.partyId) {
      Alert.alert(t("select_party"), t("select_party_before_items"));
      return;
    }
    setActiveSearchIndex(index);
    setItemSearch("");
    setActiveTab("all");
    setItemModalVisible(true);
  };

  const handleSelectItem = (result: any) => {
    const rate =
      rateMode === "unfixed" && globalRate.trim()
        ? parseNumber(globalRate)
        : parseNumber(result.price);
    const rateUnit = rateMode === "unfixed" ? "kg" : result.rateUnit || "kg";
    let nextItem: TransactionItem;

    if (result.type === "product") {
      const weightPerUnitKg = parseNumber(result.weight);
      const weightKg = 0;
      nextItem = {
        id: `product-${Date.now()}-${Math.random()}`,
        itemType: "product",
        productId: result.id,
        name: result.name,
        weightPerUnitKg,
        quantity: 0,
        ratePerKg: rate,
        rateUnit,
        weightKg,
        totalAmount: calculateProductAmount(0, weightKg, rate, rateUnit),
        originalRate: parseNumber(result.price),
        weightUnit: "kg",
      };
    } else {
      nextItem = {
        id: `metal-${Date.now()}-${Math.random()}`,
        itemType: "metal",
        metalId: result.id,
        name: result.name,
        kg: 0,
        gram: 0,
        ratePerKg: rate,
        rateUnit: "kg",
        weightKg: 0,
        totalAmount: 0,
        weightUnit: "kg",
      };
    }

    const items = [...transaction.items];
    if (activeSearchIndex !== null && activeSearchIndex < items.length) {
      items[activeSearchIndex] = nextItem;
    } else {
      items.push(nextItem);
    }
    updateTotals(items);
    setItemModalVisible(false);
  };

  const updateItem = (index: number, patch: Partial<TransactionItem>) => {
    const items = [...transaction.items];
    const item = { ...items[index], ...patch } as TransactionItem;

    if (item.itemType === "product") {
      const quantity = Math.max(parseNumber(item.quantity), 0);
      const weightPerUnitKg = Math.max(parseNumber(item.weightPerUnitKg), 0);
      const ratePerKg = Math.max(parseNumber(item.ratePerKg), 0);
      item.quantity = quantity;
      item.weightPerUnitKg = weightPerUnitKg;
      item.ratePerKg = ratePerKg;
      item.weightKg = quantity * weightPerUnitKg;
      item.totalAmount = calculateProductAmount(
        quantity,
        item.weightKg,
        ratePerKg,
        item.rateUnit,
      );
    } else {
      const kg = Math.max(parseNumber(item.kg), 0);
      const gram = Math.max(parseNumber(item.gram), 0);
      const ratePerKg = Math.max(parseNumber(item.ratePerKg), 0);
      item.kg = kg;
      item.gram = gram;
      item.ratePerKg = ratePerKg;
      item.weightKg = kg + gram / 1000;
      item.totalAmount = item.weightKg * ratePerKg;
    }

    items[index] = item;
    updateTotals(items);
  };

  const deleteItem = (index: number) => {
    Alert.alert(t("remove_item"), t("remove_item_confirm"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("remove"),
        style: "destructive",
        onPress: () =>
          updateTotals(
            transaction.items.filter((_, itemIndex) => itemIndex !== index),
          ),
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

  const validateBeforeSubmit = () => {
    if (!transaction.partyId) {
      Alert.alert(t("missing_party"), t("please_select_party"));
      return false;
    }
    if (transaction.items.length === 0) {
      Alert.alert(t("missing_items"), t("please_add_item"));
      return false;
    }

    for (const item of transaction.items) {
      if (item.itemType === "product" && item.quantity <= 0) {
        Alert.alert(t("invalid_item"), t("item_quantity_above_zero"));
        return false;
      }
      if (item.weightKg <= 0) {
        Alert.alert(t("invalid_item"), t("item_weight_above_zero"));
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    const items = transaction.items.map((item) => {
      if (item.itemType === "product") {
        return {
          itemType: "product" as const,
          id: item.id,
          name: item.name,
          productId: item.productId,
          weightPerUnitKg: item.weightPerUnitKg,
          quantity: item.quantity,
          orderedQty: item.quantity,
          deliveredQty: item.quantity,
          pendingQty: 0,
          ratePerKg: item.ratePerKg,
          rateUnit: item.rateUnit || "kg",
          weightKg: item.weightKg,
          totalAmount: item.totalAmount,
        };
      }

      return {
        itemType: "metal" as const,
        id: item.id,
        name: item.name,
        metalId: item.metalId,
        kg: item.kg,
        gram: item.gram,
        quantity: item.weightKg,
        deliveredQty: item.weightKg,
        pendingQty: 0,
        ratePerKg: item.ratePerKg,
        rateUnit: item.rateUnit || "kg",
        weightKg: item.weightKg,
        totalAmount: item.totalAmount,
      };
    });

    const gstPayload: GstData | undefined = includeGst
      ? {
          includeGst: true,
          gstType,
          gstRate,
          gstAmount: Number(gstCalculation.gstAmount.toFixed(2)),
          cgstAmount: Number(gstCalculation.cgstAmount.toFixed(2)),
          sgstAmount: Number(gstCalculation.sgstAmount.toFixed(2)),
          igstAmount: Number(gstCalculation.igstAmount.toFixed(2)),
        }
      : undefined;

    const returnDetails = isReturnTransaction
      ? {
          transactionType: transaction.transactionType,
          referenceNo: transaction.returnReferenceNo.trim(),
          reason: transaction.returnReason.trim(),
        }
      : null;

    return {
      transactionNo:
        transaction.transactionNo.trim() || generateTransactionNo(),
      partyId: transaction.partyId,
      partyName:
        selectedParty?.name ||
        transaction.partyName ||
        selectedPartyDetails?.name ||
        "",
      transactionType: transaction.transactionType,
      transactionDate: transaction.transactionDate,
      returnReferenceNo: returnDetails?.referenceNo || "",
      returnReason: returnDetails?.reason || "",
      returnDetails,
      note: transaction.note.trim(),
      rateMode,
      globalRate: rateMode === "unfixed" ? parseNumber(globalRate) : 0,
      gst: gstPayload,
      items,
      totalWeight: transaction.totalWeight,
      totalAmount: transaction.totalAmount,
      grandTotal: gstCalculation.grandTotal,
      summary: {
        totalItems: items.length,
        orderItems: 0,
        extraItems: 0,
        totalWeight: Number(transaction.totalWeight.toFixed(3)),
        totalAmount: Number(transaction.totalAmount.toFixed(2)),
        grandTotal: Number(gstCalculation.grandTotal.toFixed(2)),
        orderTotal: 0,
        extraTotal: 0,
      },
      status: "completed",
    };
  };

  const handleSubmit = async () => {
    if (!validateBeforeSubmit()) return;

    try {
      setSubmitting(true);
      const payload = buildPayload();
      console.log(payload, "klkk");
      const response =
        isEditMode && params.id
          ? await MaterialTransactionService.updateMaterialTransaction(
              String(params.id),
              payload,
            )
          : await MaterialTransactionService.addNewMaterialTransaction(payload);

      if (!response?.success) {
        throw new Error(
          response?.message || t("failed_to_save_material_transaction"),
        );
      }

      const destination =
        partyReturnPath ||
        transactionReturnPath ||
        (isEditMode && params.id
          ? (`/material-transaction/${params.id}` as any)
          : ("/material-transaction" as any));
      const savedTransaction =
        response?.data?.data || response?.data || response || {};
      const pdfRecord = { ...payload, ...savedTransaction };
      const pdfParty = selectedPartyDetails || selectedParty || {
        id: payload.partyId,
        name: payload.partyName,
      };
      const downloadPdfAndReturn = async () => {
        try {
          await downloadTransactionPdf({
            kind: "material",
            record: pdfRecord,
            party: pdfParty,
            user: sessionUser,
          });
        } catch (pdfError) {
          console.log("[MaterialTransactionForm] PDF error:", pdfError);
          Alert.alert(t("error"), t("failed_to_generate_pdf"));
        } finally {
          router.replace(destination);
        }
      };

      resetForm(transaction.partyId);
      Alert.alert(
        t("success"),
        isEditMode
          ? t("material_transaction_updated")
          : t("material_transaction_created"),
        [
          { text: t("download_pdf"), onPress: downloadPdfAndReturn },
          { text: t("ok"), onPress: () => router.replace(destination) },
        ],
      );
    } catch (error: any) {
      console.log("[MaterialTransactionForm] Submit error:", error);
      Alert.alert(
        t("error"),
        error?.message || t("failed_to_save_material_transaction"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={webStyle(styles.loadingContainer)}>
        <SkeletonLoader rows={4} style={styles.loadingSkeleton} />
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
          automaticallyAdjustKeyboardInsets
        >
          <div style={webStyle(styles.orderTypeSection)}>
            <span style={webStyle(styles.fieldLabel)}>{t("transaction_type")}</span>
            <div style={webStyle(styles.transactionTypeToggle)}>
              {TRANSACTION_TYPES.map((type) => {
                const isActive = transaction.transactionType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.transactionTypeOption,
                      isActive &&
                        type.activeStyle === "purchase" &&
                        styles.transactionTypeOptionActivePurchase,
                      isActive &&
                        type.activeStyle === "sales" &&
                        styles.transactionTypeOptionActiveSale,
                      isActive &&
                        type.activeStyle === "purchaseReturn" &&
                        styles.transactionTypeOptionActivePurchaseReturn,
                      isActive &&
                        type.activeStyle === "salesReturn" &&
                        styles.transactionTypeOptionActiveSaleReturn,
                    ]}
                    onPress={() => handleTransactionTypeChange(type.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={type.icon}
                      size={16}
                      color={isActive ? "#fff" : colors.gray400}
                    />
                    <span
                      style={webStyle([
                        styles.transactionTypeOptionText,
                        isActive && styles.transactionTypeOptionTextActive,
                      ])}>
                      {t(type.labelKey)}
                    </span>
                  </TouchableOpacity>
                );
              })}
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>{t("transaction_no")}</span>
            <div style={webStyle(styles.inputField)}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color={colors.primary}
              />
              <TextInput
                style={styles.fieldInput}
                value={transaction.transactionNo}
                onChangeText={(value) =>
                  setTransaction((prev) => ({
                    ...prev,
                    transactionNo: value,
                  }))
                }
                placeholder={t("auto_generated_if_left_empty")}
                placeholderTextColor={colors.gray400}
              />
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <div style={webStyle(styles.fieldLabelRow)}>
              <span style={webStyle(styles.fieldLabel)}>
                {t("party")} <span style={webStyle(styles.requiredStar)}>*</span>
              </span>
              {!isPartyUser ? (
                <TouchableOpacity
                  style={styles.addPartyBtn}
                  onPress={() => router.push("/parties/add" as any)}
                >
                  <Ionicons name="add" size={14} color="#fff" />
                  <span style={webStyle(styles.addPartyBtnText)}>{t("add_new")}</span>
                </TouchableOpacity>
              ) : null}
            </div>
            <TouchableOpacity
              style={[
                styles.selectField,
                selectedParty && styles.selectFieldActive,
              ]}
              onPress={() => !isPartyUser && setPartyModalVisible(true)}
              activeOpacity={0.7}
              disabled={isPartyUser}
            >
              <div
                style={webStyle([
                  styles.selectFieldIcon,
                  selectedParty && {
                    backgroundColor: isReturnTransaction
                      ? colors.yellowLight
                      : colors.primaryPale,
                  },
                ])}
              >
                <Ionicons
                  name={selectedParty ? "person" : "person-add-outline"}
                  size={16}
                  color={selectedParty ? colors.primary : colors.gray400}
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
                        .join(" - ")}
                    </span>
                  </>
                ) : (
                  <span style={webStyle(styles.selectFieldPlaceholder)}>
                    {t("tap_to_select_party")}
                  </span>
                )}
              </div>
              {!isPartyUser ? (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.gray300}
                />
              ) : null}
            </TouchableOpacity>
          </div>

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>{t("transaction_date")}</span>
            <div style={webStyle(styles.dateRow)}>
              <TouchableOpacity
                style={styles.dateAdjustBtn}
                onPress={() => adjustDate(-1)}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={colors.primary}
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
                  onChangeText={(value) =>
                    setTransaction((prev) => ({
                      ...prev,
                      transactionDate: value,
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
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.todayBtn}
                onPress={() =>
                  setTransaction((prev) => ({
                    ...prev,
                    transactionDate: new Date().toISOString().split("T")[0],
                  }))
                }
              >
                <span style={webStyle(styles.todayBtnText)}>{t("today")}</span>
              </TouchableOpacity>
            </div>
          </div>

          {isReturnTransaction ? (
            <div style={webStyle(styles.section)}>
              <span style={webStyle(styles.fieldLabel)}>{t("return_details")}</span>
              <span style={webStyle(styles.rateModeHint)}>
                {t("return_details_hint")}
              </span>
              <div style={webStyle(styles.inputField)}>
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={colors.primary}
                />
                <TextInput
                  style={styles.fieldInput}
                  value={transaction.returnReferenceNo}
                  onChangeText={(value) =>
                    setTransaction((prev) => ({
                      ...prev,
                      returnReferenceNo: value,
                    }))
                  }
                  placeholder={t("return_reference_placeholder")}
                  placeholderTextColor={colors.gray400}
                />
              </div>
              <div style={webStyle([styles.notesField, styles.returnReasonField])}>
                <TextInput
                  style={styles.notesInput}
                  value={transaction.returnReason}
                  onChangeText={(value) =>
                    setTransaction((prev) => ({
                      ...prev,
                      returnReason: value,
                    }))
                  }
                  placeholder={t("return_reason_placeholder")}
                  placeholderTextColor={colors.gray400}
                  multiline
                  textAlignVertical="top"
                />
              </div>
            </div>
          ) : null}

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>{t("rate_mode")}</span>
            <div style={webStyle(styles.rateModeContainer)}>
              <TouchableOpacity
                style={[
                  styles.rateModeBtn,
                  rateMode === "fixed" && styles.rateModeBtnActive,
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
                  {t("fixed_rate")}
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
                  {t("custom_rate")}
                </span>
              </TouchableOpacity>
            </div>
            <span style={webStyle(styles.rateModeHint)}>
              {rateMode === "fixed"
                ? t("uses_each_item_own_rate")
                : t("enter_custom_rate_all_items")}
            </span>
            {rateMode === "unfixed" ? (
              <div style={webStyle(styles.globalRateField)}>
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={colors.primary}
                />
                <TextInput
                  style={styles.globalRateInput}
                  value={globalRate}
                  onChangeText={setGlobalRate}
                  placeholder={t("enter_rate_unit")}
                  placeholderTextColor={colors.gray400}
                  keyboardType="decimal-pad"
                />
                <span style={webStyle(styles.globalRateUnit)}>{"\u20b9/kg"}</span>
              </div>
            ) : null}
          </div>

          <div style={webStyle(styles.section)}>
            <div style={webStyle(styles.sectionHeader)}>
              <span style={webStyle(styles.fieldLabel)}>
                {t("items")} <span style={webStyle(styles.requiredStar)}>*</span>
              </span>
              {transaction.items.length > 0 ? (
                <div style={webStyle(styles.itemCountBadge)}>
                  <span style={webStyle(styles.itemCountText)}>
                    {transaction.items.length}
                  </span>
                </div>
              ) : null}
            </div>
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => handleOpenItemSearch(transaction.items.length)}
              activeOpacity={0.7}
            >
              <div style={webStyle(styles.addItemIcon)}>
                <Ionicons name="add" size={16} color="#fff" />
              </div>
              <div style={webStyle(styles.flex1)}>
                <span style={webStyle(styles.addItemTitle)}>{t("add_item")}</span>
                <span style={webStyle(styles.addItemSub)}>
                  {t("search_products_or_metals")}
                </span>
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
                return (
                  <div
                    style={webStyle(styles.itemCard)}
                    key={item.id || `${item.itemType}-${index}`}
                  >
                    <div style={webStyle(styles.itemCardHeader)}>
                      <div style={webStyle(styles.itemCardHeaderLeft)}>
                        <div
                          style={webStyle([
                            styles.itemTypeTag,
                            {
                              backgroundColor: isMetal
                                ? colors.purplePale
                                : colors.greenLight,
                            },
                          ])}
                        >
                          <Ionicons
                            name={isMetal ? "water" : "cube"}
                            size={10}
                            color={isMetal ? colors.primary : colors.green}
                          />
                          <span
                            style={webStyle([
                              styles.itemTypeTagText,
                              {
                                color: isMetal ? colors.primary : colors.green,
                              },
                            ])}
                          >
                            {isMetal ? t("metal") : t("product")}
                          </span>
                        </div>
                        <span style={webStyle(styles.itemCardName)}>
                          {item.name}
                        </span>
                      </div>
                      <div style={webStyle(styles.itemCardActions)}>
                        <TouchableOpacity
                          style={styles.itemMoveBtn}
                          onPress={() => handleOpenItemSearch(index)}
                        >
                          <Ionicons
                            name="swap-horizontal"
                            size={13}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        {transaction.items.length > 1 ? (
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
                        ) : null}
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
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("qty")}
                            </span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={String(item.quantity)}
                              onChangeText={(value) =>
                                updateItem(index, {
                                  quantity: parseNumber(value),
                                } as Partial<TransactionItem>)
                              }
                              keyboardType="numeric"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("wt_unit_kg")}
                            </span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={String(item.weightPerUnitKg)}
                              onChangeText={(value) =>
                                updateItem(index, {
                                  weightPerUnitKg: parseNumber(value),
                                } as Partial<TransactionItem>)
                              }
                              keyboardType="decimal-pad"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("total_wt")}
                            </span>
                            <div
                              style={webStyle([
                                styles.itemFieldInput,
                                styles.itemFieldInputDisabled,
                              ])}
                            >
                              <span style={webStyle(styles.itemFieldDisabledText)}>
                                {item.weightKg.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={webStyle([styles.itemFieldsGrid, { marginTop: 6 }])}>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("rate")} ({"\u20b9"}/{item.rateUnit || "kg"})
                            </span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={String(item.ratePerKg)}
                              onChangeText={(value) =>
                                updateItem(index, {
                                  ratePerKg: parseNumber(value),
                                })
                              }
                              keyboardType="decimal-pad"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("amount")}
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
                      <>
                        <div style={webStyle(styles.itemFieldsGrid)}>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>{t("kg")}</span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={String(item.kg)}
                              onChangeText={(value) =>
                                updateItem(index, {
                                  kg: parseNumber(value),
                                } as Partial<TransactionItem>)
                              }
                              keyboardType="decimal-pad"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("gram")}
                            </span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={String(item.gram)}
                              onChangeText={(value) =>
                                updateItem(index, {
                                  gram: parseNumber(value),
                                } as Partial<TransactionItem>)
                              }
                              keyboardType="decimal-pad"
                            />
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("rate_per_kg")}
                            </span>
                            <TextInput
                              style={styles.itemFieldInput}
                              value={String(item.ratePerKg)}
                              onChangeText={(value) =>
                                updateItem(index, {
                                  ratePerKg: parseNumber(value),
                                })
                              }
                              keyboardType="decimal-pad"
                            />
                          </div>
                        </div>
                        <div style={webStyle([styles.itemFieldsGrid, { marginTop: 6 }])}>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("total_wt")}
                            </span>
                            <div
                              style={webStyle([
                                styles.itemFieldInput,
                                styles.itemFieldInputDisabled,
                              ])}
                            >
                              <span style={webStyle(styles.itemFieldDisabledText)}>
                                {item.weightKg.toFixed(3)}
                              </span>
                            </div>
                          </div>
                          <div style={webStyle(styles.itemFieldBox)}>
                            <span style={webStyle(styles.itemFieldLabel)}>
                              {t("amount")}
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
                      <span style={webStyle(styles.itemTotalAmount)}>
                        {formatCurrency(item.totalAmount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <span style={webStyle(styles.fieldLabel)}>{t("notes")}</span>
            <div style={webStyle(styles.notesField)}>
              <TextInput
                style={styles.notesInput}
                value={transaction.note}
                onChangeText={(value) =>
                  setTransaction((prev) => ({ ...prev, note: value }))
                }
                placeholder={t("optional_note")}
                placeholderTextColor={colors.gray400}
                multiline
                textAlignVertical="top"
              />
            </div>
          </div>

          <div style={webStyle(styles.section)}>
            <div style={webStyle(styles.gstHeaderRow)}>
              <div style={webStyle(styles.gstHeaderLeft)}>
                <Ionicons
                  name="receipt-outline"
                  size={18}
                  color={colors.primary}
                />
                <span style={webStyle(styles.fieldLabel)}>{t("gst")}</span>
              </div>
              <Switch
                value={includeGst}
                onValueChange={setIncludeGst}
                trackColor={{ false: colors.gray200, true: colors.purplePale }}
                thumbColor={includeGst ? colors.primary : colors.gray400}
              />
            </div>
            {includeGst ? (
              <div style={webStyle(styles.gstContent)}>
                <span style={webStyle(styles.gstSubLabel)}>{t("gst_type")}</span>
                <div style={webStyle(styles.gstTypeToggle)}>
                  <TouchableOpacity
                    style={[
                      styles.gstTypeOption,
                      gstType === "cgst_sgst" && styles.gstTypeOptionActive,
                    ]}
                    onPress={() => setGstType("cgst_sgst")}
                    activeOpacity={0.7}
                  >
                    <span
                      style={webStyle([
                        styles.gstTypeText,
                        gstType === "cgst_sgst" && styles.gstTypeTextActive,
                      ])}
                    >
                      CGST + SGST
                    </span>
                    <span
                      style={webStyle([
                        styles.gstTypeSubText,
                        gstType === "cgst_sgst" && styles.gstTypeSubTextActive,
                      ])}
                    >
                      {t("intra_state")}
                    </span>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.gstTypeOption,
                      gstType === "igst" && styles.gstTypeOptionActive,
                    ]}
                    onPress={() => setGstType("igst")}
                    activeOpacity={0.7}
                  >
                    <span
                      style={webStyle([
                        styles.gstTypeText,
                        gstType === "igst" && styles.gstTypeTextActive,
                      ])}
                    >
                      IGST
                    </span>
                    <span
                      style={webStyle([
                        styles.gstTypeSubText,
                        gstType === "igst" && styles.gstTypeSubTextActive,
                      ])}
                    >
                      {t("inter_state")}
                    </span>
                  </TouchableOpacity>
                </div>
                <span style={webStyle([styles.gstSubLabel, { marginTop: 14 }])}>
                  {t("gst_rate")}
                </span>
                <div style={webStyle(styles.gstRateRow)}>
                  {GST_RATES.map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[
                        styles.gstRateChip,
                        gstRate === rate && styles.gstRateChipActive,
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
                {transaction.totalAmount > 0 ? (
                  <div style={webStyle(styles.gstBreakdown)}>
                    <div style={webStyle(styles.gstBreakdownRow)}>
                      <span style={webStyle(styles.gstBreakdownLabel)}>
                        {t("subtotal")}
                      </span>
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
                        {t("total_with_gst")}
                      </span>
                      <span style={webStyle(styles.gstBreakdownTotalValue)}>
                        {formatCurrency(gstCalculation.grandTotal)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={webStyle(styles.summaryCard)}>
            <div style={webStyle(styles.summaryHeader)}>
              <Ionicons
                name="receipt-outline"
                size={16}
                color={colors.primary}
              />
              <span style={webStyle(styles.summaryTitle)}>{t("summary")}</span>
            </div>
            <div style={webStyle(styles.summaryDivider)} />
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>{t("items")}</span>
              <span style={webStyle(styles.summaryValue)}>
                {transaction.items.length}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>{t("total_weight")}</span>
              <span style={webStyle(styles.summaryValue)}>
                {formatWeight(transaction.totalWeight)}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>{t("rate_mode")}</span>
              <span style={webStyle(styles.summaryValue)}>
                {rateMode === "fixed"
                  ? t("fixed")
                  : `${t("custom")} (\u20b9${globalRate || "0"})`}
              </span>
            </div>
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.summaryLabel)}>{t("subtotal")}</span>
              <span style={webStyle(styles.summaryValue)}>
                {formatCurrency(transaction.totalAmount)}
              </span>
            </div>
            {includeGst ? (
              <>
                <div style={webStyle(styles.summaryDivider)} />
                <div style={webStyle(styles.summaryRow)}>
                  <span style={webStyle(styles.summaryLabel)}>
                    {t("gst")} @ {gstRate}%
                  </span>
                  <span style={webStyle(styles.summaryValue)}>
                    {formatCurrency(gstCalculation.gstAmount)}
                  </span>
                </div>
              </>
            ) : null}
            <div style={webStyle(styles.summaryDivider)} />
            <div style={webStyle(styles.summaryRow)}>
              <span style={webStyle(styles.grandTotalLabel)}>{t("grand_total")}</span>
              <span style={webStyle(styles.grandTotalValue)}>
                {formatCurrency(gstCalculation.grandTotal)}
              </span>
            </div>
          </div>

          <div style={webStyle({ height: 24 })} />
        </ScrollView>
      </KeyboardAvoidingView>

      <div style={webStyle(styles.footerBar)}>
        <div style={webStyle(styles.footerLeft)}>
          <span style={webStyle(styles.footerLabel)}>{t("total")}</span>
          <span
            style={webStyle(styles.footerAmount)}>
            {formatCurrency(gstCalculation.grandTotal)}
          </span>
        </div>
        <TouchableOpacity
          style={[
            styles.footerSubmitBtn,
            submitting && styles.footerSubmitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isEditMode ? "save" : "checkmark-circle"}
                size={18}
                color="#fff"
              />
              <span style={webStyle(styles.footerSubmitText)}>
                {isEditMode ? t("update_transaction") : t("create_transaction")}
              </span>
            </>
          )}
        </TouchableOpacity>
      </div>

      <KeyboardAwareModal
        visible={partyModalVisible}
        transparent
        animationType="slide"
      >
        <div style={webStyle(styles.modalOverlay)}>
          <div style={webStyle(styles.modalSheet)}>
            <div style={webStyle(styles.modalHandle)} />
            <div style={webStyle(styles.modalTopBar)}>
              <span style={webStyle(styles.modalTopTitle)}>{t("select_party")}</span>
              <TouchableOpacity
                onPress={() => setPartyModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={18} color={colors.gray500} />
              </TouchableOpacity>
            </div>
            <TouchableOpacity
              style={styles.addNewPartyModalBtn}
              onPress={() => {
                setPartyModalVisible(false);
                router.push("/parties/add" as any);
              }}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <span style={webStyle(styles.addNewPartyModalBtnText)}>
                {t("add_new_party")}
              </span>
            </TouchableOpacity>
            <div style={webStyle(styles.modalSearchRow)}>
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={t("search_party")}
                placeholderTextColor={colors.gray400}
                value={partySearch}
                onChangeText={setPartySearch}
              />
              {partySearch.length > 0 ? (
                <TouchableOpacity onPress={() => setPartySearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.gray400}
                  />
                </TouchableOpacity>
              ) : null}
            </div>
            {partiesLoading ? (
              <div style={webStyle(styles.modalLoadingWrap)}>
                <ActivityIndicator size="small" color={colors.primary} />
              </div>
            ) : (
              <FlatList
                data={filteredParties}
                keyExtractor={(item) => String(item.id)}
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
                      <div style={webStyle(styles.partyItemAvatar)}>
                        <span style={webStyle(styles.partyItemAvatarText)}>
                          {(item.name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div style={webStyle(styles.flex1)}>
                        <span style={webStyle(styles.partyItemName)}>
                          {item.name}
                        </span>
                        <span style={webStyle(styles.partyItemMeta)}>
                          {[item.partyType, item.mobile]
                            .filter(Boolean)
                            .join(" - ")}
                        </span>
                      </div>
                      {isSelected ? (
                        <div style={webStyle(styles.partyItemCheck)}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </div>
                      ) : null}
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
                    <span style={webStyle(styles.emptyListMsg)}>
                      {t("no_parties_found")}
                    </span>
                  </div>
                }
              />
            )}
          </div>
        </div>
      </KeyboardAwareModal>

      <KeyboardAwareModal visible={itemModalVisible} animationType="slide">
        <div style={webStyle(styles.searchScreen)}>
          <div style={webStyle(styles.searchScreenHeader)}>
            <TouchableOpacity
              onPress={() => setItemModalVisible(false)}
              style={styles.searchBackBtn}
            >
              <Ionicons name="arrow-back" size={20} color={colors.gray700} />
            </TouchableOpacity>
            <div style={webStyle(styles.searchBarWrap)}>
              <Ionicons name="search" size={16} color={colors.gray400} />
              <TextInput
                style={styles.searchBarInput}
                placeholder={t("search_products_or_metals")}
                placeholderTextColor={colors.gray400}
                value={itemSearch}
                onChangeText={setItemSearch}
                autoFocus
              />
              {itemSearch.length > 0 ? (
                <TouchableOpacity onPress={() => setItemSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={colors.gray400}
                  />
                </TouchableOpacity>
              ) : null}
            </div>
          </div>
          <div style={webStyle(styles.searchTabsRow)}>
            {(["all", "products", "metals"] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.searchTabPill,
                  activeTab === tab && styles.searchTabPillActive,
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
                    ? t("all")
                    : tab === "products"
                      ? t("products")
                      : t("metals")}
                </span>
              </TouchableOpacity>
            ))}
          </div>
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
            renderItem={({ item }) => {
              const isMetal = item.type === "metal";
              return (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <div
                    style={webStyle([
                      styles.searchResultIcon,
                      {
                        backgroundColor: isMetal
                          ? colors.purplePale
                          : colors.greenLight,
                      },
                    ])}
                  >
                    <Ionicons
                      name={isMetal ? "water" : "cube"}
                      size={16}
                      color={isMetal ? colors.primary : colors.green}
                    />
                  </div>
                  <div style={webStyle(styles.searchResultInfo)}>
                    <span style={webStyle(styles.searchResultName)}>
                      {item.name}
                    </span>
                    <span style={webStyle(styles.searchResultMeta)}>
                      {isMetal ? t("metal") : t("product")}
                      {item.designCode ? ` - ${item.designCode}` : ""}
                      {!isMetal && item.weight > 0
                        ? ` - ${item.weight.toFixed(3)} kg`
                        : ""}
                    </span>
                  </div>
                  <div style={webStyle(styles.searchResultRight)}>
                    <span style={webStyle(styles.searchResultPrice)}>
                      {formatCurrency(item.price)}
                      {item.rateUnit ? `/${item.rateUnit}` : ""}
                    </span>
                  </div>
                </TouchableOpacity>
              );
            }}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              itemsLoading ? (
                <div style={webStyle(styles.searchFooterLoader)}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </div>
              ) : null
            }
            ListEmptyComponent={
              <div style={webStyle(styles.searchEmpty)}>
                <Ionicons name="search" size={40} color={colors.gray300} />
                <span style={webStyle(styles.searchEmptyTitle)}>
                  {itemSearch.length > 0
                    ? t("no_items_found")
                    : t("search_for_items")}
                </span>
              </div>
            }
            contentContainerStyle={styles.searchResultsContent}
          />
        </div>
      </KeyboardAwareModal>
    </div>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 18,
  },
  loadingSkeleton: { width: "100%" },
  loadingCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: isSmallDevice ? 12 : 14,
    padding: isSmallDevice ? 22 : 32,
    width: SCREEN_WIDTH * 0.8,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  loadingTitle: {
    marginTop: 16,
    fontSize: metrics.font.lg,
    fontWeight: "700",
    color: colors.gray800,
  },
  loadingSubtext: {
    marginTop: 4,
    fontSize: metrics.font.sm,
    color: colors.gray400,
    textAlign: "center",
  },
  scrollContent: { paddingBottom: isSmallDevice ? 8 : 16 },
  orderTypeSection: {
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: isSmallDevice ? 10 : 16,
  },
  fieldLabel: {
    fontSize: metrics.font.sm,
    fontWeight: "600",
    color: colors.gray500,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  requiredStar: { color: colors.red, fontSize: metrics.font.sm },
  transactionTypeToggle: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 3,
    gap: 3,
  },
  transactionTypeOption: {
    width: "49%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallDevice ? 4 : 6,
    paddingVertical: isSmallDevice ? 9 : 11,
    borderRadius: isSmallDevice ? 7 : 8,
  },
  transactionTypeOptionActivePurchase: { backgroundColor: colors.primary },
  transactionTypeOptionActiveSale: { backgroundColor: colors.green },
  transactionTypeOptionActivePurchaseReturn: { backgroundColor: colors.yellow },
  transactionTypeOptionActiveSaleReturn: { backgroundColor: colors.red },
  transactionTypeOptionText: {
    fontSize: isSmallDevice ? 11 : 13,
    fontWeight: "700",
    color: colors.gray700,
  },
  transactionTypeOptionTextActive: { color: "#fff" },
  section: {
    marginTop: isSmallDevice ? 12 : 18,
    paddingHorizontal: isSmallDevice ? 10 : 16,
  },
  inputField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  fieldInput: {
    flex: 1,
    fontSize: metrics.font.md,
    color: colors.text,
    paddingVertical: 0,
  },
  addPartyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: isSmallDevice ? 8 : 10,
    paddingVertical: isSmallDevice ? 5 : 6,
    borderRadius: 8,
  },
  addPartyBtnText: {
    color: "#fff",
    fontSize: metrics.font.xs,
    fontWeight: "600",
  },
  selectField: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: isSmallDevice ? 10 : 12,
    gap: 10,
  },
  selectFieldActive: { borderColor: colors.purpleLight },
  selectFieldIcon: {
    width: isSmallDevice ? 32 : 36,
    height: isSmallDevice ? 32 : 36,
    borderRadius: 9,
    backgroundColor: colors.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  selectFieldName: {
    fontSize: metrics.font.md,
    fontWeight: "600",
    color: colors.gray800,
  },
  selectFieldMeta: {
    fontSize: metrics.font.sm,
    color: colors.gray400,
    marginTop: 1,
  },
  selectFieldPlaceholder: { fontSize: metrics.font.md, color: colors.gray400 },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateAdjustBtn: {
    width: isSmallDevice ? 34 : 36,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  dateField: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  dateInput: {
    flex: 1,
    minWidth: 0,
    fontSize: metrics.font.md,
    color: colors.text,
    paddingVertical: 0,
  },
  todayBtn: {
    paddingHorizontal: isSmallDevice ? 9 : 12,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.purplePale,
    justifyContent: "center",
    alignItems: "center",
  },
  todayBtnText: {
    fontSize: metrics.font.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  rateModeContainer: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 3,
    gap: 3,
  },
  rateModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  rateModeBtnActive: { backgroundColor: colors.primary },
  rateModeBtnActiveUnfixed: { backgroundColor: colors.yellow },
  rateModeBtnText: {
    fontSize: metrics.font.sm,
    fontWeight: "600",
    color: colors.gray500,
  },
  rateModeBtnTextActive: { color: "#fff" },
  rateModeHint: {
    fontSize: metrics.font.sm,
    color: colors.gray400,
    marginTop: 6,
    lineHeight: 18,
  },
  globalRateField: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: metrics.font.lg,
    fontWeight: "600",
    color: colors.text,
    paddingVertical: 0,
  },
  globalRateUnit: {
    fontSize: metrics.font.sm,
    color: colors.gray400,
    fontWeight: "600",
  },
  notesField: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    overflow: "hidden",
  },
  notesInput: {
    padding: 12,
    fontSize: metrics.font.md,
    textAlignVertical: "top",
    minHeight: 72,
    color: colors.text,
  },
  returnReasonField: { marginTop: 10 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemCountBadge: {
    backgroundColor: colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCountText: {
    color: "#fff",
    fontSize: metrics.font.xs,
    fontWeight: "700",
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderStyle: "dashed",
    padding: isSmallDevice ? 10 : 12,
    gap: 10,
    marginBottom: 10,
  },
  addItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  addItemTitle: {
    fontSize: metrics.font.md,
    fontWeight: "600",
    color: colors.gray800,
  },
  addItemSub: {
    fontSize: metrics.font.xs,
    color: colors.gray400,
    marginTop: 1,
  },
  itemsList: { gap: 8 },
  itemCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: isSmallDevice ? 10 : 12,
    gap: 10,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  itemCardHeaderLeft: { flex: 1, minWidth: 0 },
  itemTypeTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 5,
  },
  itemTypeTagText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  itemCardName: {
    fontSize: metrics.font.md,
    fontWeight: "700",
    color: colors.gray900,
  },
  itemCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  itemMoveBtn: {
    width: isSmallDevice ? 26 : 28,
    height: isSmallDevice ? 26 : 28,
    borderRadius: 7,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  itemRemoveBtn: {
    width: isSmallDevice ? 26 : 28,
    height: isSmallDevice ? 26 : 28,
    borderRadius: 7,
    backgroundColor: colors.redLight,
    justifyContent: "center",
    alignItems: "center",
  },
  itemFieldsGrid: { flexDirection: "row", gap: 8 },
  itemFieldBox: { flex: 1, minWidth: 0 },
  itemFieldLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.gray400,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  itemFieldInput: {
    minHeight: isSmallDevice ? 36 : 38,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 6,
    fontSize: metrics.font.sm,
    backgroundColor: colors.gray50,
    color: colors.text,
    textAlign: "center",
  },
  itemFieldInputDisabled: {
    justifyContent: "center",
    alignItems: "center",
  },
  itemFieldDisabledText: {
    fontSize: metrics.font.sm,
    fontWeight: "600",
    color: colors.gray600,
  },
  itemCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: 10,
  },
  itemWeightChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.gray50,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  itemWeightText: {
    fontSize: metrics.font.sm,
    color: colors.gray500,
    fontWeight: "500",
  },
  itemTotalAmount: {
    flexShrink: 1,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "700",
    color: colors.gray800,
  },
  gstHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gstHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gstContent: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 12,
  },
  gstSubLabel: {
    fontSize: metrics.font.sm,
    fontWeight: "700",
    color: colors.gray600,
    marginBottom: 8,
  },
  gstTypeToggle: {
    flexDirection: "row",
    gap: 8,
  },
  gstTypeOption: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 10,
    backgroundColor: colors.gray50,
  },
  gstTypeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  gstTypeText: {
    fontSize: metrics.font.sm,
    fontWeight: "700",
    color: colors.gray700,
  },
  gstTypeTextActive: { color: colors.primaryDark },
  gstTypeSubText: {
    marginTop: 2,
    fontSize: metrics.font.xs,
    color: colors.gray400,
  },
  gstTypeSubTextActive: { color: colors.primary },
  gstRateRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  gstRateChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  gstRateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gstRateChipText: {
    fontSize: metrics.font.sm,
    fontWeight: "700",
    color: colors.gray600,
  },
  gstRateChipTextActive: { color: "#fff" },
  gstBreakdown: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  gstBreakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    paddingVertical: 5,
  },
  gstBreakdownLabel: {
    flex: 1,
    fontSize: metrics.font.sm,
    color: colors.gray500,
  },
  gstBreakdownValue: {
    fontSize: metrics.font.sm,
    fontWeight: "600",
    color: colors.gray800,
  },
  gstBreakdownDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 6,
  },
  gstBreakdownTotal: {
    fontSize: metrics.font.md,
    fontWeight: "700",
    color: colors.gray900,
  },
  gstBreakdownTotalValue: {
    fontSize: metrics.font.lg,
    fontWeight: "800",
    color: colors.primary,
  },
  summaryCard: {
    marginHorizontal: isSmallDevice ? 10 : 16,
    marginTop: isSmallDevice ? 12 : 18,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: isSmallDevice ? 12 : 14,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: metrics.font.sm,
    fontWeight: "700",
    color: colors.gray800,
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginVertical: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 12,
  },
  summaryLabel: { flex: 1, fontSize: metrics.font.sm, color: colors.gray500 },
  summaryValue: {
    flexShrink: 1,
    fontSize: metrics.font.sm,
    fontWeight: "600",
    color: colors.gray700,
    textAlign: "right",
  },
  grandTotalLabel: {
    fontSize: metrics.font.md,
    fontWeight: "700",
    color: colors.gray900,
  },
  grandTotalValue: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: "800",
    color: colors.primary,
  },
  footerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: 12,
  },
  footerLeft: { flex: 1, minWidth: 0 },
  footerLabel: {
    fontSize: metrics.font.xs,
    color: colors.gray400,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0,
  },
  footerAmount: {
    fontSize: isSmallDevice ? 17 : 20,
    fontWeight: "800",
    color: colors.gray900,
  },
  footerSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: isSmallDevice ? 14 : 22,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  footerSubmitDisabled: { opacity: 0.6 },
  footerSubmitText: {
    color: "#fff",
    fontSize: metrics.font.sm,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: metrics.space,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "86%",
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  modalHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.gray200,
    marginBottom: 12,
  },
  modalTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTopTitle: {
    fontSize: metrics.font.lg,
    fontWeight: "700",
    color: colors.gray900,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  addNewPartyModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  addNewPartyModalBtnText: {
    color: "#fff",
    fontSize: metrics.font.md,
    fontWeight: "700",
  },
  modalSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.gray900,
    fontSize: metrics.font.md,
    paddingVertical: 0,
  },
  modalLoadingWrap: {
    paddingVertical: 30,
    alignItems: "center",
  },
  partyListContent: { paddingBottom: 16 },
  partyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.gray100,
    marginBottom: 8,
  },
  partyItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryPale,
  },
  partyItemAvatar: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.purplePale,
    justifyContent: "center",
    alignItems: "center",
  },
  partyItemAvatarText: {
    color: colors.primary,
    fontSize: metrics.font.lg,
    fontWeight: "700",
  },
  partyItemName: {
    fontSize: metrics.font.md,
    fontWeight: "700",
    color: colors.gray900,
  },
  partyItemMeta: {
    fontSize: metrics.font.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  partyItemCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyListWrap: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyListMsg: {
    fontSize: metrics.font.md,
    fontWeight: "600",
    color: colors.gray500,
  },
  searchScreen: { flex: 1, backgroundColor: colors.white },
  searchScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "ios" ? 52 : 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  searchBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: 12,
    height: 42,
  },
  searchBarInput: {
    flex: 1,
    fontSize: metrics.font.md,
    color: colors.gray900,
    paddingVertical: 0,
  },
  searchTabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.gray100,
  },
  searchTabPillActive: { backgroundColor: colors.primary },
  searchTabPillText: {
    fontSize: metrics.font.sm,
    fontWeight: "700",
    color: colors.gray600,
  },
  searchTabPillTextActive: { color: "#fff" },
  searchResultsContent: { paddingHorizontal: 12, paddingBottom: 24 },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  searchResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultInfo: { flex: 1, minWidth: 0 },
  searchResultName: {
    fontSize: metrics.font.md,
    fontWeight: "700",
    color: colors.gray900,
  },
  searchResultMeta: {
    marginTop: 2,
    fontSize: metrics.font.sm,
    color: colors.gray500,
  },
  searchResultRight: { alignItems: "flex-end" },
  searchResultPrice: {
    fontSize: metrics.font.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  searchFooterLoader: { paddingVertical: 18 },
  searchEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 8,
  },
  searchEmptyTitle: {
    fontSize: metrics.font.md,
    fontWeight: "700",
    color: colors.gray500,
  },
});
