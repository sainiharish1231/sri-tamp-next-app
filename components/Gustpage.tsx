"use client";

import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";
import { useLanguage } from "@/hooks/use-language";
import KeyboardAwareModal from "@/components/KeyboardAwareModal";
import { Ionicons } from "lucide-react";
import { LinearGradient } // Removed gradient
import { useRouter } from "next/navigation";
