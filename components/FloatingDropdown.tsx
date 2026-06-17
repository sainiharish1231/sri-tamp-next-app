import React, { useState, useRef, useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Animated,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Alert,
  webStyle,
} from "react-native";
import { colors } from "@/colors";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface FloatingDropdownProps {
  label: string;
  required?: boolean;
  value: string;
  items: Array<{ id: string; name: string }>;
  placeholder?: string;
  onSelect: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
  error?: string;
  onSearch?: (searchText: string) => void;
  onClearSearch?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  loading?: boolean;
  totalCount?: number;
  onAddNew?: (name: string) => Promise<{ id: string; name: string } | null>;
  addNewLabel?: string;
}

const FloatingDropdown: React.FC<FloatingDropdownProps> = ({
  label,
  required = false,
  value,
  items,
  placeholder = "Select",
  onSelect,
  searchable = false,
  disabled = false,
  error,
  onSearch,
  onClearSearch,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  loading = false,
  totalCount,
  onAddNew,
  addNewLabel,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const flatListRef = useRef<FlatList>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedMoreRef = useRef(false);

  const selectedItem = items.find((item) => item.id === value);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setIsSearching(true);
    hasLoadedMoreRef.current = false;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (onSearch) {
        onSearch(text);
      }
      setIsSearching(false);
    }, 500);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (onClearSearch) {
      onClearSearch();
    }
    hasLoadedMoreRef.current = false;
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;

    if (
      isNearBottom &&
      hasMore &&
      !loadingMore &&
      !loading &&
      onLoadMore &&
      !hasLoadedMoreRef.current
    ) {
      hasLoadedMoreRef.current = true;
      onLoadMore();
      setTimeout(() => {
        hasLoadedMoreRef.current = false;
      }, 1000);
    }
  };

  const handleEndReached = () => {
    if (
      hasMore &&
      !loadingMore &&
      !loading &&
      onLoadMore &&
      !hasLoadedMoreRef.current
    ) {
      hasLoadedMoreRef.current = true;
      onLoadMore();
      setTimeout(() => {
        hasLoadedMoreRef.current = false;
      }, 1000);
    }
  };

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value || isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, isFocused]);

  const handlePress = () => {
    if (!disabled) {
      setIsFocused(true);
      setModalVisible(true);
      hasLoadedMoreRef.current = false;
    }
  };

  const handleClose = () => {
    setIsFocused(false);
    setModalVisible(false);
    setSearchQuery("");
    hasLoadedMoreRef.current = false;
  };

  const handleSelect = (item: { id: string; name: string }) => {
    onSelect(item.id);
    handleClose();
  };

  const handleAddNew = async () => {
    if (!onAddNew || !searchQuery.trim()) return;

    setIsAddingNew(true);
    try {
      const newItem = await onAddNew(searchQuery.trim());
      if (newItem) {
        onSelect(newItem.id);
        handleClose();
      }
    } catch (err: any) {
      console.log("Error adding new item:", err);
      Alert.alert("Error", err?.message || "Failed to add new item");
    } finally {
      setIsAddingNew(false);
    }
  };

  const translateY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -32],
  });

  const scale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1.2, 0.9],
  });

  const getLabelColor = () => {
    if (error) return "#EF4444";
    if (isFocused) return "#8B5CF6";
    return "#9CA3AF";
  };

  const getBorderColor = () => {
    if (error) return "#EF4444";
    if (isFocused) return "#8B5CF6";
    return "#E5E7EB";
  };

  const shouldShowPlaceholder = !value && isFocused;
  const shouldShowValue = !!value;

  const filteredItems = searchQuery.trim()
    ? items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items;

  const showAddNewOption =
    onAddNew && searchQuery.trim().length > 0 && filteredItems.length === 0;

  const ListFooterComponent = () => {
    if (isAddingNew) {
      return (
        <div style={webStyle(styles.footerLoader)}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <span style={webStyle(styles.footerText)}>Adding...</span>
        </div>
      );
    }

    if (loadingMore) {
      return (
        <div style={webStyle(styles.footerLoader)}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <span style={webStyle(styles.footerText)}>Loading more items...</span>
        </div>
      );
    }

    if (hasMore && items.length > 0) {
      return (
        <div style={webStyle(styles.footerLoader)}>
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => {
              if (onLoadMore && !loadingMore && !loading) {
                onLoadMore();
              }
            }}
            disabled={loadingMore || loading}
          >
            <Icon name="chevron-down" size={20} color="#8B5CF6" />
            <span style={webStyle(styles.loadMoreButtonText)}>Load More</span>
          </TouchableOpacity>
        </div>
      );
    }

    if (onAddNew && searchQuery.trim().length > 0 && filteredItems.length > 0) {
      return (
        <TouchableOpacity
          style={styles.addNewFooterButton}
          onPress={handleAddNew}
          disabled={isAddingNew}
        >
          <Icon name="plus-circle-outline" size={20} color="#8B5CF6" />
          <span style={webStyle(styles.addNewFooterText)}>
            Add {`"${searchQuery.trim()}"`} as new{" "}
            {addNewLabel || label.toLowerCase()}
          </span>
        </TouchableOpacity>
      );
    }

    if (!hasMore && items.length > 0 && !onAddNew) {
      return (
        <div style={webStyle(styles.footerLoader)}>
          <span style={webStyle(styles.footerHint)}>All items loaded</span>
        </div>
      );
    }

    return null;
  };

  const ListEmptyComponent = () => {
    return (
      <div style={webStyle(styles.emptyContainer)}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <span style={webStyle(styles.emptyText)}>Loading...</span>
          </>
        ) : isSearching ? (
          <>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <span style={webStyle(styles.emptyText)}>Searching...</span>
          </>
        ) : (
          <>
            <Icon name="package-variant-closed" size={48} color="#D1D5DB" />
            <span style={webStyle(styles.emptyText)}>
              {searchable && searchQuery
                ? "No items match your search"
                : "No items available"}
            </span>
            {showAddNewOption && (
              <TouchableOpacity
                style={styles.addNewButton}
                onPress={handleAddNew}
                disabled={isAddingNew}
              >
                {isAddingNew ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="plus" size={18} color="#FFFFFF" />
                    <span style={webStyle(styles.addNewButtonText)}>
                      Add {`"${searchQuery.trim()}"`}
                    </span>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </div>
    );
  };

  const getItemKey = (item: { id: string; name: string }, index: number) => {
    return `${item.id}_${index}`;
  };

  return (
    <div style={webStyle(styles.container)}>
      <TouchableOpacity
        style={[
          styles.dropdownContainer,
          {
            borderColor: getBorderColor(),
            borderWidth: isFocused ? 2 : 1.5,
            backgroundColor: disabled ? "#F3F4F6" : "#FFFFFF",
          },
        ]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <div style={webStyle(styles.labelValueContainer)}>
          <div
            style={webStyle([
              styles.labelWrapper,
              {
                transform: [{ translateY }, { scale }],
              },
            ])}
          >
            <span style={webStyle([styles.label, { color: getLabelColor() }])}>
              {label}
              {required && <span style={webStyle(styles.required)}> *</span>}
            </span>
          </div>

          <div style={webStyle(styles.valueContainer)}>
            {shouldShowValue ? (
              <span style={webStyle(styles.valueText)}>
                {selectedItem?.name}
              </span>
            ) : shouldShowPlaceholder ? (
              <span style={webStyle(styles.placeholderText)}>{placeholder}</span>
            ) : null}
          </div>
        </div>

        <Icon
          name={modalVisible ? "chevron-up" : "chevron-down"}
          size={20}
          color={disabled ? "#9CA3AF" : getLabelColor()}
        />
      </TouchableOpacity>

      {error && (
        <div style={webStyle(styles.errorContainer)}>
          <Icon name="alert-circle" size={14} color="#EF4444" />
          <span style={webStyle(styles.errorText)}>{error}</span>
        </div>
      )}

      <KeyboardAwareModal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <div style={webStyle(styles.modalOverlay)}>
          <div style={webStyle(styles.modalContent)}>
            <div style={webStyle(styles.modalHeader)}>
              <div>
                <span style={webStyle(styles.modalTitle)}>{label}</span>
                <span style={webStyle(styles.modalSubtitle)}>
                  {totalCount
                    ? `${items.length} of ${totalCount} items`
                    : `${items.length} items`}
                  {required ? " • Required" : " • Optional"}
                </span>
              </div>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </div>

            {searchable && (
              <div style={webStyle(styles.searchContainer)}>
                <div style={webStyle(styles.searchInputContainer)}>
                  <Icon name="magnify" size={20} color="#8B5CF6" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus={true}
                    placeholderTextColor="#9CA3AF"
                  />
                  {searchQuery ? (
                    <TouchableOpacity
                      onPress={handleClearSearch}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="close-circle" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ) : null}
                </div>
              </div>
            )}

            <FlatList
              ref={flatListRef}
              data={onSearch ? items : filteredItems}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.listItem,
                    value === item.id && styles.listItemSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <div style={webStyle(styles.listItemContent)}>
                    <div
                      style={webStyle([
                        styles.listItemIcon,
                        value === item.id && styles.listItemIconSelected,
                      ])}
                    >
                      {value === item.id && (
                        <Icon name="check" size={16} color="#FFFFFF" />
                      )}
                    </div>
                    <span
                      style={webStyle([
                        styles.listItemText,
                        value === item.id && styles.listItemTextSelected,
                      ])}
                    >
                      {item.name}
                    </span>
                  </div>
                  {value === item.id && (
                    <Icon name="check-circle" size={20} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item, index) => getItemKey(item, index)}
              onScroll={handleScroll}
              onEndReached={handleEndReached}
              onEndReachedThreshold={0.5}
              scrollEventThrottle={400}
              ListFooterComponent={ListFooterComponent}
              ListEmptyComponent={ListEmptyComponent}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={true}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={21}
            />

            <div style={webStyle(styles.modalFooter)}>
              {onAddNew && (
                <TouchableOpacity
                  style={styles.addNewModalButton}
                  onPress={() => {
                    if (searchQuery.trim()) {
                      handleAddNew();
                    } else {
                      Alert.alert(
                        "Enter Name",
                        `Please type a name in the search box to add a new ${addNewLabel || label.toLowerCase()}`,
                      );
                    }
                  }}
                  disabled={isAddingNew}
                >
                  {isAddingNew ? (
                    <ActivityIndicator size="small" color="#8B5CF6" />
                  ) : (
                    <>
                      <Icon name="plus" size={18} color="#8B5CF6" />
                      <span style={webStyle(styles.addNewModalButtonText)}>
                        Add New {addNewLabel || label}
                      </span>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.selectButton}
                onPress={handleClose}
              >
                <span style={webStyle(styles.selectButtonText)}>Done</span>
              </TouchableOpacity>
            </div>
          </div>
        </div>
      </KeyboardAwareModal>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: isSmallDevice ? 10 : 16,
  },
  dropdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 16 : 20,
    paddingBottom: isSmallDevice ? 9 : 12,
    height: isSmallDevice ? 52 : 60,
    backgroundColor: colors.secondary,
  },
  labelValueContainer: {
    flex: 1,
    justifyContent: "center",
    height: isSmallDevice ? 34 : 40,
  },
  labelWrapper: {
    position: "absolute",
    left: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
  },
  label: {
    fontWeight: "500",
    fontSize: isSmallDevice ? 14 : 16,
  },
  required: {
    color: "#EF4444",
  },
  valueContainer: {
    marginTop: 1,
    height: 24,
    justifyContent: "center",
  },
  valueText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: isSmallDevice ? 14 : 16,
    color: "#9CA3AF",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    width: "100%",
    maxWidth: 540,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: isSmallDevice ? 16 : 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    padding: isSmallDevice ? 12 : 16,
    paddingBottom: isSmallDevice ? 10 : 12,
    backgroundColor: "#F9FAFB",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingVertical: isSmallDevice ? 10 : 12,
    gap: isSmallDevice ? 8 : 12,
  },
  searchInput: {
    flex: 1,
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
  },
  listContainer: {
    paddingBottom: isSmallDevice ? 12 : 20,
    minHeight: isSmallDevice ? 150 : 200,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  listItemSelected: {
    backgroundColor: "#F5F3FF",
  },
  listItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 10 : 16,
    flex: 1,
  },
  listItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  listItemIconSelected: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  listItemTextSelected: {
    color: "#8B5CF6",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: isSmallDevice ? 28 : 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#8B5CF6",
    paddingHorizontal: isSmallDevice ? 16 : 24,
    paddingVertical: isSmallDevice ? 11 : 14,
    borderRadius: 12,
    marginTop: 20,
  },
  addNewButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  addNewFooterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: isSmallDevice ? 12 : 16,
    paddingHorizontal: isSmallDevice ? 16 : 24,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderStyle: "dashed",
  },
  addNewFooterText: {
    color: "#8B5CF6",
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoader: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "500",
    marginTop: 8,
  },
  footerHint: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(139,92,246,0.08)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.25)",
  },
  loadMoreButtonText: {
    fontSize: 14,
    color: "#8B5CF6",
    fontWeight: "600",
  },
  modalFooter: {
    padding: isSmallDevice ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    gap: 10,
  },
  addNewModalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#8B5CF6",
    backgroundColor: "#F5F3FF",
  },
  addNewModalButtonText: {
    color: "#8B5CF6",
    fontSize: 15,
    fontWeight: "600",
  },
  selectButton: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: isSmallDevice ? 24 : 32,
    paddingVertical: isSmallDevice ? 11 : 14,
    borderRadius: 12,
    alignItems: "center",
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default FloatingDropdown;
