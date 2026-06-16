import React, { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  ModalProps,
  Platform,
  StyleSheet,
} from "react-native";

type KeyboardAwareModalProps = ModalProps & {
  children: ReactNode;
  keyboardVerticalOffset?: number;
};

export default function KeyboardAwareModal({
  children,
  keyboardVerticalOffset = 0,
  ...props
}: KeyboardAwareModalProps) {
  return (
    <Modal {...props}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {children}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
