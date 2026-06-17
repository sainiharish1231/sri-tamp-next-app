"use client";

import React from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Layers,
  MessageCircle,
} from "lucide-react";
import { getProductRateInfo } from "@/utils/productPricing";

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

  const getStockColor = (): { bg: string; text: string; badge: string } => {
    if (item.stock > 10)
      return { bg: "#10b981", text: "In Stock", badge: "bg-green-500" };
    if (item.stock > 0)
      return { bg: "#f59e0b", text: "Low Stock", badge: "bg-amber-500" };
    return { bg: "#ef4444", text: "Out of Stock", badge: "bg-red-500" };
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

  const stock = getStockColor();

  if (viewMode === "list") {
    return (
      <div className="flex gap-4 bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="w-32 h-40 flex-shrink-0 bg-gray-100 overflow-hidden">
          <button
            onClick={onView}
            className="w-full h-full hover:opacity-90 transition-opacity"
          >
            <img
              src={
                item.images?.[0] ||
                "https://via.placeholder.com/400x400/F3F4F6/6B7280?text=Product"
              }
              alt={item.name}
              className="w-full h-full object-contain"
            />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          <div>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {getMaterialName() && (
                <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600">
                  <Layers className="w-3 h-3" />
                  <span className="truncate">{getMaterialName()}</span>
                </div>
              )}
              {weight && (
                <div className="bg-amber-100 px-2 py-1 rounded-full text-xs text-amber-700">
                  {weight}
                </div>
              )}
            </div>

            {/* Name and Code */}
            <button onClick={onView} className="text-left mb-1">
              <h3 className="font-bold text-gray-900 line-clamp-1 hover:text-purple-600">
                {item.name || "No Name"}
              </h3>
            </button>

            {item.designCode && (
              <p className="text-xs text-gray-500 italic mb-1">Code: {item.designCode}</p>
            )}

            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {item.description || "No description available"}
            </p>

            {/* Category and Stock */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{getCategoryName()}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium text-white ${stock.badge}`}>
                {stock.text}
              </span>
            </div>
          </div>

          {/* Price and Actions */}
          <div className="flex items-center justify-between mt-3">
            <div>
              {rateInfo.amount > 0 ? (
                <p className="text-lg font-bold text-gray-900">
                  {formatPrice(rateInfo.amount)}/{rateInfo.unit}
                </p>
              ) : (
                <p className="text-sm font-semibold text-gray-600">Price on enquiry</p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onView}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </button>
              {showEnquiry && onEnquiry && (
                <button
                  onClick={onEnquiry}
                  className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              )}
              {showActions && (
                <>
                  <button
                    onClick={onEdit}
                    className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onDelete}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg transition-all hover:scale-105">
      {/* Image Container */}
      <div className="relative w-full aspect-square bg-gray-100 overflow-hidden group">
        <button
          onClick={onView}
          className="w-full h-full hover:opacity-90 transition-opacity"
        >
          <img
            src={
              item.images?.[0] ||
              "https://via.placeholder.com/400x400/F3F4F6/6B7280?text=Product"
            }
            alt={item.name}
            className="w-full h-full object-cover"
          />
        </button>

        {/* Stock Badge */}
        <div
          className="absolute top-3 left-3 px-3 py-1 rounded-full text-white text-xs font-semibold"
          style={{ backgroundColor: stock.bg }}
        >
          {stock.text}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {getMaterialName() && (
            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full text-xs text-gray-600">
              <Layers className="w-3 h-3" />
              <span className="truncate">{getMaterialName()}</span>
            </div>
          )}
          {weight && (
            <div className="bg-amber-100 px-2 py-1 rounded-full text-xs text-amber-700">
              {weight}
            </div>
          )}
        </div>

        {/* Name */}
        <button onClick={onView} className="text-left mb-2 block w-full">
          <h3 className="font-bold text-gray-900 line-clamp-1 hover:text-purple-600 text-sm">
            {item.name || "No Name"}
          </h3>
        </button>

        {/* Design Code */}
        {item.designCode && (
          <p className="text-xs text-gray-500 italic mb-2">Code: {item.designCode}</p>
        )}

        {/* Category */}
        <p className="text-xs text-gray-600 mb-2">{getCategoryName()}</p>

        {/* Description */}
        <p className="text-xs text-gray-600 line-clamp-2 mb-3">
          {item.description || "No description available"}
        </p>

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {rateInfo.amount > 0 ? (
              <p className="text-lg font-bold text-gray-900">
                {formatPrice(rateInfo.amount)}
              </p>
            ) : (
              <p className="text-xs font-semibold text-gray-600">Price on enquiry</p>
            )}
            {rateInfo.unit && (
              <p className="text-xs text-gray-500">per {rateInfo.unit}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-600">Stock</p>
            <p className="text-lg font-bold" style={{ color: stock.bg }}>
              {item.stock || 0}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={onView}
            className="col-span-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center"
            title="View"
          >
            <Eye className="w-4 h-4" />
          </button>

          {showEnquiry && onEnquiry && (
            <button
              onClick={onEnquiry}
              className="col-span-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
              title="Enquiry"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
          )}

          {showActions && (
            <>
              <button
                onClick={onEdit}
                className="col-span-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center"
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={onDelete}
                className="col-span-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCardInner);
