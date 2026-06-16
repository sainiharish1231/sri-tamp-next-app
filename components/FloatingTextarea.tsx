"use client";


import { AlertCircle, CheckCircle, Info, Loader, Wand2 } from "lucide-react";
import { generateText } from "@rork-ai/toolkit-sdk";

interface FloatingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  containerStyle?: string;
  rows?: number;
  enableAIRewrite?: boolean;
  aiRewritePrompt?: string;
}

const FloatingTextarea: React.FC<FloatingTextareaProps> = ({
  label,
  required = false,
  error,
  helperText,
  containerStyle = "",
  value,
  placeholder,
  onFocus,
  onBlur,
  onChange,
  rows = 4,
  disabled = false,
  enableAIRewrite = false,
  aiRewritePrompt,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getLabelColor = () => {
    if (error) return "#EF4444";
    if (isFocused) return "#8B5CF6";
    if (value) return "#6B7280";
    return "#9CA3AF";
  };

  const handleAIRewrite = async () => {
    if (!value || !String(value).trim() || isRewriting) return;

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

      if (rewritten && String(rewritten).trim()) {
        onChange?.({
          target: { value: String(rewritten).trim() },
        } as any);
      }
    } catch (err) {
      console.log("AI rewrite error:", err);
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className={containerStyle}>
      <div
        className={`relative bg-white border-2 rounded-lg p-4 transition-colors ${
          error
            ? "border-red-500 bg-red-50"
            : isFocused
              ? "border-purple-600 bg-gray-50"
              : "border-gray-200"
        } ${disabled ? "bg-gray-100 border-gray-200" : ""}`}
        style={{ minHeight: `${rows * 28 + 80}px` }}
      >
        {/* Floating Label */}
        <label
          className={`absolute left-4 px-1 bg-white font-medium transition-all pointer-events-none ${
            isFocused || value
              ? "-top-2.5 text-xs"
              : "top-4 text-base"
          }`}
          style={{ color: getLabelColor() }}
        >
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>

        {/* Textarea */}
        <textarea
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={onChange}
          disabled={disabled || isRewriting}
          placeholder={isFocused || value ? placeholder : ""}
          rows={rows}
          className={`w-full bg-transparent text-gray-900 font-medium outline-none resize-none ${
            disabled ? "text-gray-500" : ""
          }`}
          {...props}
        />

        {/* Error Icon */}
        {error && (
          <div className="absolute right-4 top-4 text-red-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* AI Rewrite Button */}
      {enableAIRewrite && value && String(value).trim().length > 10 && (
        <button
          onClick={handleAIRewrite}
          disabled={isRewriting}
          className={`flex items-center justify-center gap-2 mt-2.5 px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-600 font-semibold transition-colors ${
            isRewriting ? "opacity-70 cursor-default" : "hover:bg-purple-100"
          }`}
        >
          {isRewriting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Rewriting...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Rewrite with AI</span>
              <span className="ml-auto bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                AI
              </span>
            </>
          )}
        </button>
      )}

      {/* Error/Helper Text and Counter */}
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
        ) : null}

        {props.maxLength && value && (
          <span className="text-xs text-gray-600 ml-2">
            {String(value).length}/{props.maxLength}
          </span>
        )}
      </div>
    </div>
  );
};

export default FloatingTextarea;
