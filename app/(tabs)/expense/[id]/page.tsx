"use client";

import { ActivityIndicator, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Animated, Alert, Pressable, FlatList, TouchableWithoutFeedback, Keyboard, Modal, webStyle } from "@/utils/reactNativeReplacements";

// app/expense/[id].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
