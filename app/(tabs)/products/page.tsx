"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  FlatList,
  TextInput,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  webStyle,
} from "react-native";
import { router } from "expo-router";
import {
  Plus,
  Search,
  Grid3x3,
  List,
  Folder,
  Layers,
  X,
  RefreshCw,
} from "lucide-react-native";
import ProductCard from "@/components/ProductCard";
import ProductService from "@/services/ProductService";
import CategoriesModal from "@/components/CategoriesPage";
import MaterialsModal from "@/components/MaterialsPage";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import { useAuthStore } from "@/store/auth.store";
import { colors } from "@/colors";
import Toast from "@/utils/Toast";
import { Product } from "@/types/product";
import { getDeviceMetrics } from "@/utils/responsive";
import { extractCountPayload, extractPagePayload } from "@/utils/response";

const { isXs: isSmallDevice, isMd: isTablet } = getDeviceMetrics();

const getProductIdentity = (product: Product, index: number) =>
  String(
    product.id ||
      product.urlkey ||
      product.designCode ||
      product.name ||
      `product-${index}`,
  );

const uniqueProducts = (items: Product[]) => {
  const seen = new Set<string>();

  return items.filter((product, index) => {
    const identity = getProductIdentity(product, index);
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
};

export default function Products() {
  const { session } = useAuthStore();
  const user = session?.user || null;
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showCategories, setShowCategories] = useState(false);
  const [showMaterials, setShowMaterials] = useState(false);

  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [searchMode, setSearchMode] = useState(false);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const pageSize = isTablet ? 10 : isSmallDevice ? 8 : 10;

  const isAdmin = user?.role === "admin";
  const isInternalUser = user?.role === "internal_user";
  const isParty = user?.role === "party";
  const isUser = user?.role === "user";

  const canEdit = isAdmin || isInternalUser;
  const canEnquiry = isParty || isUser;

  const fetchProductCount = async () => {
    try {
      const res = await ProductService.fetchAllProductsCount();
      if (res.success) {
        setTotalCount(extractCountPayload(res));
      }
    } catch (error) {
      console.error("Failed to fetch product count:", error);
    }
  };

  const fetchProducts = async (isLoadMore = false, searchQuery = "") => {
    if (isLoadMore && (!hasMore || loadingMore)) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const params: Record<string, any> = { limit: pageSize };

      if (isLoadMore && cursor) {
        params.cursor = cursor;
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
        setSearchMode(true);
      } else {
        setSearchMode(false);
      }

      const res = await ProductService.fetchAllProducts({ params });

      if (res.success) {
        const page = extractPagePayload<Product>(res, ["products"]);
        const newProducts = page.data;

        if (isLoadMore) {
          setProducts((prev) => uniqueProducts([...prev, ...newProducts]));
        } else {
          setProducts(uniqueProducts(newProducts));
        }

        setHasMore(page.hasMore);
        setCursor(page.nextCursor);

        if (!searchQuery && !isLoadMore) {
          fetchProductCount();
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load products",
        });
      }
    } catch (error: any) {
      console.error("Fetch products error:", error);
      if (!isLoadMore) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: error.message || "Failed to load products",
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setCursor(null);
    setSearchMode(false);
    setSearchTerm("");
    await fetchProducts();
    setRefreshing(false);
  }, []);

  const loadMore = () => {
    if (hasMore && !loadingMore && !loading && !searchMode) {
      fetchProducts(true);
    }
  };

  const performSearch = (query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchMode(false);
      setCursor(null);
      fetchProducts();
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCursor(null);
      fetchProducts(false, query);
    }, 500);
  };

  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    performSearch(text);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setSearchMode(false);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    setCursor(null);
    fetchProducts();
  };

  useEffect(() => {
    fetchProducts();
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const openDeleteModal = (id: string, name: string) => {
    setDeleteTarget({ id, name });
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await ProductService.deleteProduct(deleteTarget.id);
      if (res.success) {
        setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setTotalCount((prev) => Math.max(0, prev - 1));
        Toast.show({
          type: "success",
          text1: "Deleted",
          text2: res.message || "Product deleted successfully",
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: res.message || "Failed to delete product",
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error.message || "Failed to delete product",
      });
    } finally {
      setDeleting(false);
      setDeleteModalVisible(false);
      setDeleteTarget(null);
    }
  };

  const renderProductItem = ({
    item,
    index,
  }: {
    item: Product;
    index: number;
  }) => {
    return (
      <div style={webStyle(viewMode === "grid" ? styles.gridItem : styles.listItem)}>
        <ProductCard
          item={item}
          viewMode={viewMode}
          onView={() => router.push(`/products/${item.id}`)}
          onEdit={() => router.push(`/products/edit/${item.id}`)}
          onDelete={() => openDeleteModal(item.id, item.name)}
          showActions={canEdit}
          showEnquiry={canEnquiry}
          onEnquiry={() => {
            Toast.show({
              type: "info",
              text1: "Enquiry",
              text2: `Enquiry for ${item.name}`,
            });
          }}
        />
      </div>
    );
  };

  const ListFooter = () => {
    if (searchMode || !hasMore || products.length === 0) return null;

    return (
      <div style={webStyle(styles.footerLoader)}>
        {loadingMore ? (
          <>
            <ActivityIndicator size="small" color={colors.primary} />
            <span style={webStyle(styles.loadingMoreText)}>Loading more...</span>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div style={webStyle(styles.container)}>
      <div style={webStyle(styles.header)}>
        <div style={webStyle(styles.headerTop)}>
          <div style={webStyle(styles.headerTitleContainer)}>
            <div style={webStyle(styles.headerText)}>
              <span style={webStyle(styles.headerTitle)}>Products</span>
              <span style={webStyle(styles.headerSubtitle)}>
                {canEdit ? "Manage your inventory" : "Browse products"}
              </span>
            </div>
          </div>

          <div style={webStyle(styles.headerRight)}>
            <Pressable
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing || loading}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <RefreshCw
                  size={isTablet ? 24 : isSmallDevice ? 18 : 20}
                  color="white"
                />
              )}
            </Pressable>
          </div>
        </div>
      </div>

      <div style={webStyle(styles.searchContainer)}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          placeholder="Search products..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={handleSearchChange}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {searchTerm.length > 0 ? (
          <Pressable
            onPress={handleClearSearch}
            style={styles.clearSearchButton}
          >
            <X size={20} color="#64748b" />
          </Pressable>
        ) : null}
      </div>

      <div style={webStyle(styles.toolbarRow)}>
        <div style={webStyle(styles.toolbarLeft)}>
          {canEdit ? (
            <>
              <Pressable
                style={styles.headerButton}
                onPress={() => setShowCategories(true)}
              >
                <Folder size={18} color={colors.primary} />
                <span style={webStyle(styles.headerButtonText)}>Categories</span>
              </Pressable>
              <Pressable
                style={styles.headerButton}
                onPress={() => setShowMaterials(true)}
              >
                <Layers size={18} color={colors.primary} />
                <span style={webStyle(styles.headerButtonText)}>Materials</span>
              </Pressable>
            </>
          ) : null}
        </div>
        <div style={webStyle(styles.headerButtons)}>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "grid" && styles.toggleActive,
            ]}
            onPress={() => setViewMode("grid")}
          >
            <Grid3x3
              size={18}
              color={viewMode === "grid" ? "#fff" : "#64748b"}
            />
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "list" && styles.toggleActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <List size={18} color={viewMode === "list" ? "#fff" : "#64748b"} />
          </Pressable>
        </div>
      </div>

      <div style={webStyle(styles.statsRow)}>
        <div style={webStyle(styles.statsContainer)}>
          <div style={webStyle(styles.statCard)}>
            <span style={webStyle(styles.statLabel)}>Total Products</span>
            <span style={webStyle(styles.statValue)}>{totalCount}</span>
          </div>
          <div style={webStyle(styles.statCard)}>
            <span style={webStyle(styles.statLabel)}>Showing</span>
            <span style={webStyle(styles.statValue)}>{products.length}</span>
          </div>
        </div>
      </div>

      {loading && !refreshing ? (
        <div style={webStyle(styles.centerLoader)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>Loading products...</span>
        </div>
      ) : (
        <FlatList
          ref={flatListRef}
          data={products}
          numColumns={viewMode === "grid" ? 2 : 1}
          key={viewMode}
          keyExtractor={(item, index) => getProductIdentity(item, index)}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          renderItem={renderProductItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooter}
          ListEmptyComponent={
            <div style={webStyle(styles.emptyContainer)}>
              <span style={webStyle(styles.emptyText)}>
                {searchMode ? "No products found" : "No products yet"}
              </span>
              <span style={webStyle(styles.emptySubtext)}>
                {searchMode
                  ? "Try adjusting your search"
                  : canEdit
                    ? "Add your first product"
                    : "Products will appear here"}
              </span>
              {canEdit ? (
                <Pressable
                  style={styles.emptyButton}
                  onPress={() => router.push("/products/add")}
                >
                  <Plus size={20} color="#fff" />
                  <span style={webStyle(styles.emptyButtonText)}>Add New Product</span>
                </Pressable>
              ) : null}
            </div>
          }
        />
      )}

      {canEdit ? (
        <div style={webStyle(styles.fabContainer)}>
          <Pressable
            style={styles.fab}
            onPress={() => router.push("/products/add")}
          >
            <Plus size={24} color="#fff" />
          </Pressable>
        </div>
      ) : null}

      <DeleteConfirmModal
        visible={deleteModalVisible}
        message="Are you sure you want to delete this product? This action cannot be undone."
        itemName={deleteTarget?.name}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeleteTarget(null);
        }}
      />

      <KeyboardAwareModal
        visible={showCategories}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategories(false)}
      >
        <CategoriesModal onClose={() => setShowCategories(false)} />
      </KeyboardAwareModal>

      <KeyboardAwareModal
        visible={showMaterials}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMaterials(false)}
      >
        <MaterialsModal onClose={() => setShowMaterials(false)} />
      </KeyboardAwareModal>
    </div>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 12 : 20,
    paddingTop: isTablet ? 40 : isSmallDevice ? 34 : 36,
    paddingBottom: isTablet ? 20 : isSmallDevice ? 12 : 16,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: isTablet ? 28 : isSmallDevice ? 20 : 24,
    fontWeight: "800" as const,
    color: "white",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: "white",
    opacity: 0.9,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  refreshButton: {
    padding: isTablet ? 12 : isSmallDevice ? 8 : 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  headerButtons: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    gap: 8,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.gray100,
    paddingHorizontal: isTablet ? 16 : isSmallDevice ? 10 : 12,
    paddingVertical: isTablet ? 10 : isSmallDevice ? 6 : 8,
    borderRadius: 8,
    gap: 5,
  },
  headerButtonText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: isTablet ? 24 : isSmallDevice ? 10 : 20,
    marginVertical: isTablet ? 20 : isSmallDevice ? 10 : 16,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    borderRadius: isSmallDevice ? 12 : 16,
    borderWidth: 1.5,
    borderColor: "#8b5cf640",
    height: isTablet ? 56 : isSmallDevice ? 40 : 52,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  searchIcon: { marginRight: 12 },
  searchInput: {
    flex: 1,
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: "#0f172a",
    fontWeight: "500" as const,
    height: "100%",
  },
  clearSearchButton: { padding: 4 },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 10 : 20,
    marginBottom: isSmallDevice ? 8 : 12,
    gap: 8,
  },
  toolbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: isTablet ? 24 : isSmallDevice ? 10 : 20,
    marginBottom: isTablet ? 20 : isSmallDevice ? 10 : 16,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 16 : isSmallDevice ? 6 : 12,
    flex: 1,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#8b5cf608",
    borderRadius: isTablet ? 16 : 12,
    padding: isTablet ? 16 : isSmallDevice ? 8 : 14,
    borderWidth: 1,
    borderColor: "#8b5cf620",
    alignItems: "center",
  },
  statLabel: {
    fontSize: isTablet ? 14 : isSmallDevice ? 10 : 12,
    color: "#64748b",
    fontWeight: "600" as const,
    marginBottom: 4,
  },
  statValue: {
    fontSize: isTablet ? 24 : isSmallDevice ? 18 : 22,
    fontWeight: "800" as const,
    color: colors.primary,
  },
  toggleButton: {
    paddingHorizontal: isTablet ? 20 : isSmallDevice ? 14 : 16,
    paddingVertical: isTablet ? 12 : isSmallDevice ? 8 : 10,
    borderRadius: 8,
  },
  toggleActive: { backgroundColor: colors.primary },
  centerLoader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    fontWeight: "600" as const,
  },
  listContainer: {
    paddingHorizontal: isTablet ? 16 : isSmallDevice ? 8 : 12,
    paddingBottom: isSmallDevice ? 84 : 100,
  },
  gridItem: { flex: 0.5, padding: isSmallDevice ? 4 : 6 },
  listItem: { marginBottom: isSmallDevice ? 8 : 12 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isTablet ? 80 : isSmallDevice ? 42 : 70,
    backgroundColor: "#fff",
    borderRadius: isTablet ? 20 : 16,
    marginTop: isTablet ? 40 : isSmallDevice ? 14 : 30,
    borderWidth: 2,
    borderColor: "#8b5cf620",
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: isTablet ? 24 : isSmallDevice ? 18 : 22,
    fontWeight: "700" as const,
    color: "#0f172a",
    marginTop: isTablet ? 24 : isSmallDevice ? 16 : 20,
  },
  emptySubtext: {
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    color: "#64748b",
    marginTop: isTablet ? 8 : isSmallDevice ? 6 : 7,
    opacity: 0.8,
  },
  emptyButton: {
    marginTop: isTablet ? 32 : isSmallDevice ? 20 : 24,
    backgroundColor: colors.primary,
    paddingHorizontal: isTablet ? 32 : isSmallDevice ? 20 : 24,
    paddingVertical: isTablet ? 18 : isSmallDevice ? 14 : 16,
    borderRadius: isTablet ? 16 : 12,
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 10 : isSmallDevice ? 6 : 8,
  },
  emptyButtonText: {
    color: "white",
    fontSize: isTablet ? 18 : isSmallDevice ? 14 : 16,
    fontWeight: "700" as const,
  },
  footerLoader: {
    padding: isTablet ? 28 : isSmallDevice ? 16 : 20,
    alignItems: "center",
  },
  loadingMoreText: {
    fontSize: isTablet ? 16 : isSmallDevice ? 12 : 14,
    color: "#64748b",
    marginTop: 12,
  },
  fabContainer: {
    position: "absolute",
    right: isSmallDevice ? 14 : 20,
    bottom: isSmallDevice ? 22 : 30,
    alignItems: "center",
  },
  fab: {
    width: isSmallDevice ? 52 : 60,
    height: isSmallDevice ? 52 : 60,
    borderRadius: isSmallDevice ? 26 : 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
