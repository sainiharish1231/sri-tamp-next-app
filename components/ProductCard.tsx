import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Platform,
  webStyle,
} from "react-native";
import {
  Eye,
  Pencil,
  Trash2,
  Layers,
  MessageCircle,
} from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors } from "@/colors";
import { getDeviceMetrics } from "@/utils/responsive";
import { getProductRateInfo } from "@/utils/productPricing";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface Props {
  item: any;
  viewMode?: "grid" | "list";
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEnquiry?: () => void;
  showActions?: boolean;
  showEnquiry?: boolean;
}

const ProductCardInner = ({
  item,
  viewMode = "grid",
  onView,
  onEdit,
  onDelete,
  onEnquiry,
  showActions = true,
  showEnquiry = false,
}: Props) => {
  const rateInfo = getProductRateInfo(item);
  const weight = item.productDetail?.weight || "";

  const getStockColor = () => {
    if (item.stock > 10) return "#10b981";
    if (item.stock > 0) return "#f59e0b";
    return "#ef4444";
  };
  const getStockText = () => {
    if (item.stock > 10) return "In Stock";
    if (item.stock > 0) return "Low Stock";
    return "Out of Stock";
  };

  const formatPrice = (priceValue: unknown) => {
    const amount = Number(priceValue || 0);
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getCategoryName = () => {
    if (typeof item.category === "string") return item.category;
    if (item.category?.name) return item.category.name;
    return "Uncategorized";
  };

  const getMaterialName = () => {
    if (typeof item.material === "string") return item.material;
    if (item.material?.name) return item.material.name;
    return null;
  };

  const CardWrapper: any = "div";
  const cardWrapperProps =
    Platform.OS !== "web" ? { entering: FadeIn.duration(400) } : {};
  const cardStyle = [styles.card, viewMode === "list" && styles.cardList];

  return (
    <CardWrapper
      {...cardWrapperProps}
      style={Platform.OS !== "web" ? cardStyle : webStyle(cardStyle)}
    >
      <div
        style={webStyle([
          styles.imageContainer,
          viewMode === "list" && styles.imageContainerList,
        ])}
      >
        <Pressable onPress={onView}>
          <Image
            style={[styles.image, viewMode === "list" && styles.imageList]}
            source={{
              uri:
                item.images?.[0] ||
                "https://via.placeholder.com/400x400/F3F4F6/6B7280?text=Product",
            }}
            resizeMode={viewMode === "grid" ? "cover" : "contain"}
          />
        </Pressable>
        <div
          style={webStyle([styles.statusBadge, { backgroundColor: getStockColor() }])}
        >
          <span style={webStyle(styles.statusText)}>{getStockText()}</span>
        </div>
      </div>

      <div style={webStyle(styles.content)}>
        <div style={webStyle(styles.tagContainer)}>
          {getMaterialName() && (
            <div style={webStyle([styles.tag, styles.materialTag])}>
              <Layers size={12} color="#64748b" />
              <span
                className=" line-clamp-1"
                style={webStyle([styles.tagText, styles.materialText])}
              >
                {getMaterialName()}
              </span>
            </div>
          )}
          {weight ? (
            <div style={webStyle([styles.tag, styles.weightTag])}>
              <span style={webStyle([styles.tagText, styles.weightText])}>{weight}</span>
            </div>
          ) : null}
        </div>
        <Pressable onPress={onView}>
          <span className=" line-clamp-1" style={webStyle(styles.name)}>
            {item.name || "No Name"}
          </span>
        </Pressable>
        <div className="flex w-full flex-row justify-between">
          <div className="flex  flex-row ">
            {item.designCode ? (
              <span style={webStyle(styles.designCode)}>Code: {item.designCode}</span>
            ) : null}
          </div>

          <div className="flex flex-row ">
            <span style={webStyle(styles.tagText)}>{getCategoryName()}</span>
          </div>
        </div>
        <span style={webStyle(styles.desc)}>
          {item.description || "No description available"}
        </span>

        <div style={webStyle(styles.priceStockRow)}>
          <div>
            {rateInfo.amount > 0 ? (
              <span style={webStyle(styles.price)}>
                {formatPrice(rateInfo.amount)}/{rateInfo.unit}
              </span>
            ) : (
              <span style={webStyle(styles.priceMuted)}>Price on enquiry</span>
            )}
          </div>
          <div style={webStyle(styles.stockInfo)}>
            <span style={webStyle(styles.stockLabel)}>Stock:</span>
            <span style={webStyle([styles.stockValue, { color: getStockColor() }])}>
              {item.stock || 0}
            </span>
          </div>
        </div>

        <div style={webStyle(styles.actionContainer)}>
          <Pressable
            style={[styles.actionButton, styles.viewButton]}
            onPress={onView}
          >
            <Eye size={16} color="#fff" />
          </Pressable>

          {showEnquiry && onEnquiry ? (
            <Pressable
              style={[styles.actionButton, styles.enquiryButton]}
              onPress={onEnquiry}
            >
              <MessageCircle size={16} color="#fff" />
            </Pressable>
          ) : null}

          {showActions ? (
            <>
              <Pressable
                style={[styles.actionButton, styles.editButton]}
                onPress={onEdit}
              >
                <Pencil size={16} color="#fff" />
              </Pressable>

              <Pressable
                style={[styles.actionButton, styles.deleteButton]}
                onPress={onDelete}
              >
                <Trash2 size={16} color="#fff" />
              </Pressable>
            </>
          ) : null}
        </div>
      </div>
    </CardWrapper>
  );
};

export default React.memo(ProductCardInner);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderRadius: isSmallDevice ? 8 : 10,
    overflow: "hidden",
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    marginBottom: isSmallDevice ? 10 : 16,
  },
  cardList: {
    flexDirection: "row",
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
  },
  imageContainerList: {
    width: isSmallDevice ? 112 : 140,
    aspectRatio: 0.75,
  },
  image: {
    width: "100%",
    height: "100%",
    backgroundColor: "#f1f5f9",
  },
  imageList: {
    width: isSmallDevice ? 112 : 140,
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: isSmallDevice ? 8 : 12,
    left: isSmallDevice ? 8 : 12,
    paddingHorizontal: isSmallDevice ? 7 : 10,
    paddingVertical: isSmallDevice ? 3 : 4,
    borderRadius: 20,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600" as const,
  },
  content: {
    padding: isSmallDevice ? 10 : 16,
    flex: 1,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: isSmallDevice ? 5 : 8,
    marginBottom: isSmallDevice ? 8 : 12,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3e8ff",
    paddingHorizontal: 6,
    paddingVertical: isSmallDevice ? 3 : 4,
    borderRadius: 12,
    gap: 4,
  },
  materialTag: {
    backgroundColor: "#f1f5f9",
  },
  weightTag: {
    backgroundColor: "#fef3c7",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#8b5cf6",
  },
  materialText: {
    color: "#64748b",
  },
  weightText: {
    color: "#d97706",
  },
  name: {
    fontSize: isSmallDevice ? 15 : 18,
    fontWeight: "700" as const,
    color: "#0f172a",
    marginBottom: 4,
    lineHeight: isSmallDevice ? 20 : 24,
  },
  designCode: {
    fontSize: isSmallDevice ? 10 : 12,
    color: "#64748b",
    marginBottom: isSmallDevice ? 5 : 8,
    fontStyle: "italic",
  },
  desc: {
    fontSize: isSmallDevice ? 11 : 13,
    color: "#64748b",
    lineHeight: isSmallDevice ? 16 : 18,
    marginBottom: isSmallDevice ? 8 : 12,
  },
  priceStockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallDevice ? 8 : 12,
  },
  price: {
    fontSize: isSmallDevice ? 18 : 22,
    fontWeight: "800" as const,
    color: "#0f172a",
  },
  priceMuted: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: "700" as const,
    color: "#64748b",
  },
  originalPrice: {
    fontSize: 14,
    color: "#94a3b8",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  stockInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stockLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  stockValue: {
    fontSize: 18,
    fontWeight: "700" as const,
  },
  actionContainer: {
    flexDirection: "row",
    gap: isSmallDevice ? 5 : 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallDevice ? 8 : 10,
    borderRadius: isSmallDevice ? 9 : 12,
    gap: isSmallDevice ? 4 : 6,
  },
  viewButton: {
    backgroundColor: "#3b82f6",
  },
  enquiryButton: {
    backgroundColor: "#8b5cf6",
  },
  editButton: {
    backgroundColor: "#10b981",
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
});
