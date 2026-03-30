import React, { useEffect, useState } from "react";
import { Navigate, Outlet, Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  QrCode,
  LogOut,
  BarChart3,
  History,
  Wallet,
  Settings,
  Sun,
  Moon,
  Menu as MenuIcon,
  X,
  Users,
  Inbox,
  Hotel,
  CreditCard,
  Sparkles,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  MonitorSmartphone,
  Archive,
  ChevronDown,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useDarkMode } from "../hooks/useDarkMode";

export default function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("resmvp_admin_auth") === "true");
  const [user, setUser] = useState(auth.currentUser);
  const location = useLocation();
  const [settings, setSettings] = useState({});
  const { isDark, toggleDarkMode } = useDarkMode("light");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setIsAuthenticated(true);
        localStorage.setItem("resmvp_admin_auth", "true");
      } else {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem("resmvp_admin_auth");
      }
    });
    return () => unsub();
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [staffMenuOpen, setStaffMenuOpen] = useState(() => {
    return location.pathname.startsWith("/admin/staff/");
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("admin_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("admin_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, "settings", "general"));
        if (docSnap.exists()) setSettings(docSnap.data());
      } catch (e) {}
    };
    if (isAuthenticated) fetchSettings();
  }, [isAuthenticated]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (!isAuthenticated && !auth.currentUser) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("resmvp_admin_auth");
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const navItems = [
    {
      path: "/admin/pos",
      icon: MonitorSmartphone,
      label: "Point of Sale",
      color: "text-amber-500",
      highlight: true,
    },

    {
      path: "/admin/dashboard",
      icon: LayoutDashboard,
      label: "Live Orders",
      color: "text-blue-400",
    },
    {
      path: "/admin/products",
      icon: Package,
      label: "Manage Menu",
      color: "text-emerald-400",
    },
    {
      path: "/admin/tables",
      icon: QrCode,
      label: "Tables & QR",
      color: "text-violet-400",
    },
    {
      path: "/admin/analytics",
      icon: BarChart3,
      label: "Analytics",
      color: "text-amber-400",
    },
    {
      path: "/admin/history",
      icon: History,
      label: "History",
      color: "text-cyan-400",
    },
    {
      path: "/admin/inventory",
      icon: Archive,
      label: "Inventory",
      color: "text-violet-400",
    },
    {
      path: "/admin/udhar",
      icon: Wallet,
      label: "Ledger (Udhar)",
      color: "text-red-400",
    },
    {
      path: "/admin/staff",
      icon: Users,
      label: "Staff Management",
      color: "text-pink-400",
      isGroup: true,
      subItems: [
        { path: "/admin/staff/all", label: "All Staff" },
        { path: "/admin/staff/attendance", label: "Attendance" },
        { path: "/admin/staff/shifts", label: "Shifts" },
        { path: "/admin/staff/payroll", label: "Payroll" },
        { path: "/admin/staff/reports", label: "Reports" },
      ],
    },
    {
      path: "/admin/kitchen-inbox",
      icon: Inbox,
      label: "Kitchen Inbox",
      color: "text-orange-400",
    },
    {
      path: "/admin/cabins",
      icon: Hotel,
      label: "Cabins & VIP",
      color: "text-indigo-400",
    },
    {
      path: "/admin/settings",
      icon: Settings,
      label: "Settings",
      color: "text-gray-400",
    },
  ];

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)] flex flex-col transform transition-all duration-300 ease-in-out md:translate-x-0 md:static ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} ${sidebarCollapsed ? "md:w-[70px]" : "w-64"}`}
      >
        {/* Logo/Brand Area */}
        <div
          className={`border-b border-gray-50 flex items-center ${sidebarCollapsed ? "p-3 justify-center" : "p-4 justify-between"}`}
        >
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3 min-w-0">
              {settings.logo ? (
                <img
                  src={settings.logo}
                  className="w-9 h-9 object-contain rounded-2xl border border-white/10 shrink-0"
                  alt="Logo"
                />
              ) : (
                <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-black text-gray-950 leading-tight tracking-tight truncate">
                  {settings.name || "Admin Panel"}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Dashboard
                </p>
              </div>
            </div>
          )}

          {/* Hamburger/Collapse toggle — desktop */}
          <button
            onClick={sidebarCollapsed ? toggleSidebar : toggleSidebar}
            className="hidden md:flex p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-all shrink-0"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>

          {/* Mobile close */}
          <button
            className="md:hidden p-1.5 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-50 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collapsed: show logo icon alone */}
        {sidebarCollapsed && (
          <div className="hidden md:flex justify-center py-3 border-b border-gray-50">
            {settings.logo ? (
              <img
                src={settings.logo}
                className="w-9 h-9 object-contain rounded-2xl border border-white/10 "
                alt="Logo"
              />
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {navItems.map((item, index) => {
            const Icon = item.icon;

            // Expandable group item
            if (item.isGroup) {
              const isGroupActive = location.pathname.startsWith(item.path + "/");
              const isOpen = staffMenuOpen || isGroupActive;
              return (
                <React.Fragment key={item.path}>
                  <button
                    onClick={() => !sidebarCollapsed && setStaffMenuOpen(prev => !prev)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center px-3 py-2.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${sidebarCollapsed ? "justify-center" : "space-x-3"} ${
                      isGroupActive ? "bg-blue-50 text-blue-600 border border-blue-100/50" : "text-gray-500 hover:bg-gray-50 hover:text-gray-950 border border-transparent"
                    }`}
                  >
                    {isGroupActive && !sidebarCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />}
                    <div className={`p-1.5 rounded-xl transition-all shrink-0 ${isGroupActive ? item.color : "text-gray-400 group-hover:text-gray-600 group-hover:scale-110"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {!sidebarCollapsed && (
                      <>
                        <span className={`text-sm font-bold flex-1 text-left truncate ${isGroupActive ? "text-gray-950" : ""}`}>{item.label}</span>
                        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 text-blue-400" : "text-gray-300"}`} />
                      </>
                    )}
                  </button>
                  {!sidebarCollapsed && isOpen && (
                    <div className="ml-3 pl-3 border-l-2 border-gray-100 mt-0.5 mb-0.5 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                      {item.subItems.map(sub => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <Link key={sub.path} to={sub.path}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                              isSubActive ? "bg-blue-50 text-blue-600 border border-blue-100/50" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700 border border-transparent"
                            }`}>
                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSubActive ? "bg-blue-500" : "bg-gray-200"}`} />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {index < navItems.length - 1 && (
                    <div className={`h-px bg-linear-to-r from-transparent via-gray-100 to-transparent my-1 shrink-0 ${sidebarCollapsed ? "mx-2" : "mx-4"}`} />
                  )}
                </React.Fragment>
              );
            }

            // Regular nav item
            const isActive = location.pathname.startsWith(item.path);
            return (
              <React.Fragment key={item.path}>
                <Link
                  to={item.path}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`flex items-center px-3 py-2.5 rounded-2xl transition-all duration-300 group relative overflow-hidden ${sidebarCollapsed ? "justify-center" : "space-x-3"} ${
                    isActive
                      ? "bg-blue-50 text-blue-600 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)] border border-blue-100/50"
                      : item.highlight
                        ? "bg-amber-50/80 text-amber-700 border border-amber-100 hover:bg-amber-100/70 hover:text-amber-800"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-950 border border-transparent"
                  }`}
                >
                  {isActive && !sidebarCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full" />}
                  {!isActive && item.highlight && !sidebarCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-400 rounded-r-full opacity-60" />}
                  <div className={`p-1.5 rounded-xl transition-all shrink-0 ${
                    isActive ? item.color : item.highlight ? "text-amber-500 group-hover:scale-110" : "text-gray-400 group-hover:text-gray-600 group-hover:scale-110"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      <span className={`text-sm font-bold flex-1 truncate ${isActive ? "text-gray-950" : item.highlight ? "text-amber-800 font-black" : ""}`}>
                        {item.label}
                      </span>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-300 shrink-0" />}
                      {!isActive && item.highlight && (
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest bg-amber-100 px-1.5 py-0.5 rounded-lg shrink-0">POS</span>
                      )}
                    </>
                  )}
                </Link>
                {index < navItems.length - 1 && (
                  <div className={`h-px bg-linear-to-r from-transparent via-gray-100 to-transparent my-1 shrink-0 ${sidebarCollapsed ? "mx-2" : "mx-4"}`} />
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={`border-t border-gray-50 p-3 space-y-2`}>
          <Link
            to="/admin/subscription"
            title={sidebarCollapsed ? "Upgrade to Pro" : undefined}
            className={`flex items-center px-3 py-3 rounded-2xl transition-all duration-500 group relative overflow-hidden ${sidebarCollapsed ? "justify-center" : "space-x-3"} bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-0.5`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10 transition-transform duration-700 group-hover:scale-150" />

            <div
              className={`p-1.5 rounded-xl shrink-0 bg-white/20 text-white transition-transform duration-300 group-hover:scale-110 shadow-sm border border-white/10 backdrop-blur-sm`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-black tracking-tight leading-tight">
                    Upgrade Plan
                  </span>
                  <span className="text-[10px] font-bold text-indigo-200">
                    Unlock features
                  </span>
                </div>
                <div className="ml-auto bg-white text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm shadow-black/10 shrink-0">
                  Pro
                </div>
              </>
            )}
          </Link>

          <button
            onClick={toggleDarkMode}
            title={
              sidebarCollapsed
                ? isDark
                  ? "Light Mode"
                  : "Dark Mode"
                : undefined
            }
            className={`flex items-center px-3 py-2.5 rounded-2xl text-gray-500 hover:bg-gray-50 hover:text-gray-950 border border-transparent w-full transition-all duration-300 group ${sidebarCollapsed ? "justify-center" : "space-x-3"}`}
          >
            <div className="p-1.5 rounded-xl text-gray-400 group-hover:text-gray-600 group-hover:scale-110 transition-transform shrink-0">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </div>
            {!sidebarCollapsed && (
              <span className="text-sm font-bold">
                {isDark ? "Light Mode" : "Dark Mode"}
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
            className={`flex items-center px-3 py-2.5 rounded-2xl text-gray-500 hover:bg-red-50 hover:text-red-500 border border-transparent w-full transition-all duration-300 group ${sidebarCollapsed ? "justify-center" : "space-x-3"}`}
          >
            <div className="p-1.5 rounded-xl text-gray-400 group-hover:text-red-400 group-hover:scale-110 transition-transform shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-sm font-bold">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top header */}
        <header className="md:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200/50 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all active:scale-95 border border-gray-200"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center justify-center space-x-2 overflow-hidden mx-3">
            {settings.logo && (
              <img
                src={settings.logo}
                alt="Logo"
                className="w-7 h-7 rounded-lg object-contain border border-gray-100 shrink-0"
              />
            )}
            <h2 className="font-black text-gray-950 text-sm tracking-tight truncate">
              {settings.name || "Dashboard"}
            </h2>
          </div>
          <button
            onClick={toggleDarkMode}
            className="text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-xl border border-gray-200 transition-all active:scale-95"
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 xl:p-8 min-h-0 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
