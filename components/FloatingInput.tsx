import { colors } from "@/colors";
import React, { useState, useRef, useEffect } from "react";
import {
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInputProps,
  webStyle,
} from "react-native";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { getDeviceMetrics } from "@/utils/responsive";

const { isXs: isSmallDevice } = getDeviceMetrics();

interface FloatingInputProps extends TextInputProps {
  label: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  leftIcon?: React.ComponentProps<typeof Icon>["name"];
  rightIcon?: React.ComponentProps<typeof Icon>["name"];
  onRightIconPress?: () => void;
  helperText?: string;
  type?: "text" | "number" | "email" | "phone" | "password";
}

const FloatingInput: React.FC<FloatingInputProps> = ({
  label,
  required = false,
  error,
  success = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  helperText,
  value,
  placeholder,
  onFocus,
  onBlur,
  onChangeText,
  editable = true,
  type = "text",
  maxLength,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(type === "password");
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

  const handleChangeText = (text: string) => {
    let processedText = text;
    if (type === "number" || type === "phone") {
      processedText = text.replace(/[^0-9]/g, "");
      if (maxLength && processedText.length > maxLength) {
        processedText = processedText.slice(0, maxLength);
      }
    }
    onChangeText?.(processedText);
  };

  const getCurrentColor = () => {
    if (error) return "#EF4444";
    if (success) return "#10B981";
    if (isFocused) return colors.primary;
    return value ? "#6B7280" : "#9CA3AF";
  };

  const getKeyboardType = () => {
    switch (type) {
      case "number":
      case "phone":
        return "numeric" as const;
      case "email":
        return "email-address" as const;
      default:
        return "default" as const;
    }
  };

  const getAutoCapitalize = () => {
    switch (type) {
      case "email":
        return "none" as const;
      default:
        return (props.autoCapitalize || "sentences") as
          | "none"
          | "sentences"
          | "words"
          | "characters";
    }
  };

  const getMaxLength = () => {
    if (type === "number" || type === "phone") {
      return maxLength || undefined;
    }
    return maxLength;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getRightIcon = ():
    | React.ComponentProps<typeof Icon>["name"]
    | undefined => {
    if (type === "password") {
      return showPassword ? "eye-off" : "eye";
    }
    return rightIcon;
  };

  const handleRightIconPress = () => {
    if (type === "password") {
      togglePasswordVisibility();
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  return (
    <div style={webStyle(styles.container)}>
      <div
        style={webStyle([
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
          success && styles.inputWrapperSuccess,
          !editable && styles.inputWrapperDisabled,
        ])}
      >
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={getCurrentColor()}
            style={styles.leftIcon}
          />
        )}

        <span
          style={webStyle([
            styles.floatingLabel,
            {
              top: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [15, -10],
              }),
              fontSize: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 12],
              }),
              color: getCurrentColor(),
              left: leftIcon ? 48 : 16,
            },
          ])}
        >
          {label}
          {required && <span style={webStyle(styles.required)}> *</span>}
        </span>

        <div
          style={webStyle({
            marginTop: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 10],
            }),
          })}
        >
          <TextInput
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (getRightIcon() || type === "password") &&
                styles.inputWithRightIcon,
              !editable && styles.inputDisabled,
            ]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={handleChangeText}
            editable={editable}
            placeholder={isFocused ? placeholder : ""}
            placeholderTextColor="#9CA3AF"
            keyboardType={getKeyboardType()}
            autoCapitalize={getAutoCapitalize()}
            secureTextEntry={type === "password" && showPassword}
            maxLength={getMaxLength()}
            {...props}
          />
        </div>

        {(getRightIcon() || type === "password") && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={handleRightIconPress}
            disabled={!onRightIconPress && type !== "password"}
          >
            <Icon
              name={
                getRightIcon() ||
                (type === "password"
                  ? showPassword
                    ? "eye-off"
                    : "eye"
                  : "eye")
              }
              size={20}
              color={getCurrentColor()}
            />
          </TouchableOpacity>
        )}

        {!rightIcon && !(type === "password") && success && (
          <div style={webStyle(styles.rightIcon)}>
            <Icon name="check-circle" size={20} color="#10B981" />
          </div>
        )}

        {!rightIcon && !(type === "password") && error && !success && (
          <div style={webStyle(styles.rightIcon)}>
            <Icon name="alert-circle" size={20} color="#EF4444" />
          </div>
        )}
      </div>

      {(error || helperText || (maxLength && type === "number")) && (
        <div style={webStyle(styles.bottomTextContainer)}>
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
          ) : (
            <div style={webStyle(styles.helperContainer)} />
          )}

          {(maxLength || (type === "number" && maxLength)) && value && (
            <span style={webStyle(styles.counterText)}>
              {value.length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: isSmallDevice ? 5 : 7,
  },
  inputWrapper: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: isSmallDevice ? 10 : 12,
    paddingHorizontal: isSmallDevice ? 12 : 16,
    paddingTop: isSmallDevice ? 4 : 6,
    paddingBottom: isSmallDevice ? 9 : 12,
    minHeight: isSmallDevice ? 52 : 60,
    position: "relative" as const,
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: "#F9FAFB",
  },
  inputWrapperError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inputWrapperSuccess: {
    borderColor: "#10B981",
    backgroundColor: "#F0FDF4",
  },
  inputWrapperDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  leftIcon: {
    position: "absolute" as const,
    left: isSmallDevice ? 12 : 16,
    top: isSmallDevice ? 16 : 18,
    zIndex: 1,
  },
  floatingLabel: {
    position: "absolute" as const,
    fontWeight: "500" as const,
    backgroundColor: colors.white,
    paddingHorizontal: 4,
    zIndex: 1,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    fontSize: isSmallDevice ? 14 : 16,
    color: "#1F2937",
    fontWeight: "500" as const,
    padding: 0,
    margin: 0,
  },
  inputWithLeftIcon: {
    marginLeft: 28,
  },
  inputWithRightIcon: {
    marginRight: 28,
  },
  inputDisabled: {
    color: "#9CA3AF",
  },
  rightIcon: {
    position: "absolute" as const,
    right: isSmallDevice ? 12 : 16,
    top: isSmallDevice ? 16 : 18,
  },
  bottomTextContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: isSmallDevice ? 4 : 6,
    minHeight: isSmallDevice ? 16 : 20,
  },
  errorContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    flex: 1,
  },
  helperContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
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

export default FloatingInput;
