import { useLanguage } from "@/hooks/use-language";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions,
  Image,
  RefreshControl,
  webStyle,
import Toast from "react-native-toast-message";
import ProductService from "@/services/ProductService";

interface Product {
  id: string;
  name: string;
  designCode: string;
  categoryTypeId: string;
  stock: number;
  images: string[];
  description?: string;
  materialId?: string;
  urlkey?: string;
}

export default function Gustpage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [itemsPerPage] = useState(10);

  const [inquiryModalVisible, setInquiryModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inquiryName, setInquiryName] = useState("");
  const [inquiryEmail, setInquiryEmail] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [submittingInquiry, setSubmittingInquiry] = useState(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    fetchProducts(1);
  }, []);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      },
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const fetchProducts = async (page: number) => {
    try {
      setLoading(true);
      const options = {
        params: {
          page: page,
          limit: itemsPerPage,
        },
      };

      const response = await ProductService.fetchAllProducts(options);

      if (response && response.success && response.data) {
        setProducts(response.data);

        const res: any = response;

        if (res.meta) {
          setCurrentPage(res.meta.currentPage || page);
          setTotalPages(res.meta.totalPages || 1);
          setTotalProducts(res.meta.total || 0);
        } else if (res.pagination) {
          setCurrentPage(res.pagination.page || page);
          setTotalPages(res.pagination.pages || 1);
          setTotalProducts(res.pagination.total || 0);
        } else {
          setCurrentPage(page);
          setTotalPages(res.data?.length < itemsPerPage ? page : page + 1);
          setTotalProducts(res.data?.length || 0);
        }
      } else if (response && response.data && Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to load products",
        visibilityTime: 3000,
      });
      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      fetchProducts(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      fetchProducts(currentPage - 1);
    }
  };

  const openInquiryModal = (product: Product) => {
    setSelectedProduct(product);
    setInquiryModalVisible(true);

    setInquiryName("");
    setInquiryEmail("");
    setInquiryPhone("");
    setInquiryMessage("");
  };

  const submitInquiry = async () => {
    if (!inquiryName.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter your name",
        visibilityTime: 3000,
      });
      return;
    }

    if (
      !inquiryEmail.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiryEmail)
    ) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter a valid email address",
        visibilityTime: 3000,
      });
      return;
    }

    if (!inquiryPhone.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter your phone number",
        visibilityTime: 3000,
      });
      return;
    }

    if (!inquiryMessage.trim()) {
      Toast.show({
        type: "error",
        text1: "Validation Error",
        text2: "Please enter your inquiry message",
        visibilityTime: 3000,
      });
      return;
    }

    setSubmittingInquiry(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Toast.show({
        type: "success",
        text1: "Inquiry Sent",
        text2: `Your inquiry about ${selectedProduct?.name} has been sent successfully!`,
        visibilityTime: 4000,
      });

      setInquiryModalVisible(false);
      setSelectedProduct(null);
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Failed",
        text2: "Failed to send inquiry. Please try again.",
        visibilityTime: 3000,
      });
    } finally {
      setSubmittingInquiry(false);
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => openInquiryModal(item)}
      style={{
        marginBottom: 20,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(212, 175, 55, 0.2)",
        overflow: "hidden",
      }}
    >
      <div
        style={webStyle({
          height: 220,
          backgroundColor: "rgba(0,0,0,0.3)",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        })}
      >
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={{
              width: "100%",
              height: "100%",
              resizeMode: "cover",
            }}
          />
        ) : (
          <div
            style={webStyle({
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
            })}
          >
            <Ionicons
              name="cube-outline"
              size={60}
              color="rgba(212,175,55,0.3)"
            />
          </div>
        )}

        <div
          style={webStyle({
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor:
              item.stock > 0 ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20,
          })}
        >
          <span
            style={webStyle({
              fontSize: 11,
              fontWeight: "bold",
              color: "white",
            })}
          >
            {item.stock > 0 ? `In Stock: ${item.stock}` : "Out of Stock"}
          </span>
        </div>
      </div>

      <div style={webStyle({ padding: 16 })}>
        <span
          style={webStyle({
            fontSize: 18,
            fontWeight: "bold",
            color: "#D4AF37",
            marginBottom: 6,
          })}
        >
          {item.name}
        </span>

        <span
          style={webStyle({
            fontSize: 13,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 8,
          })}
        >
          Design Code: {item.designCode || "N/A"}
        </span>

        {item.description && (
          <span
            style={webStyle({
              fontSize: 14,
              color: "rgba(255,255,255,0.7)",
              marginBottom: 12,
              lineHeight: 20,
            })}
          >
            {item.description}
          </span>
        )}

        <TouchableOpacity
          onPress={() => openInquiryModal(item)}
          activeOpacity={0.8}
          style={{
            marginTop: 8,
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <LinearGradient
            colors={["#D4AF37", "#B8960C", "#8B6914"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: 12,
              alignItems: "center",
              borderRadius: 12,
            }}
          >
            <div
              style={webStyle({ flexDirection: "row", alignItems: "center", gap: 8 })}
            >
              <Ionicons name="chatbubble-outline" size={18} color="#000" />
              <span
                style={webStyle({
                  color: "#000",
                  fontSize: 14,
                  fontWeight: "bold",
                  letterSpacing: 0.5,
                })}
              >
                Make Inquiry
              </span>
            </div>
          </LinearGradient>
        </TouchableOpacity>
      </div>
    </TouchableOpacity>
  );

  const renderPagination = () => (
    <div
      style={webStyle({
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 20,
        marginBottom: 30,
        gap: 15,
      })}
    >
      <TouchableOpacity
        onPress={goToPreviousPage}
        disabled={currentPage === 1}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 25,
          backgroundColor:
            currentPage === 1
              ? "rgba(255,255,255,0.1)"
              : "rgba(212,175,55,0.2)",
          borderWidth: currentPage === 1 ? 0 : 1,
          borderColor: "rgba(212,175,55,0.5)",
        }}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={currentPage === 1 ? "rgba(255,255,255,0.3)" : "#D4AF37"}
        />
      </TouchableOpacity>

      <span
        style={webStyle({
          color: "rgba(255,255,255,0.8)",
          fontSize: 14,
          fontWeight: "500",
        })}
      >
        Page {currentPage} of {totalPages}
      </span>

      <TouchableOpacity
        onPress={goToNextPage}
        disabled={currentPage === totalPages}
        style={{
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 25,
          backgroundColor:
            currentPage === totalPages
              ? "rgba(255,255,255,0.1)"
              : "rgba(212,175,55,0.2)",
          borderWidth: currentPage === totalPages ? 0 : 1,
          borderColor: "rgba(212,175,55,0.5)",
        }}
      >
        <Ionicons
          name="chevron-forward"
          size={20}
          color={
            currentPage === totalPages ? "rgba(255,255,255,0.3)" : "#D4AF37"
          }
        />
      </TouchableOpacity>
    </div>
  );

  const renderInquiryModal = () => (
    <KeyboardAwareModal
      visible={inquiryModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setInquiryModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setInquiryModalVisible(false)}>
        <div
          style={webStyle({
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          })}
        >
          <TouchableWithoutFeedback>
            <div
              style={webStyle({
                backgroundColor: "#1a1a1a",
                borderRadius: 8,
                width: "100%",
                maxWidth: 680,
                maxHeight: "90%",
              })}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: keyboardHeight + 20 }}
                >
                  <div style={webStyle({ padding: 24 })}>
                    <div
                      style={webStyle({
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20,
                      })}
                    >
                      <span
                        style={webStyle({
                          fontSize: 22,
                          fontWeight: "bold",
                          color: "#D4AF37",
                        })}
                      >
                        Product Inquiry
                      </span>
                      <TouchableOpacity
                        onPress={() => setInquiryModalVisible(false)}
                      >
                        <Ionicons
                          name="close-circle"
                          size={28}
                          color="#D4AF37"
                        />
                      </TouchableOpacity>
                    </div>

                    {selectedProduct && (
                      <div
                        style={webStyle({
                          backgroundColor: "rgba(212,175,55,0.1)",
                          borderRadius: 16,
                          padding: 12,
                          marginBottom: 20,
                          borderWidth: 1,
                          borderColor: "rgba(212,175,55,0.3)",
                        })}
                      >
                        <span
                          style={webStyle({
                            fontSize: 16,
                            fontWeight: "bold",
                            color: "#D4AF37",
                            marginBottom: 4,
                          })}
                        >
                          {selectedProduct.name}
                        </span>
                        <span
                          style={webStyle({
                            fontSize: 13,
                            color: "rgba(255,255,255,0.6)",
                          })}
                        >
                          Design Code: {selectedProduct.designCode || "N/A"}
                        </span>
                      </div>
                    )}

                    <div style={webStyle({ marginBottom: 16 })}>
                      <span
                        style={webStyle({
                          fontSize: 14,
                          fontWeight: "600",
                          color: "rgba(255,255,255,0.8)",
                          marginBottom: 8,
                        })}
                      >
                        Full Name *
                      </span>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(212,175,55,0.3)",
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: "white",
                          backgroundColor: "rgba(255,255,255,0.03)",
                        }}
                        placeholder="Enter your full name"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        value={inquiryName}
                        onChangeText={setInquiryName}
                      />
                    </div>

                    <div style={webStyle({ marginBottom: 16 })}>
                      <span
                        style={webStyle({
                          fontSize: 14,
                          fontWeight: "600",
                          color: "rgba(255,255,255,0.8)",
                          marginBottom: 8,
                        })}
                      >
                        Email Address *
                      </span>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(212,175,55,0.3)",
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: "white",
                          backgroundColor: "rgba(255,255,255,0.03)",
                        }}
                        placeholder="Enter your email"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={inquiryEmail}
                        onChangeText={setInquiryEmail}
                      />
                    </div>

                    <div style={webStyle({ marginBottom: 16 })}>
                      <span
                        style={webStyle({
                          fontSize: 14,
                          fontWeight: "600",
                          color: "rgba(255,255,255,0.8)",
                          marginBottom: 8,
                        })}
                      >
                        Phone Number *
                      </span>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(212,175,55,0.3)",
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: "white",
                          backgroundColor: "rgba(255,255,255,0.03)",
                        }}
                        placeholder="Enter your phone number"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        keyboardType="phone-pad"
                        value={inquiryPhone}
                        onChangeText={setInquiryPhone}
                      />
                    </div>

                    <div style={webStyle({ marginBottom: 24 })}>
                      <span
                        style={webStyle({
                          fontSize: 14,
                          fontWeight: "600",
                          color: "rgba(255,255,255,0.8)",
                          marginBottom: 8,
                        })}
                      >
                        Your Message *
                      </span>
                      <TextInput
                        style={{
                          borderWidth: 1,
                          borderColor: "rgba(212,175,55,0.3)",
                          borderRadius: 12,
                          paddingHorizontal: 16,
                          paddingVertical: 12,
                          fontSize: 16,
                          color: "white",
                          backgroundColor: "rgba(255,255,255,0.03)",
                          minHeight: 100,
                          textAlignVertical: "top",
                        }}
                        placeholder="Please describe your inquiry or requirements..."
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        value={inquiryMessage}
                        onChangeText={setInquiryMessage}
                      />
                    </div>

                    <TouchableOpacity
                      onPress={submitInquiry}
                      disabled={submittingInquiry}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={["#D4AF37", "#B8960C", "#8B6914"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          borderRadius: 50,
                          paddingVertical: 16,
                          alignItems: "center",
                          shadowColor: "#D4AF37",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.3,
                          shadowRadius: 8,
                          elevation: 5,
                        }}
                      >
                        {submittingInquiry ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <span
                            style={webStyle({
                              color: "#000",
                              fontSize: 18,
                              fontWeight: "bold",
                              letterSpacing: 1,
                            })}
                          >
                            Submit Inquiry
                          </span>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </div>
                </ScrollView>
              </KeyboardAvoidingView>
            </div>
          </TouchableWithoutFeedback>
        </div>
      </TouchableWithoutFeedback>
    </KeyboardAwareModal>
  );

  return (
    <>
      <LinearGradient
        colors={["#1a1a1a", "#000000", "#0a0a0a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <div style={webStyle({ position: "absolute", top: -100, left: -100 })}>
          <div
            style={webStyle({
              width: 200,
              height: 200,
              borderRadius: 100,
              backgroundColor: "rgba(212, 175, 55, 0.05)",
            })}
          />
        </div>
        <div style={webStyle({ position: "absolute", bottom: -50, right: -50 })}>
          <div
            style={webStyle({
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: "rgba(212, 175, 55, 0.08)",
            })}
          />
        </div>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 40,
            paddingTop: 60,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <div style={webStyle({ paddingHorizontal: 20, marginBottom: 24 })}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              <Ionicons name="arrow-back" size={22} color="#D4AF37" />
            </TouchableOpacity>

            <div>
              <span
                style={webStyle({
                  fontSize: 32,
                  fontWeight: "bold",
                  color: "#D4AF37",
                  marginBottom: 8,
                  letterSpacing: 1,
                })}
              >
                Our Collection
              </span>
              <span
                style={webStyle({
                  fontSize: 14,
                  color: "rgba(255,255,255,0.6)",
                })}
              >
                {totalProducts > 0
                  ? `Showing ${products.length} of ${totalProducts} products`
                  : "Browse our exclusive products"}
              </span>
            </div>
          </div>

          {loading && !refreshing ? (
            <div style={webStyle({ paddingVertical: 60, alignItems: "center" })}>
              <ActivityIndicator size="large" color="#D4AF37" />
              <span
                style={webStyle({
                  marginTop: 16,
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 14,
                })}
              >
                Loading products...
              </span>
            </div>
          ) : products.length === 0 ? (
            <div
              style={webStyle({
                paddingVertical: 60,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <Ionicons
                name="cube-outline"
                size={60}
                color="rgba(212,175,55,0.3)"
              />
              <span
                style={webStyle({
                  marginTop: 16,
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 16,
                  textAlign: "center",
                })}
              >
                No products found
              </span>
            </div>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => item.id}
              renderItem={renderProductCard}
              scrollEnabled={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            />
          )}

          {!loading && products.length > 0 && renderPagination()}
        </ScrollView>
      </LinearGradient>

      {renderInquiryModal()}

      <Toast />
    </>
  );
}
