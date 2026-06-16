import React, { useState, useRef, useEffect } from "react";
import {
  TextInput,
  StyleSheet,
  Animated,
  TextInputProps,
  TouchableOpacity,
  ActivityIndicator,
  webStyle,
} from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { generateText } from "@rork-ai/toolkit-sdk";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface FloatingTextareaProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  containerStyle?: any;
  rows?: number;
  enableAIRewrite?: boolean;
  aiRewritePrompt?: string;
}

const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
  label,
  required = false,
  error,
  helperText,
  containerStyle,
  value,
  placeholder,
  onFocus,
  onBlur,
  onChangeText,
  rows = 4,
  editable = true,
  enableAIRewrite = false,
  aiRewritePrompt,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value || isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, isFocused]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const labelTop = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [28, 12],
  });

  const labelSize = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  const getLabelColor = () => {
    if (error) return "#EF4444";
    if (isFocused) return "#8B5CF6";
    if (value) return "#6B7280";
    return "#9CA3AF";
  };

  const minHeight = rows * 24 + 60;

  const handleAIRewrite = async () => {
    if (!value || !value.trim() || isRewriting) return;

    setIsRewriting(true);
    try {
      const prompt =
        aiRewritePrompt ||
        `Rewrite the following product description to be more professional, engaging, and detailed for an e-commerce listing. Keep the key information but make it more appealing. Only return the rewritten text, nothing else:\n\n"${value}"`;

      const rewritten = await generateText({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      if (rewritten && rewritten.trim()) {
        onChangeText?.(rewritten.trim());
      }
    } catch (err) {
      console.log("AI rewrite error:", err);
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div style={webStyle([styles.container, containerStyle])}>
      <div
        style={webStyle([
          styles.textareaContainer,
          isFocused && styles.textareaContainerFocused,
          error && styles.textareaContainerError,
          !editable && styles.textareaContainerDisabled,
          { minHeight },
        ])}
      >
        <span
          style={webStyle([
            styles.label,
            {
              top: labelTop,
              fontSize: labelSize,
              color: getLabelColor(),
            },
          ])}
        >
          {label}
          {required && <span style={webStyle(styles.required)}> *</span>}
        </span>

        <TextInput
          style={[
            styles.textarea,
            !editable && styles.textareaDisabled,
            { marginTop: value || isFocused ? 20 : 0 },
          ]}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChangeText={onChangeText}
          editable={editable && !isRewriting}
          placeholder={isFocused || value ? placeholder : ""}
          placeholderTextColor="#9CA3AF"
          multiline={true}
          textAlignVertical="top"
          {...props}
        />

        {error && (
          <div style={webStyle(styles.errorIcon)}>
            <Icon name="alert-circle" size={20} color="#EF4444" />
          </div>
        )}
      </div>

      {enableAIRewrite && value && value.trim().length > 10 && (
        <TouchableOpacity
          style={[
            styles.aiRewriteButton,
            isRewriting && styles.aiRewriteButtonLoading,
          ]}
          onPress={handleAIRewrite}
          disabled={isRewriting}
          activeOpacity={0.7}
        >
          {isRewriting ? (
            <>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <span style={webStyle(styles.aiRewriteText)}>Rewriting...</span>
            </>
          ) : (
            <>
              <Icon name="auto-fix" size={18} color="#8B5CF6" />
              <span style={webStyle(styles.aiRewriteText)}>Rewrite with AI</span>
              <div style={webStyle(styles.aiBadge)}>
                <span style={webStyle(styles.aiBadgeText)}>AI</span>
              </div>
            </>
          )}
        </TouchableOpacity>
      )}

      <div style={webStyle(styles.bottomContainer)}>
        {error ? (
          <div style={webStyle(styles.errorContainer)}>
            <Icon name="alert-circle" size={14} color="#EF4444" />
            <span style={webStyle(styles.errorText)}>{error}</span>
          </div>
        ) : helperText ? (
          <div style={webStyle(styles.helperContainer)}>
            <Icon name="information-outline" size={14} color="#6B7280" />
            <span style={webStyle(styles.helperText)}>{helperText}</span>
          </div>
        ) : null}

        {props.maxLength && value && (
          <span style={webStyle(styles.counterText)}>
            {value.length}/{props.maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  textareaContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    minHeight: 140,
    position: "relative" as const,
  },
  textareaContainerFocused: {
    borderColor: "#8B5CF6",
    borderWidth: 2,
    backgroundColor: "#F9FAFB",
  },
  textareaContainerError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  textareaContainerDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  label: {
    position: "absolute" as const,
    left: isSmallDevice ? 12 : 16,
    fontWeight: "500" as const,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    zIndex: 1,
  },
  required: {
    color: "#EF4444",
  },
  textarea: {
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
    fontWeight: "500" as const,
    paddingTop: isSmallDevice ? 6 : 8,
    paddingBottom: 4,
    lineHeight: isSmallDevice ? 20 : 22,
    minHeight: isSmallDevice ? 84 : 100,
  },
  textareaDisabled: {
    color: "#9CA3AF",
  },
  errorIcon: {
    position: "absolute" as const,
    right: isSmallDevice ? 12 : 16,
    top: isSmallDevice ? 14 : 16,
  },
  aiRewriteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: isSmallDevice ? 6 : 8,
    marginTop: isSmallDevice ? 8 : 10,
    paddingVertical: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  aiRewriteButtonLoading: {
    opacity: 0.7,
  },
  aiRewriteText: {
    fontSize: isSmallDevice ? 13 : 14,
    fontWeight: "600" as const,
    color: "#8B5CF6",
  },
  aiBadge: {
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700" as const,
  },
  bottomContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    minHeight: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    flex: 1,
  },
  helperContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  counterText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 8,
  },
});

export default FloatingTextarea;
