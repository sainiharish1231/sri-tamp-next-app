"use client";

import { X, Plus, Trash2, Edit, Search, CheckCircle, AlertCircle, Loader } from "lucide-react";
import MaterialService from "@/services/MaterialService";

interface MaterialsModalProps {
  onClose: () => void;
}

export default function MaterialsModal({ onClose }: MaterialsModalProps) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    getAllMaterials();
  }, []);

  const getAllMaterials = async () => {
    try {
      setLoading(true);
      const res = await MaterialService.fetchAllMaterial();
      if (res.success) {
        setMaterials(res.data || []);
      } else {
        showMessage("Failed to load materials", "error");
      }
    } catch (error) {
      console.log("Material fetch error:", error);
      showMessage("Failed to fetch materials", "error");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg: string, type: "success" | "error" = "success") => {
    setMessage({ text: msg, type });
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  };

  const addMaterial = async () => {
    try {
      if (!name.trim()) {
        showMessage("Please enter material name", "error");
        return;
      }

      setAdding(true);

      if (editingId) {
        const res = await MaterialService.updateMaterial(editingId, { name });
        if (res.success) {
          showMessage("Material updated successfully", "success");
          setName("");
          setEditingId(null);
          await getAllMaterials();
        } else {
          showMessage("Failed to update material", "error");
        }
      } else {
        const res = await MaterialService.addNewMaterial({ name });
        if (res.success) {
          showMessage("Material added successfully", "success");
          setName("");
          await getAllMaterials();
        } else {
          showMessage("Failed to add material", "error");
        }
      }
    } catch (error) {
      console.log("Something went wrong", error);
      showMessage("Failed to save material", "error");
    } finally {
      setAdding(false);
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;

    try {
      setDeletingId(id);
      const res = await MaterialService.deleteMaterial(id);
      if (res.success) {
        showMessage("Material deleted successfully", "success");
        await getAllMaterials();
      } else {
        showMessage("Failed to delete material", "error");
      }
    } catch (error) {
      console.log("Delete error:", error);
      showMessage("Failed to delete material", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (material: any) => {
    setName(material.name);
    setEditingId(material.id!);
  };

  const handleCancelEdit = () => {
    setName("");
    setEditingId(null);
  };

  const filteredMaterials = materials.filter((mat) =>
    mat.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-t-2xl overflow-hidden flex flex-col h-screen max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
        <h2 className="text-lg font-bold text-gray-900">Manage Materials</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 px-4 py-3 ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-b border-green-200"
              : "bg-red-50 text-red-800 border-b border-red-200"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Input Section */}
        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={editingId ? "Update material name..." : "Add new material..."}
              onKeyPress={(e) => e.key === "Enter" && addMaterial()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={addMaterial}
              disabled={adding}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {adding ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {editingId ? "Update" : "Add"}
            </button>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search materials..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Materials List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 text-purple-600 animate-spin" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              {materials.length === 0 ? "No materials yet" : "No materials found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredMaterials.map((material) => (
              <div
                key={material.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  editingId === material.id
                    ? "bg-purple-50 border-purple-300"
                    : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                }`}
              >
                <span className="font-medium text-gray-900">{material.name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(material)}
                    disabled={deletingId === material.id}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMaterial(material.id)}
                    disabled={deletingId === material.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === material.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Close Button */}
      <div className="p-4 border-t border-gray-200 bg-white sticky bottom-0">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-200 text-gray-900 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
