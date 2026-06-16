
import React, { useEffect, useState, useRef } from "react";
import {
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  webStyle,
} from "react-native";
import {
  X,
  Plus,
  Trash2,
  Edit,
  Search,
  Folder,
  CheckCircle,
  AlertCircle,
} from "lucide-react-native";
import CategoryService from "@/services/CategoryService";
import { getDeviceMetrics } from "@/utils/responsive";

interface CategoriesModalProps {
  onClose: () => void;
}

const { height: SCREEN_HEIGHT, isXs: isSmallDevice } = getDeviceMetrics();

export default function CategoriesModal({ onClose }: CategoriesModalProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const listScrollViewRef = useRef<ScrollView>(null);

  
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    getAllCategory();
  }, []);

  const getAllCategory = async () => {
    try {
      setLoading(true);
      const res = await CategoryService.fetchAllCategory();
      if (res.success) {
        setCategories(res.data || []);
      } else {
        showMessage("Failed to load categories", "error");
      }
    } catch (error) {
      console.log("Category fetch error:", error);
      showMessage("Failed to fetch categories", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage(msg);
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const scrollToInput = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const addCategory = async () => {
    try {
      if (!name.trim()) {
        showMessage("Please enter category name", "error");
        return;
      }

      setAdding(true);
      setMessage("");

      if (editingId) {
        const res = await CategoryService.updateCategory(editingId, { name });
        if (res.success) {
          showMessage("Category updated successfully", "success");
          setName("");
          setEditingId(null);
          await getAllCategory();
          Keyboard.dismiss();
        } else {
          showMessage("Failed to update category", "error");
        }
      } else {
        const res = await CategoryService.addNewCategory({ name });
        if (res.success) {
          showMessage("Category added successfully", "success");
          setName("");
          await getAllCategory();
          Keyboard.dismiss();
        } else {
          showMessage("Failed to add category", "error");
        }
      }
    } catch (error) {
      console.log("Something went wrong", error);
      showMessage("Failed to save category", "error");
    } finally {
      setAdding(false);
    }
  };

  const deleteCategory = async (id: string) => {
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(id);
              const res = await CategoryService.deleteCategory(id);
              if (res.success) {
                showMessage("Category deleted successfully", "success");
                await getAllCategory();
              } else {
                showMessage("Failed to delete category", "error");
              }
            } catch (error) {
              console.log("Delete error:", error);
              showMessage("Failed to delete category", "error");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleEdit = (category: any) => {
    setName(category.name);
    setEditingId(category.id!);
    setMessage("");
    setTimeout(() => {
      nameInputRef.current?.focus();
      scrollToInput();
    }, 100);
  };

  const handleCancelEdit = () => {
    setName("");
    setEditingId(null);
    setMessage("");
    Keyboard.dismiss();
  };

  
  const handleDone = () => {
    if (isKeyboardVisible) {
      
      Keyboard.dismiss();
    } else {
      
      onClose();
    }
  };

  
  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div style={webStyle(styles.modalContainer)}>
      
      <Pressable style={styles.modalOverlay} onPress={handleClose} />

      
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <Pressable 
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          
          <div style={webStyle(styles.header)}>
            <div style={webStyle(styles.headerLeft)}>
              <div style={webStyle(styles.iconContainer)}>
                <Folder size={24} color="#8b5cf6" />
              </div>
              <div>
                <span style={webStyle(styles.title)}>Manage Categories</span>
                <span style={webStyle(styles.subtitle)}>Add, edit or delete categories</span>
              </div>
            </div>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#64748b" />
            </TouchableOpacity>
          </div>

          
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          >
            
            <div style={webStyle(styles.inputSection)}>
              <TextInput
                ref={nameInputRef}
                style={styles.input}
                placeholder={
                  editingId ? "Edit category name" : "Enter new category"
                }
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={addCategory}
                onFocus={scrollToInput}
              />
              <div style={webStyle(styles.buttonRow)}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (!name.trim() || adding) && styles.primaryButtonDisabled,
                  ]}
                  onPress={addCategory}
                  disabled={!name.trim() || adding}
                >
                  {adding ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : editingId ? (
                    <span style={webStyle(styles.primaryButtonText)}>Update</span>
                  ) : (
                    <>
                      <Plus size={20} color="#fff" />
                      <span style={webStyle(styles.primaryButtonText)}>Add</span>
                    </>
                  )}
                </TouchableOpacity>
                {editingId && (
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleCancelEdit}
                    disabled={adding}
                  >
                    <span style={webStyle(styles.secondaryButtonText)}>Cancel</span>
                  </TouchableOpacity>
                )}
              </div>
            </div>

            
            {message ? (
              <div
                style={webStyle([
                  styles.messageContainer,
                  message.includes("Failed") || message.includes("Please")
                    ? styles.errorMessage
                    : styles.successMessage,
                ])}
              >
                {message.includes("Failed") || message.includes("Please") ? (
                  <AlertCircle size={20} color="#dc2626" />
                ) : (
                  <CheckCircle size={20} color="#10b981" />
                )}
                <span
                  style={webStyle([
                    styles.messageText,
                    message.includes("Failed") || message.includes("Please")
                      ? styles.errorMessageText
                      : styles.successMessageText,
                  ])}
                >
                  {message}
                </span>
              </div>
            ) : null}

            
            <div style={webStyle(styles.listContainer)}>
              <div style={webStyle(styles.listHeader)}>
                <span style={webStyle(styles.listTitle)}>Categories ({categories.length})</span>
                {categories.length > 0 && (
                  <div style={webStyle(styles.countBadge)}>
                    <span style={webStyle(styles.countText)}>
                      {filteredCategories.length} found
                    </span>
                  </div>
                )}
              </div>

              {categories.length > 5 && (
                <div style={webStyle(styles.searchContainer)}>
                  <Search size={20} color="#94a3b8" style={styles.searchIcon} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search categories..."
                    placeholderTextColor="#94a3b8"
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </div>
              )}

              <ScrollView
                ref={listScrollViewRef}
                style={styles.listScrollView}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              >
                {loading ? (
                  <div style={webStyle(styles.centerContainer)}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div style={webStyle(styles.centerContainer)}>
                    <Folder size={48} color="#cbd5e1" />
                    <span style={webStyle(styles.emptyTitle)}>No categories found</span>
                    <span style={webStyle(styles.emptySubtitle)}>
                      {searchTerm
                        ? "Try a different search"
                        : "Add your first category"}
                    </span>
                  </div>
                ) : (
                  filteredCategories.map((cat: any) => (
                    <div
                      key={cat.id}
                      style={webStyle([
                        styles.categoryItem,
                        editingId === cat.id && styles.editingItem,
                      ])}
                    >
                      <div style={webStyle(styles.categoryInfo)}>
                        <Folder size={18} color="#8b5cf6" />
                        <span style={webStyle(styles.categoryName)}>{cat.name}</span>
                      </div>
                      <div style={webStyle(styles.actions)}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleEdit(cat)}
                          disabled={deletingId === cat.id}
                        >
                          <Edit size={18} color="#8b5cf6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => deleteCategory(cat.id!)}
                          disabled={deletingId === cat.id || adding}
                        >
                          {deletingId === cat.id ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <Trash2 size={18} color="#ef4444" />
                          )}
                        </TouchableOpacity>
                      </div>
                    </div>
                  ))
                )}
                <div style={webStyle({ height: 20 })} />
              </ScrollView>
            </div>
          </ScrollView>

          
          <div style={webStyle(styles.footer)}>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <span style={webStyle(styles.doneButtonText)}>
                {isKeyboardVisible ? "Done" : "Close"}
              </span>
            </TouchableOpacity>
          </div>
        </Pressable>
      </KeyboardAvoidingView>
    </div>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "100%",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    maxHeight: "86%",
    width: "100%",
    maxWidth: 640,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: isSmallDevice ? 14 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    backgroundColor: "#fff",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: isSmallDevice ? 38 : 44,
    height: isSmallDevice ? 38 : 44,
    borderRadius: isSmallDevice ? 10 : 12,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: isSmallDevice ? 16 : 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  closeButton: {
    width: isSmallDevice ? 32 : 36,
    height: isSmallDevice ? 32 : 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  inputSection: {
    padding: isSmallDevice ? 12 : 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: isSmallDevice ? 11 : 14,
    fontSize: isSmallDevice ? 14 : 16,
    marginBottom: 12,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    padding: isSmallDevice ? 11 : 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: "#c4b5fd",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingHorizontal: isSmallDevice ? 14 : 20,
    paddingVertical: isSmallDevice ? 11 : 14,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  secondaryButtonText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 10,
  },
  successMessage: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  errorMessage: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  successMessageText: {
    color: "#059669",
  },
  errorMessageText: {
    color: "#dc2626",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: isSmallDevice ? 10 : 16,
    paddingTop: isSmallDevice ? 8 : 12,
    paddingBottom: 8,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  countBadge: {
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  listScrollView: {
    maxHeight: SCREEN_HEIGHT * 0.35,
  },
  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallDevice ? 28 : 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94a3b8",
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: isSmallDevice ? 10 : 14,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  editingItem: {
    backgroundColor: "#f5f3ff",
    borderColor: "#ddd6fe",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0f172a",
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    width: isSmallDevice ? 32 : 36,
    height: isSmallDevice ? 32 : 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  footer: {
    padding: isSmallDevice ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fff",
  },
  doneButton: {
    backgroundColor: "#8b5cf6",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
