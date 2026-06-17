// components/FloatingImageUpload.tsx
import React, { useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  FlatList,
  ActivityIndicator,
  webStyle,
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import useImagePicker from "./useImagePicker";
import { getDeviceMetrics } from "@/utils/responsive";

const { width, isXs: isSmallDevice } = getDeviceMetrics();
const IMAGE_SIZE = isSmallDevice ? (width - 44) / 3 : (width - 64) / 3;

interface ImageFile {
  id: string;
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface FloatingImageUploadProps {
  label: string;
  required?: boolean;
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  error?: string;
  helperText?: string;
  disabled?: boolean;
}

const FloatingImageUpload: React.FC<FloatingImageUploadProps> = ({
  label,
  required = false,
  images = [],
  onImagesChange,
  maxImages = 10,
  error,
  helperText,
  disabled = false,
}) => {
  const { pickImages, loading } = useImagePicker();

  const handlePickImages = async () => {
    if (disabled) return;

    if (images.length >= maxImages) {
      Alert.alert(
        "Limit Reached",
        `You can only upload up to ${maxImages} images.`,
      );
      return;
    }

    const remainingSlots = maxImages - images.length;
    const multiple = remainingSlots > 1;

    const newImages = await pickImages(multiple);

    if (newImages.length > 0) {
      const formattedImages: ImageFile[] = newImages.map((img, index) => ({
        id: `${Date.now()}-${index}`,
        uri: img.uri,
        name: img.name,
        type: img.type,
        size: img.size,
      }));

      onImagesChange([...images, ...formattedImages]);
    }
  };

  const removeImage = (id: string) => {
    Alert.alert("Remove Image", "Are you sure you want to remove this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          onImagesChange(images.filter((img) => img.id !== id));
        },
      },
    ]);
  };

  return (
    <div style={webStyle(styles.container)}>
      {/* Label */}
      <div style={webStyle(styles.labelContainer)}>
        <span style={webStyle([styles.label, error && styles.labelError])}>
          {label}
          {required && <span style={webStyle(styles.required)}> *</span>}
        </span>
        {images.length > 0 && (
          <div style={webStyle(styles.countBadge)}>
            <span style={webStyle(styles.countText)}>
              {images.length}/{maxImages}
            </span>
          </div>
        )}
      </div>

      {/* Images Grid */}
      {images.length > 0 ? (
        <div style={webStyle(styles.imagesContainer)}>
          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <div style={webStyle(styles.imageItem)}>
                <TouchableOpacity
                  style={styles.imageWrapper}
                  onPress={() => removeImage(item.id)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(item.id)}
                  >
                    <Icon name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                  <div style={webStyle(styles.imageNumber)}>
                    <span style={webStyle(styles.imageNumberText)}>{index + 1}</span>
                  </div>
                </TouchableOpacity>
              </div>
            )}
            contentContainerStyle={styles.gridContainer}
          />
        </div>
      ) : (
        <div
          style={webStyle([styles.emptyContainer, error && styles.emptyContainerError])}
        >
          <Icon
            name="image-outline"
            size={48}
            color={error ? "#EF4444" : "#D1D5DB"}
          />
          <span style={webStyle([styles.emptyText, error && styles.emptyTextError])}>
            {error ? "Images are required" : "No images added"}
          </span>
          <span style={webStyle(styles.emptySubtext)}>
            Add product images for better presentation
          </span>
        </div>
      )}

      {/* Upload Button */}
      <TouchableOpacity
        style={[
          styles.uploadButton,
          disabled && styles.uploadButtonDisabled,
          error && styles.uploadButtonError,
        ]}
        onPress={handlePickImages}
        disabled={disabled || loading || images.length >= maxImages}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#8B5CF6" />
        ) : (
          <>
            <Icon
              name="cloud-upload"
              size={20}
              color={error ? "#EF4444" : "#8B5CF6"}
            />
            <span
              style={webStyle([
                styles.uploadButtonText,
                error && styles.uploadButtonTextError,
              ])}
            >
              {images.length === 0 ? "Add Images" : "Add More Images"}
            </span>
          </>
        )}
      </TouchableOpacity>

      {/* Bottom Info */}
      <div style={webStyle(styles.bottomContainer)}>
        {/* Error or Helper Text */}
        <div style={webStyle(styles.textContainer)}>
          {error ? (
            <div style={webStyle(styles.errorContainer)}>
              <Icon name="alert-circle" size={14} color="#EF4444" />
              <span style={webStyle(styles.errorText)}>{error}</span>
            </div>
          ) : helperText ? (
            <div style={webStyle(styles.helperContainer)}>
              <Icon name="information-outline" size={14} color="#6B7280" />
              <span style={webStyle(styles.helperText)}>{helperText}</span>
            </div>
          ) : null}
        </div>

        {/* Image Count Info */}
        <span style={webStyle(styles.countInfo)}>
          {images.length} of {maxImages} images
        </span>
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: isSmallDevice ? 12 : 20,
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isSmallDevice ? 8 : 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  labelError: {
    color: "#EF4444",
  },
  required: {
    color: "#EF4444",
  },
  countBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  imagesContainer: {
    marginBottom: isSmallDevice ? 10 : 16,
  },
  gridContainer: {
    gap: isSmallDevice ? 5 : 8,
  },
  imageItem: {
    width: IMAGE_SIZE,
    margin: 2,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: isSmallDevice ? 8 : 10,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  removeButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 2,
  },
  imageNumber: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  imageNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: isSmallDevice ? 20 : 32,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    borderRadius: isSmallDevice ? 10 : 12,
    backgroundColor: "#F9FAFB",
    marginBottom: isSmallDevice ? 10 : 16,
  },
  emptyContainerError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  emptyText: {
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
  },
  emptyTextError: {
    color: "#EF4444",
  },
  emptySubtext: {
    fontSize: isSmallDevice ? 12 : 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallDevice ? 6 : 8,
    padding: isSmallDevice ? 11 : 14,
    borderWidth: 1.5,
    borderColor: "#8B5CF6",
    borderRadius: isSmallDevice ? 10 : 12,
    backgroundColor: "#F5F3FF",
  },
  uploadButtonDisabled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F3F4F6",
  },
  uploadButtonError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  uploadButtonText: {
    fontSize: isSmallDevice ? 14 : 15,
    fontWeight: "600",
    color: "#8B5CF6",
  },
  uploadButtonTextError: {
    color: "#EF4444",
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    minHeight: 20,
  },
  textContainer: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
  },
  helperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
  },
  countInfo: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
});

export default FloatingImageUpload;
