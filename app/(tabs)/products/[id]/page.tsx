"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Toast } from "@/utils/toast";

import { useLocalSearchParams } from "@/compat/expo-router";

import {
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
  Platform,
  webStyle,
} from "react-native";
import {
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  ArrowRight,
  Ruler,
  Scale,
  Box,
  CheckCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import ProductService from "@/services/ProductService";
import { colors } from "@/colors";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "@/store/auth.store";
import { Product } from "@/types/product";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Toast from "@/utils/Toast";
import { useLanguage } from "@/hooks/use-language";
import { getDeviceMetrics } from "@/utils/responsive";
import { getProductRateInfo } from "@/utils/productPricing";
import { extractArrayPayload, extractEntityPayload } from "@/utils/response";

const { width: SCREEN_WIDTH, isXs: isSmallDevice } = getDeviceMetrics();

const formatPrice = (price: unknown): string => {
  const priceNum = Number(price || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(priceNum);
};

export default function ProductPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuthStore();
  const user = session?.user;
  const userRole = user?.role;
  console.log(userRole);
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = userRole === "admin";
  const isInternalUser = userRole === "internal_user";
  const isParty = userRole === "party";
  const isUser = userRole === "user";
  const canEdit = isAdmin || isInternalUser;
  const canEnquiry = isParty || isUser;

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ProductService.fetchProductById(id!);
      const productData = extractEntityPayload<any>(response);
      if (!response.success || !productData) {
        Toast.show({
          type: "error",
          text1: t("product_not_found"),
          text2: response.message || t("please_try_again"),
        });
        return;
      }
      setProduct(productData);
    } catch (error) {
      console.error("Error fetching product:", error);
      Toast.show({
        type: "error",
        text1: t("failed_to_load_product"),
        text2: t("please_check_connection"),
      });
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  const fetchRelatedProducts = useCallback(async () => {
    if (!product) return;
    try {
      setIsLoadingRelated(true);
      const response = await ProductService.fetchAllProducts();
      if (!response.success) return;

      const productsData = extractArrayPayload<Product>(response, ["products"]);

      const related = productsData
        .filter(
          (p: any) =>
            p.id !== product.id &&
            (p.category?.name === product.category?.name ||
              p.material?.name === product.material?.name),
        )
        .slice(0, 4);
      setRelatedProducts(related);
    } catch (error) {
      console.error("Error fetching related products:", error);
    } finally {
      setIsLoadingRelated(false);
    }
  }, [product]);

  useEffect(() => {
    if (id) fetchProduct();
  }, [fetchProduct, id]);

  useEffect(() => {
    if (product) fetchRelatedProducts();
  }, [product, fetchRelatedProducts]);

  const handleEditProduct = () => {
    if (!product) return;
    router.push(`/products/edit/${product.id}`);
  };

  const confirmDelete = async () => {
    if (!product) return;
    try {
      setDeleting(true);
      const res = await ProductService.deleteProduct(product.id);
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("deleted"),
          text2: res.message || t("product_deleted_successfully"),
        });
        setDeleteModalVisible(false);
        setTimeout(() => router.back(), 500);
      } else {
        Toast.show({
          type: "error",
          text1: t("error"),
          text2: res.message || t("failed_to_delete_product"),
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("error"),
        text2: error.message || t("failed_to_delete_product"),
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        message: `Check out ${product.name} (Design: ${product.designCode})`,
        title: product.name,
      });
    } catch {
      Toast.show({ type: "error", text1: t("error_sharing_product") });
    }
  };

  const nextImage = () => {
    if (product?.images && product.images.length > 1) {
      setSelectedImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product?.images && product.images.length > 1) {
      setSelectedImage(
        (prev) => (prev - 1 + product.images.length) % product.images.length,
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <div style={webStyle(styles.header)}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={colors.secondary} />
          </TouchableOpacity>
          <span style={webStyle(styles.headerTitle)}>{t("loading")}</span>
          <div style={webStyle({ width: 32 })} />
        </div>
        <div style={webStyle(styles.centerLoader)}>
          <ActivityIndicator size="large" color={colors.primary} />
          <span style={webStyle(styles.loadingText)}>{t("loading_product")}</span>
        </div>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <div style={webStyle(styles.errorContainer)}>
          <span style={webStyle(styles.errorIconText)}>🔍</span>
          <span style={webStyle(styles.errorTitle)}>{t("product_not_found")}</span>
          <span style={webStyle(styles.errorMessage)}>
            {t("product_not_found_message")}
          </span>
          <TouchableOpacity
            style={styles.errorBackButton}
            onPress={() => router.back()}
          >
            <span style={webStyle(styles.errorBackButtonText)}>{t("go_back")}</span>
          </TouchableOpacity>
        </div>
      </SafeAreaView>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : ["https://via.placeholder.com/400x500/F3F4F6/6B7280?text=No+Image"];

  const productRate = getProductRateInfo(product);
  const productPrice = productRate.amount;
  const productWeight = product.productDetail?.weight;
  const productHeight = product.productDetail?.height;
  const productWidth = product.productDetail?.width;
  const productDimensions = product.productDetail?.dimensions;

  const renderActionButtons = () => {
    if (canEdit) {
      return (
        <>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={handleEditProduct}
            activeOpacity={0.9}
          >
            <Pencil size={20} color={colors.white} />
            <span style={webStyle(styles.actionButtonText)}>
              {t("edit_product")}
            </span>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => setDeleteModalVisible(true)}
            activeOpacity={0.9}
          >
            <Trash2 size={20} color={colors.white} />
            <span style={webStyle(styles.actionButtonText)}>
              {t("delete")}
            </span>
          </TouchableOpacity>
        </>
      );
    }

    if (canEnquiry) {
      return (
        <>
          <TouchableOpacity
            style={[styles.actionButton, styles.enquiryButton]}
            activeOpacity={0.9}
            onPress={() =>
              Toast.show({
                type: "info",
                text1: t("enquiry"),
                text2: `Enquiry for ${product.name}`,
              })
            }
          >
            <MessageCircle size={20} color={colors.white} />
            <span style={webStyle(styles.actionButtonText)}>
              {t("enquire_now")}
            </span>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.actionButton, styles.enquiryButton]}
        activeOpacity={0.9}
        onPress={() =>
          Toast.show({
            type: "info",
            text1: t("enquiry"),
            text2: `Enquiry for ${product.name}`,
          })
        }
      >
        <MessageCircle size={20} color={colors.white} />
        <span style={webStyle(styles.actionButtonText)}>
          {t("enquire_now")}
        </span>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <div style={webStyle(styles.header)}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color={colors.secondary} />
        </TouchableOpacity>
        <span style={webStyle(styles.headerTitle)}>
          {t("product_details")}
        </span>
        <div style={webStyle(styles.headerRightRow)}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={20} color={colors.secondary} />
          </TouchableOpacity>
        </div>
      </div>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <div style={webStyle(styles.imageSection)}>
          <div style={webStyle(styles.mainImageContainer)}>
            {imageLoading ? (
              <div style={webStyle(styles.imageLoader)}>
                <ActivityIndicator size="large" color={colors.primary} />
              </div>
            ) : null}
            <Image
              source={{ uri: images[selectedImage] }}
              style={styles.mainImage}
              resizeMode="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoadEnd={() => setImageLoading(false)}
            />
            {images.length > 1 ? (
              <>
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={prevImage}
                  activeOpacity={0.8}
                >
                  <ChevronLeft size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={nextImage}
                  activeOpacity={0.8}
                >
                  <ChevronRight size={20} color="#FFFFFF" />
                </TouchableOpacity>
                <div style={webStyle(styles.imageCounter)}>
                  <span style={webStyle(styles.imageCounterText)}>
                    {selectedImage + 1} / {images.length}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {images.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailsScroll}
              contentContainerStyle={styles.thumbnailsContent}
            >
              {images.map((img: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.thumbnail,
                    selectedImage === index && styles.selectedThumbnail,
                  ]}
                  onPress={() => setSelectedImage(index)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: img }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
        </div>

        <div style={webStyle(styles.detailsCard)}>
          <span style={webStyle(styles.productTitle)}>
            {product.name}
          </span>
          <div style={webStyle(styles.designCodeRow)}>
            <span style={webStyle(styles.designCodeLabel)}>{t("design_code")}: </span>
            <span style={webStyle(styles.designCodeValue)}>{product.designCode}</span>
          </div>

          <div style={webStyle(styles.tagsRow)}>
            {product.category?.name ? (
              <div style={webStyle(styles.categoryTag)}>
                <Package size={14} color={colors.white} />
                <span style={webStyle(styles.categoryTagText)}>
                  {product.category.name}
                </span>
              </div>
            ) : null}
            {product.material?.name ? (
              <div style={webStyle(styles.materialTag)}>
                <Layers size={14} color={colors.primary} />
                <span style={webStyle(styles.materialTagText)}>
                  {product.material.name}
                </span>
              </div>
            ) : null}
          </div>

          {productPrice > 0 ? (
            <div style={webStyle(styles.priceSection)}>
              <span style={webStyle(styles.priceText)}>
                {formatPrice(productPrice)}/{productRate.unit}
              </span>
            </div>
          ) : (
            <span style={webStyle(styles.priceOnEnquiry)}>{t("price_on_enquiry")}</span>
          )}

          <div style={webStyle(styles.divider)} />

          <div style={webStyle(styles.stockSection)}>
            <div style={webStyle(styles.stockInfo)}>
              <CheckCircle size={20} color={colors.green} />
              <div style={webStyle(styles.stockTextContainer)}>
                <span style={webStyle(styles.stockTitle)}>{t("availability")}</span>
                <span
                  style={webStyle([
                    styles.stockStatus,
                    {
                      color:
                        product.stock > 10
                          ? colors.green
                          : product.stock > 0
                            ? colors.yellow
                            : colors.red,
                    },
                  ])}
                >
                  {product.stock > 10
                    ? t("in_stock")
                    : product.stock > 0
                      ? t("low_stock")
                      : t("out_of_stock")}
                </span>
              </div>
            </div>
            <span style={webStyle(styles.stockCount)}>
              {t("units_available", product.stock)}
            </span>
          </div>

          <div style={webStyle(styles.specsSection)}>
            <span style={webStyle(styles.sectionHeading)}>{t("specifications")}</span>
            <div style={webStyle(styles.specsGrid)}>
              {product.stock !== undefined ? (
                <div style={webStyle(styles.specItem)}>
                  <Package size={18} color={colors.primary} />
                  <span style={webStyle(styles.specLabel)}>{t("stock")}</span>
                  <span style={webStyle(styles.specValue)}>
                    {product.stock}
                  </span>
                </div>
              ) : null}
              {productWeight ? (
                <div style={webStyle(styles.specItem)}>
                  <Scale size={18} color={colors.primary} />
                  <span style={webStyle(styles.specLabel)}>{t("weight")}</span>
                  <span style={webStyle(styles.specValue)}>
                    {productWeight}
                  </span>
                </div>
              ) : null}
              {productHeight ? (
                <div style={webStyle(styles.specItem)}>
                  <Ruler size={18} color={colors.primary} />
                  <span style={webStyle(styles.specLabel)}>{t("height")}</span>
                  <span style={webStyle(styles.specValue)}>
                    {productHeight}
                  </span>
                </div>
              ) : null}
              {productWidth ? (
                <div style={webStyle(styles.specItem)}>
                  <Ruler size={18} color={colors.primary} />
                  <span style={webStyle(styles.specLabel)}>{t("width")}</span>
                  <span style={webStyle(styles.specValue)}>
                    {productWidth}
                  </span>
                </div>
              ) : null}
              {productDimensions ? (
                <div style={webStyle(styles.specItem)}>
                  <Box size={18} color={colors.primary} />
                  <span style={webStyle(styles.specLabel)}>{t("dimensions")}</span>
                  <span style={webStyle(styles.specValue)}>
                    {productDimensions}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div style={webStyle(styles.divider)} />
          <span style={webStyle(styles.sectionHeading)}>{t("product_description")}</span>
          {product.description ? (
            <div style={webStyle(styles.descriptionSection)}>
              <span style={webStyle(styles.descriptionText)}>{product.description}</span>
            </div>
          ) : (
            <span style={webStyle(styles.noDescText)}>{t("no_description_available")}</span>
          )}
        </div>

        {relatedProducts.length > 0 ? (
          <div style={webStyle(styles.relatedSection)}>
            <div style={webStyle(styles.relatedHeader)}>
              <div>
                <span style={webStyle(styles.relatedTitle)}>{t("similar_products")}</span>
                <span style={webStyle(styles.relatedSubtitle)}>
                  {t("explore_more_collection")}
                </span>
              </div>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/")}
              >
                <span style={webStyle(styles.viewAllText)}>{t("view_all")}</span>
                <ArrowRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </div>

            {isLoadingRelated ? (
              <div style={webStyle(styles.relatedLoading)}>
                <ActivityIndicator size="large" color={colors.primary} />
              </div>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.relatedScroll}
                contentContainerStyle={styles.relatedScrollContent}
              >
                {relatedProducts.map((item) => {
                  const relatedRate = getProductRateInfo(item);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.relatedCard}
                      onPress={() => router.push(`/products/${item.id}`)}
                      activeOpacity={0.7}
                    >
                      <div style={webStyle(styles.relatedImageWrapper)}>
                        <Image
                          source={{
                            uri:
                              item.images && item.images.length > 0
                                ? item.images[0]
                                : "https://via.placeholder.com/150/F3F4F6/6B7280?text=Product",
                          }}
                          style={styles.relatedImage}
                          resizeMode="cover"
                        />
                      </div>
                      <div style={webStyle(styles.relatedInfo)}>
                        <span style={webStyle(styles.relatedName)}>
                          {item.name}
                        </span>
                        <span style={webStyle(styles.relatedCode)}>
                          {item.designCode}
                        </span>
                        {relatedRate.amount > 0 ? (
                          <span style={webStyle(styles.relatedPrice)}>
                            {formatPrice(relatedRate.amount)}/{relatedRate.unit}
                          </span>
                        ) : (
                          <span style={webStyle(styles.relatedQuote)}>{t("get_quote")}</span>
                        )}
                      </div>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </div>
        ) : null}
      </ScrollView>

      <div style={webStyle(styles.actionBar)}>{renderActionButtons()}</div>

      <DeleteConfirmModal
        visible={deleteModalVisible}
        message={t("delete_product_message")}
        itemName={product.name}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: isSmallDevice ? 86 : 100 },
  centerLoader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: {
    marginTop: isSmallDevice ? 10 : 16,
    fontSize: isSmallDevice ? 13 : 16,
    color: "#64748b",
    fontWeight: "600" as const,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isSmallDevice ? 12 : 20,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderBottomLeftRadius: isSmallDevice ? 20 : 30,
    borderBottomRightRadius: isSmallDevice ? 20 : 30,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: {
    fontSize: isSmallDevice ? 15 : 17,
    fontWeight: "600" as const,
    color: colors.secondary,
    flex: 1,
    textAlign: "center",
  },
  headerRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 10 : 16,
  },
  iconButton: { padding: 4 },
  imageSection: { backgroundColor: colors.white },
  mainImageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (isSmallDevice ? 0.95 : 1.1),
    position: "relative",
    backgroundColor: colors.gray50,
  },
  mainImage: { width: "100%", height: "100%" },
  imageLoader: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.gray50,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    width: isSmallDevice ? 34 : 40,
    height: isSmallDevice ? 34 : 40,
    borderRadius: isSmallDevice ? 17 : 20,
    justifyContent: "center",
    alignItems: "center",
  },
  prevButton: { left: isSmallDevice ? 10 : 16 },
  nextButton: { right: isSmallDevice ? 10 : 16 },
  imageCounter: {
    position: "absolute",
    bottom: isSmallDevice ? 10 : 16,
    right: isSmallDevice ? 10 : 16,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: isSmallDevice ? 9 : 12,
    paddingVertical: isSmallDevice ? 4 : 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: colors.white,
    fontSize: isSmallDevice ? 11 : 13,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  thumbnailsScroll: {
    paddingVertical: isSmallDevice ? 10 : 16,
    backgroundColor: colors.white,
  },
  thumbnailsContent: {
    paddingHorizontal: isSmallDevice ? 12 : 16,
    gap: isSmallDevice ? 7 : 10,
  },
  thumbnail: {
    width: isSmallDevice ? 54 : 70,
    height: isSmallDevice ? 54 : 70,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.gray200,
    overflow: "hidden",
    backgroundColor: colors.secondary,
  },
  selectedThumbnail: { borderColor: colors.primary },
  thumbnailImage: { width: "100%", height: "100%" },
  detailsCard: {
    backgroundColor: colors.white,
    marginTop: 1,
    padding: isSmallDevice ? 16 : 24,
  },
  productTitle: {
    fontSize: isSmallDevice ? 20 : 24,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 8,
    lineHeight: isSmallDevice ? 26 : 32,
    letterSpacing: 0,
  },
  designCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isSmallDevice ? 12 : 16,
  },
  designCodeLabel: {
    fontSize: isSmallDevice ? 12 : 14,
    color: colors.gray600,
    fontWeight: "500" as const,
  },
  designCodeValue: {
    fontSize: isSmallDevice ? 12 : 14,
    fontWeight: "600" as const,
    color: colors.primary,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isSmallDevice ? 6 : 8,
    marginBottom: isSmallDevice ? 14 : 20,
  },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: isSmallDevice ? 9 : 12,
    paddingVertical: isSmallDevice ? 5 : 6,
    borderRadius: 20,
  },
  categoryTagText: {
    fontSize: isSmallDevice ? 11 : 13,
    fontWeight: "500" as const,
    color: colors.white,
  },
  materialTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.gray100,
    paddingHorizontal: isSmallDevice ? 9 : 12,
    paddingVertical: isSmallDevice ? 5 : 6,
    borderRadius: 20,
  },
  materialTagText: {
    fontSize: isSmallDevice ? 11 : 13,
    fontWeight: "500" as const,
    color: colors.text,
  },
  priceSection: { marginBottom: isSmallDevice ? 16 : 24 },
  priceText: {
    fontSize: isSmallDevice ? 23 : 28,
    fontWeight: "700" as const,
    color: colors.text,
    letterSpacing: 0,
  },
  priceOnEnquiry: {
    fontSize: isSmallDevice ? 15 : 18,
    color: colors.gray600,
    fontWeight: "500" as const,
    marginBottom: isSmallDevice ? 16 : 24,
    fontStyle: "italic",
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: isSmallDevice ? 16 : 24,
  },
  descriptionSection: { marginBottom: isSmallDevice ? 20 : 32 },
  sectionHeading: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
    letterSpacing: 0,
  },
  descriptionText: {
    fontSize: isSmallDevice ? 13 : 15,
    lineHeight: isSmallDevice ? 20 : 24,
    color: colors.gray700,
    fontWeight: "400" as const,
  },
  noDescText: {
    fontSize: isSmallDevice ? 12 : 14,
    color: colors.gray500,
    fontStyle: "italic",
    marginBottom: 20,
  },
  specsSection: { marginBottom: isSmallDevice ? 20 : 32 },
  specsGrid: { flexDirection: "row", flexWrap: "wrap", gap: isSmallDevice ? 8 : 12 },
  specItem: {
    width: (SCREEN_WIDTH - (isSmallDevice ? 40 : 72)) / 2,
    backgroundColor: colors.gray50,
    padding: isSmallDevice ? 10 : 16,
    borderRadius: isSmallDevice ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    alignItems: "center",
  },
  specLabel: {
    fontSize: isSmallDevice ? 10 : 12,
    color: colors.gray600,
    marginTop: isSmallDevice ? 6 : 8,
    marginBottom: 4,
    textAlign: "center",
    fontWeight: "500" as const,
  },
  specValue: {
    fontSize: isSmallDevice ? 12 : 15,
    fontWeight: "600" as const,
    color: colors.text,
    textAlign: "center",
  },
  stockSection: {
    flexDirection: isSmallDevice ? "column" : "row",
    justifyContent: "space-between",
    alignItems: isSmallDevice ? "flex-start" : "center",
    padding: isSmallDevice ? 12 : 16,
    backgroundColor: colors.gray50,
    borderRadius: isSmallDevice ? 10 : 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    marginBottom: isSmallDevice ? 20 : 32,
  },
  stockInfo: { flexDirection: "row", alignItems: "center", gap: isSmallDevice ? 8 : 12 },
  stockTextContainer: { flexDirection: "column" },
  stockTitle: { fontSize: isSmallDevice ? 12 : 14, color: colors.gray600, marginBottom: 2 },
  stockStatus: { fontSize: isSmallDevice ? 14 : 16, fontWeight: "600" as const },
  stockCount: {
    fontSize: isSmallDevice ? 12 : 14,
    color: colors.gray600,
    fontWeight: "500" as const,
  },
  relatedSection: {
    backgroundColor: colors.white,
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: isSmallDevice ? 18 : 24,
  },
  relatedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: isSmallDevice ? 14 : 20,
  },
  relatedTitle: {
    fontSize: isSmallDevice ? 17 : 20,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 4,
    letterSpacing: 0,
  },
  relatedSubtitle: {
    fontSize: isSmallDevice ? 12 : 14,
    color: colors.gray600,
    fontWeight: "500" as const,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingLeft: 12,
  },
  viewAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600" as const,
  },
  relatedLoading: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
  },
  relatedScroll: { marginHorizontal: isSmallDevice ? -16 : -24 },
  relatedScrollContent: {
    paddingHorizontal: isSmallDevice ? 16 : 24,
    gap: isSmallDevice ? 10 : 16,
  },
  relatedCard: {
    width: isSmallDevice ? 144 : 180,
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.gray200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  relatedImageWrapper: {
    width: isSmallDevice ? 144 : 180,
    height: isSmallDevice ? 132 : 180,
    position: "relative",
    backgroundColor: colors.gray50,
  },
  relatedImage: { width: "100%", height: "100%" },
  relatedInfo: { padding: isSmallDevice ? 10 : 14 },
  relatedName: {
    fontSize: isSmallDevice ? 13 : 15,
    fontWeight: "600" as const,
    color: colors.text,
    marginBottom: 4,
  },
  relatedCode: {
    fontSize: isSmallDevice ? 11 : 12,
    color: colors.gray600,
    marginBottom: 8,
    fontWeight: "500" as const,
  },
  relatedPrice: {
    fontSize: isSmallDevice ? 13 : 16,
    fontWeight: "700" as const,
    color: colors.primary,
  },
  relatedQuote: {
    fontSize: isSmallDevice ? 12 : 13,
    color: colors.gray600,
    fontWeight: "500" as const,
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    flexDirection: "row",
    padding: isSmallDevice ? 10 : 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: isSmallDevice ? 8 : 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallDevice ? 5 : 8,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderRadius: isSmallDevice ? 10 : 12,
  },
  editButton: { backgroundColor: colors.blue },
  deleteButton: { backgroundColor: colors.red },
  enquiryButton: { backgroundColor: colors.primary },
  cartButton: { backgroundColor: colors.green },
  actionButtonText: {
    color: colors.white,
    fontSize: isSmallDevice ? 12 : 15,
    fontWeight: "600" as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 24 : 40,
    backgroundColor: colors.background,
  },
  errorIconText: { fontSize: isSmallDevice ? 30 : 36, marginBottom: isSmallDevice ? 16 : 24 },
  errorTitle: {
    fontSize: isSmallDevice ? 19 : 22,
    fontWeight: "700" as const,
    color: colors.text,
    marginBottom: 12,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: isSmallDevice ? 13 : 16,
    color: colors.gray600,
    textAlign: "center",
    marginBottom: isSmallDevice ? 22 : 32,
    lineHeight: isSmallDevice ? 19 : 24,
  },
  errorBackButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: isSmallDevice ? 22 : 32,
    paddingVertical: isSmallDevice ? 11 : 14,
    borderRadius: 10,
    minWidth: isSmallDevice ? 132 : 160,
    alignItems: "center",
  },
  errorBackButtonText: {
    color: colors.white,
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600" as const,
  },
});
