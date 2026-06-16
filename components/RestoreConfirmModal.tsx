"use client";

import { RefreshCw, X } from "lucide-react";

interface RestoreConfirmModalProps {
  visible: boolean;
  title?: string;
  message: string;
  itemName?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function RestoreConfirmModal({
  visible,
  title = "Restore Confirmation",
  message,
  itemName,
  loading = false,
  onConfirm,
  onCancel,
}: RestoreConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(visible);

  useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full transform transition-all scale-100 opacity-100">
        {/* Icon Container */}
        <div className="flex justify-center pt-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <RefreshCw size={28} className="text-blue-500" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center px-6 py-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm mb-4">{message}</p>

          {itemName && (
            <div className="bg-gray-50 rounded-lg p-3 mb-6 border border-gray-200">
              <p className="text-gray-900 font-semibold text-sm">
                {`"${itemName}"`}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <X size={18} />
            <span>Cancel</span>
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <RefreshCw size={18} />
                <span>Restore</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
