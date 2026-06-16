import React, { useRef, useEffect } from "react";
import {
  Pressable,
  Modal,
  StyleSheet,
  Animated,
  ActivityIndicator,
  webStyle,
} from "react-native";
import { Trash2, X } from "lucide-react-native";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface DeleteConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  itemName?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  visible,
  title = "Delete Confirmation",
  message,
  itemName,
  loading = false,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.overlay} onPress={onCancel}>
        <div
          style={webStyle([
            styles.container,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ])}
        >
          <Pressable>
            <div style={webStyle(styles.iconContainer)}>
              <div style={webStyle(styles.iconCircle)}>
                <Trash2 size={28} color="#ef4444" />
              </div>
            </div>

            <span style={webStyle(styles.title)}>{title}</span>
            <span style={webStyle(styles.message)}>{message}</span>
            {itemName ? (
              <div style={webStyle(styles.itemNameContainer)}>
                <span style={webStyle(styles.itemName)}>
                  {`"${itemName}"`}
                </span>
              </div>
            ) : null}

            <div style={webStyle(styles.buttonRow)}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
                disabled={loading}
              >
                <X size={18} color="#64748b" />
                <span style={webStyle(styles.cancelText)}>Cancel</span>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  styles.deleteButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={onConfirm}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Trash2 size={18} color="#fff" />
                    <span style={webStyle(styles.deleteText)}>Delete</span>
                  </>
                )}
              </Pressable>
            </div>
          </Pressable>
        </div>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: isSmallDevice ? 16 : 24,
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: isSmallDevice ? 14 : 20,
    padding: isSmallDevice ? 20 : 28,
    width: "100%",
    maxWidth: 360,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: isSmallDevice ? 14 : 20,
  },
  iconCircle: {
    width: isSmallDevice ? 52 : 64,
    height: isSmallDevice ? 52 : 64,
    borderRadius: isSmallDevice ? 26 : 32,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fecaca",
  },
  title: {
    fontSize: isSmallDevice ? 18 : 20,
    fontWeight: "700" as const,
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: isSmallDevice ? 14 : 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: isSmallDevice ? 20 : 22,
    marginBottom: 12,
  },
  itemNameContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: isSmallDevice ? 10 : 12,
    marginBottom: isSmallDevice ? 14 : 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#0f172a",
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    gap: isSmallDevice ? 8 : 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: isSmallDevice ? 11 : 14,
    borderRadius: isSmallDevice ? 10 : 12,
    gap: isSmallDevice ? 5 : 8,
  },
  cancelButton: {
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  deleteButton: { backgroundColor: "#ef4444" },
  buttonDisabled: { opacity: 0.6 },
  cancelText: { fontSize: 15, fontWeight: "600" as const, color: "#64748b" },
  deleteText: { fontSize: 15, fontWeight: "600" as const, color: "#fff" },
});
