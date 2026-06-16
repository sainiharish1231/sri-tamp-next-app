"use client";


import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Grid3x3,
  List,
  Folder,
  Layers,
  X,
  RefreshCw,
  Loader,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import ProductService from "@/services/ProductService";
import CategoriesModal from "@/components/CategoriesPage";
import MaterialsModal from "@/components/MaterialsPage";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { useAuthStore } from "@/store/auth.store";
import Toast from "@/utils/Toast";
import { Product } from "@/types/product";
import { extractCountPayload, extractPagePayload } from "@/utils/response";

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
  const router = useRouter();
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
  const pageSize = 12;

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

  const handleLoadMore = () => {
    if (hasMore && !loadingMore && !loading && !searchMode) {
      fetchProducts(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-b-3xl shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Products</h1>
              <p className="text-purple-100 mt-1">
                {canEdit ? "Manage your inventory" : "Browse our catalog"}
              </p>
            </div>
            <button
              onClick={onRefresh}
              disabled={refreshing || loading}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              {refreshing ? (
                <Loader className="w-6 h-6 animate-spin" />
              ) : (
                <RefreshCw className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-3">
            {canEdit && (
              <>
                <button
                  onClick={() => setShowCategories(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-purple-600 font-medium transition-colors"
                >
                  <Folder className="w-5 h-5" />
                  Categories
                </button>
                <button
                  onClick={() => setShowMaterials(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-purple-600 font-medium transition-colors"
                >
                  <Layers className="w-5 h-5" />
                  Materials
                </button>
              </>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded transition-colors ${
                viewMode === "grid"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded transition-colors ${
                viewMode === "list"
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Total Products</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium">Showing</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">{products.length}</p>
          </div>
        </div>

        {/* Products Grid/List */}
        {loading && !refreshing ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-10 h-10 text-purple-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchMode ? "No products found" : "No products yet"}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchMode
                ? "Try adjusting your search"
                : canEdit
                  ? "Add your first product"
                  : "Products will appear here"}
            </p>
            {canEdit && (
              <button
                onClick={() => router.push("/products/add")}
                className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add New Product
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
                  : "space-y-4 mb-8"
              }
            >
              {products.map((product, index) => (
                <ProductCard
                  key={getProductIdentity(product, index)}
                  item={product}
                  viewMode={viewMode}
                  onView={() => router.push(`/products/${product.id}`)}
                  onEdit={() => router.push(`/products/edit/${product.id}`)}
                  onDelete={() => openDeleteModal(product.id, product.name)}
                  showActions={canEdit}
                  showEnquiry={canEnquiry}
                  onEnquiry={() => {
                    Toast.show({
                      type: "info",
                      text1: "Enquiry",
                      text2: `Enquiry for ${product.name}`,
                    });
                  }}
                />
              ))}
            </div>

            {/* Load More */}
            {!searchMode && hasMore && products.length > 0 && (
              <div className="text-center py-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {loadingMore && <Loader className="w-5 h-5 animate-spin" />}
                  Load More Products
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB for Add Product */}
      {canEdit && (
        <button
          onClick={() => router.push("/products/add")}
          className="fixed bottom-8 right-8 p-4 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-colors hover:shadow-xl"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

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

      {showCategories && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-white rounded-t-xl max-h-[80vh] overflow-y-auto">
            <CategoriesModal onClose={() => setShowCategories(false)} />
          </div>
        </div>
      )}

      {showMaterials && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-white rounded-t-xl max-h-[80vh] overflow-y-auto">
            <MaterialsModal onClose={() => setShowMaterials(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
