import React from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  CreditCard,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Home,
  Image,
  Info,
  LogOut,
  Mail,
  Menu,
  Minus,
  Package,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Trash2,
  Upload,
  User,
  Users,
  X
} from "lucide-react";

const iconMap: Record<string, any> = {
  add: Plus,
  "add-circle": Plus,
  "alert-circle": AlertCircle,
  "arrow-back": ArrowLeft,
  "arrow-down": ArrowDown,
  "arrow-forward": ArrowRight,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  bell: Bell,
  calendar: Calendar,
  camera: Camera,
  card: CreditCard,
  "card-outline": CreditCard,
  cash: CreditCard,
  "cash-outline": CreditCard,
  check: Check,
  checkmark: Check,
  "checkmark-circle": CheckCircle,
  "chevron-back": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-forward": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  close: X,
  delete: Trash2,
  document: FileText,
  download: Download,
  edit: Edit,
  eye: Eye,
  "eye-off": EyeOff,
  home: Home,
  image: Image,
  information: Info,
  "information-circle": Info,
  "log-out": LogOut,
  mail: Mail,
  menu: Menu,
  minus: Minus,
  package: Package,
  pencil: Edit,
  phone: Phone,
  print: Printer,
  refresh: RefreshCw,
  "refresh-circle": RefreshCw,
  search: Search,
  settings: Settings,
  share: Share2,
  trash: Trash2,
  "trash-outline": Trash2,
  upload: Upload,
  user: User,
  person: User,
  people: Users,
  users: Users
};

function normalizeIconName(name?: string) {
  return (name || "")
    .replace(/-outline$|-sharp$|-circle-outline$/g, "")
    .toLowerCase();
}

export function Icon({ name, size = 20, color = "currentColor", style, ...props }: any) {
  const Component = iconMap[normalizeIconName(name)] || Circle;
  return <Component size={size} color={color} style={style} {...props} />;
}

const glyphMap = {} as Record<string, number>;

export const Ionicons = Object.assign(Icon, { glyphMap });
export const MaterialCommunityIcons = Object.assign(Icon, { glyphMap });
export const MaterialIcons = Object.assign(Icon, { glyphMap });

export default Object.assign(Icon, { glyphMap });
