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
  Modal as RNModal,
  webStyle,
} from "react-native";
import {
  X,
  Plus,
  Trash2,
  Edit,
  Search,
  Layers,
  CheckCircle,
  AlertCircle,
  Package,
  Calendar,
  User,
  Hash,
  Info,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowLeftRight,
  DollarSign,
  Weight,
  FileText,
  Clock,
} from "lucide-react-native";
import MaterialService from "@/services/MaterialService";
import { getDeviceMetrics } from "@/utils/responsive";
import { formatDateValue } from "@/utils/date";

interface MaterialsModalProps {
  onClose: () => void;
}

interface MaterialTransaction {
  id: string;
  transactionNo: string;
  transactionType: string;
  partyId: string;
  partyName?: string;
  transactionDate: string;
  priority: string;
  items: any[];
  summary: {
    totalItems: number;
    orderItems: number;
    extraItems: number;
    totalWeight: number;
    totalAmount: number;
    orderTotal: number;
    extraTotal: number;
  };
  note?: string;
  status: string;
  paymentStatus?: string;
  paidAmount?: number;
  createdAt: string;
}

const { height: SCREEN_HEIGHT, isXs: isSmallDevice } = getDeviceMetrics();

export default function MaterialsModal({ onClose }: MaterialsModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [materialTransactions, setMaterialTransactions] = useState<
    MaterialTransaction[]
  >([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRef = useRef<TextInput>(null);
  const listScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setIsKeyboardVisible(true);
      },
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
      },
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await MaterialService.fetchAllMaterial();
      if (res.success) {
        setMaterials(res.data || []);
      } else {
        showMessage("Failed to load materials", "error");
      }
    } catch (error) {
      console.log("Material fetch error:", error);
      showMessage("Failed to fetch materials", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTransactions = async (materialId: string) => {
    try {
      setLoadingTransactions(true);
      // Assuming you have an API endpoint to fetch transactions for a material
      const res = await MaterialService.fetchAllMaterial(materialId);
      if (res.success) {
        setMaterialTransactions(res.data || []);
      } else {
        setMaterialTransactions([]);
      }
    } catch (error) {
      console.log("Transactions fetch error:", error);
      setMaterialTransactions([]);
    } finally {
      setLoadingTransactions(false);
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

  const addMaterial = async () => {
    try {
      if (!name.trim()) {
        showMessage("Please enter material name", "error");
        return;
      }

      setAdding(true);
      setMessage("");

      if (editingId) {
        const res = await MaterialService.updateMaterial(editingId, { name });
        if (res.success) {
          showMessage("Material updated successfully", "success");
          setName("");
          setEditingId(null);
          await fetchMaterials();
          Keyboard.dismiss();
        } else {
          showMessage("Failed to update material", "error");
        }
      } else {
        const res = await MaterialService.addNewMaterial({ name });
        if (res.success) {
          showMessage("Material added successfully", "success");
          setName("");
          await fetchMaterials();
          Keyboard.dismiss();
        } else {
          showMessage("Failed to add material", "error");
        }
      }
    } catch (error) {
      console.log("Something went wrong", error);
      showMessage("Failed to save material", "error");
    } finally {
      setAdding(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    Alert.alert(
      "Delete Material",
      "Are you sure you want to delete this material?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(id);
              const res = await MaterialService.deleteMaterial(id);
              if (res.success) {
                showMessage("Material deleted successfully", "success");
                await fetchMaterials();
              } else {
                showMessage("Failed to delete material", "error");
              }
            } catch (error) {
              console.log("Delete error:", error);
              showMessage("Failed to delete material", "error");
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleEdit = (material: any) => {
    setName(material.name);
    setEditingId(material.id!);
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

  const handleMaterialPress = async (material: any) => {
    setSelectedMaterial(material);
    setShowDetailsModal(true);
    await fetchMaterialTransactions(material.id);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <TrendingUp size={20} color="#10b981" />;
      case "sales":
        return <TrendingDown size={20} color="#ef4444" />;
      case "purchase_return":
      case "sales_return":
        return <RefreshCw size={20} color="#f59e0b" />;
      case "jobwork":
      case "jobwork_return":
        return <Package size={20} color="#8b5cf6" />;
      default:
        return <ArrowLeftRight size={20} color="#64748b" />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: "Purchase",
      sales: "Sales",
      purchase_return: "Purchase Return",
      sales_return: "Sales Return",
      jobwork: "Job Work",
      jobwork_return: "Job Work Return",
      transfer: "Transfer",
      transfer_return: "Transfer Return",
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "cancelled":
        return "#ef4444";
      default:
        return "#64748b";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#ef4444";
      case "high":
        return "#f59e0b";
      case "medium":
        return "#8b5cf6";
      case "low":
        return "#10b981";
      default:
        return "#64748b";
    }
  };

  const formatDate = (value?: any) => formatDateValue(value);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(3)} kg`;
  };

  const filteredMaterials = materials.filter((material) =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
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
                  <Layers size={24} color="#8b5cf6" />
                </div>
                <div>
                  <span style={webStyle(styles.title)}>Manage Materials</span>
                  <span style={webStyle(styles.subtitle)}>
                    Add, edit or delete materials
                  </span>
                </div>
              </div>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </div>

            <ScrollView
              // ref={scrollViewRef}
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={Keyboard.dismiss}
            >
              <div style={webStyle(styles.inputSection)}>
                <TextInput
                  // ref={nameInputRef}
                  style={styles.input}
                  placeholder={
                    editingId ? "Edit material name" : "Enter new material"
                  }
                  placeholderTextColor="#94a3b8"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="done"
                  onSubmitEditing={addMaterial}
                  onFocus={scrollToInput}
                />
                <div style={webStyle(styles.buttonRow)}>
                  <TouchableOpacity
                    style={[
                      styles.primaryButton,
                      (!name.trim() || adding) && styles.primaryButtonDisabled,
                    ]}
                    onPress={addMaterial}
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
                  <span style={webStyle(styles.listTitle)}>
                    Materials ({materials.length})
                  </span>
                  {materials.length > 0 && (
                    <div style={webStyle(styles.countBadge)}>
                      <span style={webStyle(styles.countText)}>
                        {filteredMaterials.length} found
                      </span>
                    </div>
                  )}
                </div>

                {materials.length > 5 && (
                  <div style={webStyle(styles.searchContainer)}>
                    <Search
                      size={20}
                      color="#94a3b8"
                      style={styles.searchIcon}
                    />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search materials..."
                      placeholderTextColor="#94a3b8"
                      value={searchTerm}
                      onChangeText={setSearchTerm}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </div>
                )}

                <ScrollView
                  // ref={listScrollViewRef}
                  style={styles.listScrollView}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {loading ? (
                    <div style={webStyle(styles.centerContainer)}>
                      <ActivityIndicator size="large" color="#8b5cf6" />
                    </div>
                  ) : filteredMaterials.length === 0 ? (
                    <div style={webStyle(styles.centerContainer)}>
                      <Layers size={48} color="#cbd5e1" />
                      <span style={webStyle(styles.emptyTitle)}>No materials found</span>
                      <span style={webStyle(styles.emptySubtitle)}>
                        {searchTerm
                          ? "Try a different search"
                          : "Add your first material"}
                      </span>
                    </div>
                  ) : (
                    filteredMaterials.map((mat: any) => (
                      <TouchableOpacity
                        key={mat.id}
                        style={[
                          styles.materialItem,
                          editingId === mat.id && styles.editingItem,
                        ]}
                        onPress={() => handleMaterialPress(mat)}
                        activeOpacity={0.7}
                      >
                        <div style={webStyle(styles.materialInfo)}>
                          <Layers size={18} color="#8b5cf6" />
                          <span style={webStyle(styles.materialName)}>{mat.name}</span>
                        </div>
                        <div style={webStyle(styles.actions)}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEdit(mat);
                            }}
                            disabled={deletingId === mat.id}
                          >
                            <Edit size={18} color="#8b5cf6" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              deleteMaterial(mat.id!);
                            }}
                            disabled={deletingId === mat.id || adding}
                          >
                            {deletingId === mat.id ? (
                              <ActivityIndicator size="small" color="#ef4444" />
                            ) : (
                              <Trash2 size={18} color="#ef4444" />
                            )}
                          </TouchableOpacity>
                        </div>
                      </TouchableOpacity>
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

      {/* Material Details Modal */}
      <RNModal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <div style={webStyle(styles.detailsModalContainer)}>
          <div style={webStyle(styles.detailsModalContent)}>
            <div style={webStyle(styles.detailsHeader)}>
              <div style={webStyle(styles.detailsHeaderLeft)}>
                <Package size={24} color="#8b5cf6" />
                <span style={webStyle(styles.detailsTitle)}>
                  {selectedMaterial?.name}
                </span>
              </div>
              <TouchableOpacity
                onPress={() => setShowDetailsModal(false)}
                style={styles.detailsCloseButton}
              >
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </div>

            <ScrollView style={styles.detailsScrollView}>
              {/* Material Info Section */}
              <div style={webStyle(styles.infoSection)}>
                <span style={webStyle(styles.sectionTitle)}>Material Information</span>
                <div style={webStyle(styles.infoGrid)}>
                  <div style={webStyle(styles.infoCard)}>
                    <Hash size={16} color="#8b5cf6" />
                    <span style={webStyle(styles.infoLabel)}>ID</span>
                    <span style={webStyle(styles.infoValue)}>{selectedMaterial?.id}</span>
                  </div>
                  <div style={webStyle(styles.infoCard)}>
                    <Clock size={16} color="#8b5cf6" />
                    <span style={webStyle(styles.infoLabel)}>Created</span>
                    <span style={webStyle(styles.infoValue)}>
                      {selectedMaterial?.createdAt
                        ? formatDate(selectedMaterial.createdAt)
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions Section */}
              <div style={webStyle(styles.transactionsSection)}>
                <span style={webStyle(styles.sectionTitle)}>
                  Transactions ({materialTransactions.length})
                </span>

                {loadingTransactions ? (
                  <div style={webStyle(styles.loadingContainer)}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                    <span style={webStyle(styles.loadingText)}>
                      Loading transactions...
                    </span>
                  </div>
                ) : materialTransactions.length === 0 ? (
                  <div style={webStyle(styles.noTransactionsContainer)}>
                    <FileText size={48} color="#cbd5e1" />
                    <span style={webStyle(styles.noTransactionsText)}>
                      No transactions found for this material
                    </span>
                  </div>
                ) : (
                  materialTransactions.map((transaction) => (
                    <div style={webStyle(styles.transactionCard)} key={transaction.id}>
                      <div style={webStyle(styles.transactionHeader)}>
                        <div style={webStyle(styles.transactionTypeBadge)}>
                          {getTransactionIcon(transaction.transactionType)}
                          <span style={webStyle(styles.transactionTypeText)}>
                            {getTransactionTypeLabel(
                              transaction.transactionType,
                            )}
                          </span>
                        </div>
                        <div
                          style={webStyle([
                            styles.statusBadge,
                            {
                              backgroundColor:
                                getStatusColor(transaction.status) + "20",
                            },
                          ])}
                        >
                          <span
                            style={webStyle([
                              styles.statusText,
                              { color: getStatusColor(transaction.status) },
                            ])}
                          >
                            {transaction.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div style={webStyle(styles.transactionDetails)}>
                        <div style={webStyle(styles.detailRow)}>
                          <span style={webStyle(styles.detailLabel)}>
                            Transaction No:
                          </span>
                          <span style={webStyle(styles.detailValue)}>
                            {transaction.transactionNo}
                          </span>
                        </div>

                        <div style={webStyle(styles.detailRow)}>
                          <span style={webStyle(styles.detailLabel)}>Date:</span>
                          <span style={webStyle(styles.detailValue)}>
                            {formatDate(transaction.transactionDate)}
                          </span>
                        </div>

                        <div style={webStyle(styles.detailRow)}>
                          <span style={webStyle(styles.detailLabel)}>Priority:</span>
                          <div
                            style={webStyle([
                              styles.priorityBadge,
                              {
                                backgroundColor:
                                  getPriorityColor(transaction.priority) + "20",
                              },
                            ])}
                          >
                            <span
                              style={webStyle([
                                styles.priorityText,
                                {
                                  color: getPriorityColor(transaction.priority),
                                },
                              ])}
                            >
                              {transaction.priority.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {transaction.partyName && (
                          <div style={webStyle(styles.detailRow)}>
                            <span style={webStyle(styles.detailLabel)}>Party:</span>
                            <span style={webStyle(styles.detailValue)}>
                              {transaction.partyName}
                            </span>
                          </div>
                        )}

                        {/* Summary Section */}
                        <div style={webStyle(styles.summarySection)}>
                          <span style={webStyle(styles.summaryTitle)}>Summary</span>
                          <div style={webStyle(styles.summaryGrid)}>
                            <div style={webStyle(styles.summaryItem)}>
                              <Package size={14} color="#64748b" />
                              <span style={webStyle(styles.summaryLabel)}>Items</span>
                              <span style={webStyle(styles.summaryValue)}>
                                {transaction.summary.totalItems}
                              </span>
                            </div>
                            <div style={webStyle(styles.summaryItem)}>
                              <Weight size={14} color="#64748b" />
                              <span style={webStyle(styles.summaryLabel)}>Weight</span>
                              <span style={webStyle(styles.summaryValue)}>
                                {formatWeight(transaction.summary.totalWeight)}
                              </span>
                            </div>
                            <div style={webStyle(styles.summaryItem)}>
                              <DollarSign size={14} color="#64748b" />
                              <span style={webStyle(styles.summaryLabel)}>Amount</span>
                              <span style={webStyle(styles.summaryValue)}>
                                {formatCurrency(
                                  transaction.summary.totalAmount,
                                )}
                              </span>
                            </div>
                          </div>

                          {transaction.summary.orderItems > 0 && (
                            <div style={webStyle(styles.breakdownItem)}>
                              <span style={webStyle(styles.breakdownLabel)}>
                                Order Items:
                              </span>
                              <span style={webStyle(styles.breakdownValue)}>
                                {transaction.summary.orderItems} items |{" "}
                                {formatCurrency(transaction.summary.orderTotal)}
                              </span>
                            </div>
                          )}

                          {transaction.summary.extraItems > 0 && (
                            <div style={webStyle(styles.breakdownItem)}>
                              <span style={webStyle(styles.breakdownLabel)}>
                                Extra Items:
                              </span>
                              <span style={webStyle(styles.breakdownValue)}>
                                {transaction.summary.extraItems} items |{" "}
                                {formatCurrency(transaction.summary.extraTotal)}
                              </span>
                            </div>
                          )}
                        </div>

                        {transaction.paymentStatus && (
                          <div style={webStyle(styles.detailRow)}>
                            <span style={webStyle(styles.detailLabel)}>
                              Payment Status:
                            </span>
                            <span
                              style={webStyle([
                                styles.detailValue,
                                {
                                  color:
                                    transaction.paymentStatus === "paid"
                                      ? "#10b981"
                                      : transaction.paymentStatus === "partial"
                                        ? "#f59e0b"
                                        : "#ef4444",
                                },
                              ])}
                            >
                              {transaction.paymentStatus.toUpperCase()}
                              {transaction.paidAmount &&
                                ` (${formatCurrency(transaction.paidAmount)} paid)`}
                            </span>
                          </div>
                        )}

                        {transaction.note && (
                          <div style={webStyle(styles.noteSection)}>
                            <span style={webStyle(styles.noteLabel)}>Note:</span>
                            <span style={webStyle(styles.noteText)}>
                              {transaction.note}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div style={webStyle({ height: 20 })} />
            </ScrollView>
          </div>
        </div>
      </RNModal>
    </>
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
    gap: isSmallDevice ? 8 : 12,
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
    fontSize: 16,
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
    padding: 14,
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
  materialItem: {
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
  materialInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: isSmallDevice ? 7 : 10,
    flex: 1,
  },
  materialName: {
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
    padding: isSmallDevice ? 12 : 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontSize: isSmallDevice ? 14 : 16,
    fontWeight: "700",
  },
  // Details Modal Styles
  detailsModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 12 : 20,
  },
  detailsModalContent: {
    backgroundColor: "#fff",
    borderRadius: 8,
    maxHeight: "88%",
    width: "100%",
    maxWidth: 640,
  },
  detailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: isSmallDevice ? 14 : 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
  },
  detailsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  detailsScrollView: {
    flex: 1,
    padding: 16,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 12,
  },
  infoGrid: {
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  transactionsSection: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  noTransactionsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  noTransactionsText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  transactionCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 16,
    overflow: "hidden",
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  transactionTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  transactionTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8b5cf6",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  transactionDetails: {
    padding: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 13,
    color: "#0f172a",
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  summarySection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    gap: 6,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  breakdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0f172a",
  },
  noteSection: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#fefce8",
    borderRadius: 8,
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#854d0e",
    marginBottom: 4,
  },
  noteText: {
    fontSize: 12,
    color: "#854d0e",
  },
});
