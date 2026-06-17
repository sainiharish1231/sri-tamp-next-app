"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Boxes,
  CircleUserRound,
  Factory,
  FileQuestion,
  LayoutDashboard,
  Menu,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserCog,
  Users,
  WalletCards
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { getAccessFlags } from "@/utils/access";

type AccessFlag = keyof ReturnType<typeof getAccessFlags>;

type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  group: "Overview" | "Sales" | "Finance" | "Admin";
  flag?: AccessFlag;
  always?: boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Business snapshot",
    icon: LayoutDashboard,
    group: "Overview",
    always: true
  },
  {
    href: "/parties",
    label: "Parties",
    description: "Customers and suppliers",
    icon: Users,
    group: "Sales",
    flag: "canManageParties"
  },
  {
    href: "/orders",
    label: "Orders",
    description: "Purchase and sale orders",
    icon: ShoppingBag,
    group: "Sales",
    flag: "canViewOrders"
  },
  {
    href: "/products",
    label: "Products",
    description: "Catalog and stock",
    icon: Package,
    group: "Sales",
    flag: "isAdmin"
  },
  {
    href: "/activities",
    label: "Activities",
    description: "Latest workspace changes",
    icon: Activity,
    group: "Overview",
    flag: "canViewActivities"
  },
  {
    href: "/enquiry",
    label: "Enquiry",
    description: "Incoming leads",
    icon: FileQuestion,
    group: "Sales",
    flag: "isAdmin"
  },
  {
    href: "/transaction",
    label: "Transactions",
    description: "Order transactions",
    icon: ReceiptText,
    group: "Finance",
    flag: "isAdmin"
  },
  {
    href: "/material-transaction",
    label: "Material",
    description: "Metal movement",
    icon: Boxes,
    group: "Finance",
    flag: "isAdmin"
  },
  {
    href: "/financial-transaction",
    label: "Financial",
    description: "Payments and receipts",
    icon: WalletCards,
    group: "Finance",
    flag: "isAdmin"
  },
  {
    href: "/expense",
    label: "Expenses",
    description: "Costs and settlements",
    icon: BadgeIndianRupee,
    group: "Finance",
    flag: "isAdmin"
  },
  {
    href: "/employees",
    label: "Employees",
    description: "Attendance and salary",
    icon: UserCog,
    group: "Admin",
    flag: "canManageEmployees"
  },
  {
    href: "/users",
    label: "Users",
    description: "Team access",
    icon: ShieldCheck,
    group: "Admin",
    flag: "isAdmin"
  },
  {
    href: "/menu",
    label: "Account",
    description: "Profile and settings",
    icon: Menu,
    group: "Admin",
    always: true
  }
];

const groupOrder: NavItem["group"][] = ["Overview", "Sales", "Finance", "Admin"];

function isActivePath(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function pageMeta(pathname: string | null, items: NavItem[]) {
  const active = [...items]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isActivePath(pathname, item.href));

  if (active) {
    return {
      title: active.label,
      description: active.description
    };
  }

  return {
    title: "Workspace",
    description: "San Raj Metal Art operations"
  };
}

function initials(name?: string | null) {
  if (!name) return "SR";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, isAuthenticated, isLoading } = useAuthStore();
  const user = session?.user;
  const flags = getAccessFlags(user?.role);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const visibleItems = useMemo(
    () =>
      navItems.filter((item) => {
        if (item.always) return true;
        return item.flag ? Boolean(flags[item.flag]) : true;
      }),
    [flags]
  );

  const groupedItems = useMemo(
    () =>
      groupOrder
        .map((group) => ({
          group,
          items: visibleItems.filter((item) => item.group === group)
        }))
        .filter((section) => section.items.length > 0),
    [visibleItems]
  );

  const meta = pageMeta(pathname, visibleItems);

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-mark">
            <Factory size={22} />
          </div>
          <div>
            <div className="dashboard-brand-title">San Raj</div>
            <div className="dashboard-brand-subtitle">Metal Art</div>
          </div>
        </div>

        <nav className="dashboard-nav">
          {groupedItems.map((section) => (
            <div className="dashboard-nav-section" key={section.group}>
              <div className="dashboard-nav-label">{section.group}</div>
              <div className="dashboard-nav-list">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActivePath(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`dashboard-nav-item ${active ? "is-active" : ""}`}
                    >
                      <span className="dashboard-nav-icon">
                        <Icon size={18} />
                      </span>
                      <span>
                        <span className="dashboard-nav-title">{item.label}</span>
                        <span className="dashboard-nav-copy">{item.description}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="dashboard-workspace">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-main">
            <div>
              <div className="dashboard-eyebrow">Workspace</div>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
            <div className="dashboard-search">
              <Search size={17} />
              <span>Search records</span>
            </div>
          </div>

          <div className="dashboard-user-card">
            <div className="dashboard-user-avatar">{initials(user?.name)}</div>
            <div>
              <div className="dashboard-user-name">{user?.name || "San Raj User"}</div>
              <div className="dashboard-user-role">{user?.role || "Dashboard"}</div>
            </div>
            <CircleUserRound size={18} />
          </div>
        </header>

        <main className="dashboard-content">
          <div className="dashboard-content-inner">{children}</div>
        </main>
      </div>

      <nav className="dashboard-mobile-nav">
        {visibleItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`dashboard-mobile-nav-item ${active ? "is-active" : ""}`}
            >
              <Icon size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/menu"
          className={`dashboard-mobile-nav-item ${isActivePath(pathname, "/menu") ? "is-active" : ""}`}
        >
          <BarChart3 size={21} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
