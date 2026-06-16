"use client";


import React, {
} from "react";
import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";
import { useLocalSearchParams, useRouter } from "next/navigation";
import { format } from "date-fns";
