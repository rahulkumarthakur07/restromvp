import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { OrderProvider } from "./context/OrderContext";

// 🔥 Lazy-loaded Admin Pages
const AdminLogin = lazy(() => import("./pages/admin/Login"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminTables = lazy(() => import("./pages/admin/Tables"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const OrderHistory = lazy(() => import("./pages/admin/History"));
const Udhar = lazy(() => import("./pages/admin/Udhar"));
const AdminWaiters = lazy(() => import("./pages/admin/Waiters"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const KitchenInbox = lazy(() => import("./pages/admin/KitchenInbox"));
const CabinManager = lazy(() => import("./pages/admin/CabinManager"));
const Subscription = lazy(() => import("./pages/admin/Subscription"));

// 🔥 Waiter Pages
const WaiterLogin = lazy(() => import("./pages/waiter/WaiterLogin"));
const WaiterDashboard = lazy(() => import("./pages/waiter/WaiterDashboard"));
const WaiterPOS = lazy(() => import("./pages/waiter/WaiterPOS"));
const WaiterCabins = lazy(() => import("./pages/waiter/WaiterCabins"));
const KitchenDashboard = lazy(() => import("./pages/kitchen/KitchenDashboard"));
const KitchenStock = lazy(() => import("./pages/kitchen/KitchenStock"));
const KitchenMessages = lazy(() => import("./pages/kitchen/KitchenMessages"));
const KitchenIngredients = lazy(() => import("./pages/kitchen/KitchenIngredients"));

// Customer Pages (keep normal for fast QR experience)
const Menu = lazy(() => import("./pages/customer/Menu"));
const Cart = lazy(() => import("./pages/customer/Cart"));
const OrderStatus = lazy(() => import("./pages/customer/OrderStatus"));
const Cabins = lazy(() => import("./pages/customer/Cabins"));

import AdminLayout from "./components/AdminLayout";
import WaiterLayout from "./components/WaiterLayout";
import KitchenLayout from "./components/KitchenLayout";
import SplashScreen from "./components/SplashScreen";
import LoaderScreen from "./components/LoaderScreen";
import { useState, useEffect } from "react";

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <OrderProvider>
      <SplashScreen isVisible={showSplash} />
      <Router>
        {/* 🔥 Suspense wrapper with themed LoaderScreen */}
        <Suspense fallback={<LoaderScreen message="Initializing Application..." />}>
          <Routes>
            {/* Customer Routes */}
            <Route path="/" element={<Navigate to="/table/1" />} />
            <Route path="/table/:tableId" element={<Menu />} />
            <Route path="/table/:tableId/cart" element={<Cart />} />
            <Route path="/table/:tableId/status" element={<OrderStatus />} />
            <Route path="/cabins/:tableId" element={<Cabins />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to="/admin/login" />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/tables" element={<AdminTables />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/history" element={<OrderHistory />} />
              <Route path="/admin/udhar" element={<Udhar />} />
              <Route path="/admin/staff" element={<AdminWaiters />} />
              <Route path="/admin/kitchen-inbox" element={<KitchenInbox />} />
              <Route path="/admin/cabins" element={<CabinManager />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/subscription" element={<Subscription />} />
            </Route>

            {/* Waiter Routes */}
            <Route path="/waiter" element={<Navigate to="/staffs/login" />} />
            <Route path="/staffs/login" element={<WaiterLogin />} />

            <Route element={<WaiterLayout />}>
              <Route path="/waiter/dashboard" element={<WaiterDashboard />} />
              <Route path="/waiter/pos" element={<WaiterPOS />} />
              <Route path="/waiter/cabins" element={<WaiterCabins />} />
            </Route>

            {/* Kitchen Routes (Login is shared via /staffs/login) */}
            <Route path="/kitchen" element={<Navigate to="/staffs/login" />} />
            <Route element={<KitchenLayout />}>
              <Route path="/kitchen/dashboard" element={<KitchenDashboard />} />
              <Route path="/kitchen/stock" element={<KitchenStock />} />
              <Route path="/kitchen/messages" element={<KitchenMessages />} />
              <Route path="/kitchen/ingredients" element={<KitchenIngredients />} />
            </Route>

            <Route path="*" element={<Navigate to="/table/1" />} />
          </Routes>
        </Suspense>
      </Router>
    </OrderProvider>
  );
}

export default App;
