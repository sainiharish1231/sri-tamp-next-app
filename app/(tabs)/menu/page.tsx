import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";
"use client";

import { colors } from "@/colors";
import PartyService from "@/services/PartyService";
import UserService from "@/services/UserService";
import { useAuthStore } from "@/store/auth.store";
import { extractPartyId,
  extractUserId,
  getAccessFlags } from "@/utils/access";
import { LinearGradient } // Removed gradient
import { Href,
  useFocusEffect,
  useRouter } from "next/navigation";
