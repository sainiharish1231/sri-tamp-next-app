import { colors } from "@/colors";
import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Info,
  User,
  Mail,
  Phone,
  Lock,
  MapPin,
  Home,
  Briefcase,
  Calendar,
  CreditCard,
  Building2,
} from "lucide-react";

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  leftIcon?: "user" | "mail" | "phone" | "lock" | "mapPin" | "home" | "briefcase" | "calendar" | "creditCard" | "building2";
  rightIcon?: string;
  onRightIconPress?: () => void;
  helperText?: string;
  inputType?: "text" | "number" | "email" | "tel" | "password" | "date";
}

const getIconComponent = (iconName?: string) => {
  if (!iconName) return null;
  const iconProps = { className: "w-5 h-5" };
  switch (iconName) {
    case "user":
      return <User {...iconProps} />;
    case "mail":
      return <Mail {...iconProps} />;
    case "phone":
      return <Phone {...iconProps} />;
    case "lock":
      return <Lock {...iconProps} />;
    case "mapPin":
      return <MapPin {...iconProps} />;
    case "home":
      return <Home {...iconProps} />;
    case "briefcase":
      return <Briefcase {...iconProps} />;
    case "calendar":
      return <Calendar {...iconProps} />;
    case "creditCard":
      return <CreditCard {...iconProps} />;
    case "building2":
      return <Building2 {...iconProps} />;
    default:
      return null;
  }
};

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
  onChange,
  disabled = false,
  inputType = "text",
  maxLength,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let processedValue = e.target.value;
    if (inputType === "number" || inputType === "tel") {
      processedValue = e.target.value.replace(/[^0-9]/g, "");
      if (maxLength && processedValue.length > maxLength) {
        processedValue = processedValue.slice(0, maxLength);
      }
    }
    onChange?.({ ...e, target: { ...e.target, value: processedValue } });
  };

  const getCurrentColor = () => {
    if (error) return "#EF4444";
    if (success) return "#10B981";
    if (isFocused) return colors.primary;
    return value ? "#6B7280" : "#9CA3AF";
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleRightIconPress = () => {
    if (inputType === "password") {
      togglePasswordVisibility();
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const showPasswordToggle = inputType === "password";
  const showIcon = showPasswordToggle || rightIcon;

  return (
    <div className="mb-2">
      <div
        className={`relative bg-white border-2 rounded-lg p-4 transition-colors ${
          error
            ? "border-red-500 bg-red-50"
            : success
              ? "border-green-500 bg-green-50"
              : isFocused
                ? "border-purple-600 bg-gray-50"
                : "border-gray-200"
        } ${disabled ? "bg-gray-100 border-gray-200" : ""}`}
      >
        {/* Left Icon */}
        {leftIcon && (
          <div
            className="absolute left-4 top-4 text-gray-400"
            style={{ color: getCurrentColor() }}
          >
            {getIconComponent(leftIcon)}
          </div>
        )}

        {/* Floating Label */}
        <label
          className={`absolute left-4 px-1 bg-white font-medium transition-all pointer-events-none ${
            isFocused || value
              ? "-top-2.5 text-xs"
              : "top-4 text-base"
          }`}
          style={{ color: getCurrentColor() }}
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>

        {/* Input Field */}
        <input
          type={showPasswordToggle && showPassword ? "text" : inputType}
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          disabled={disabled}
          placeholder={isFocused ? placeholder : ""}
          maxLength={maxLength}
          className={`w-full bg-transparent text-gray-900 font-medium outline-none ${
            leftIcon ? "pl-10" : ""
          } ${showIcon ? "pr-10" : ""} ${disabled ? "text-gray-500" : ""}`}
          {...props}
        />

        {/* Right Icon */}
        {showIcon && (
          <button
            type="button"
            onClick={handleRightIconPress}
            disabled={disabled || (!onRightIconPress && !showPasswordToggle)}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 disabled:cursor-default"
            style={{ color: getCurrentColor() }}
          >
            {showPasswordToggle ? (
              showPassword ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )
            ) : success && !rightIcon ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : error && !rightIcon ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : null}
          </button>
        )}
      </div>

      {/* Error/Helper Text and Counter */}
      {(error || helperText || (maxLength && inputType === "number")) && (
        <div className="flex justify-between items-center mt-1.5 min-h-5">
          {error ? (
            <div className="flex items-center gap-1.5 flex-1">
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs text-red-500">{error}</span>
            </div>
          ) : helperText ? (
            <div className="flex items-center gap-1.5 flex-1">
              <Info className="w-3.5 h-3.5 text-gray-600" />
              <span className="text-xs text-gray-600">{helperText}</span>
            </div>
          ) : (
            <div />
          )}

          {(maxLength || (inputType === "number" && maxLength)) && value && (
            <span className="text-xs text-gray-600 ml-2">
              {String(value).length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FloatingInput;
