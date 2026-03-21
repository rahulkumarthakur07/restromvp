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
const History = lazy(() => import("./pages/admin/History"));
const Udhar = lazy(() => import("./pages/admin/Udhar"));
const Settings = lazy(() => import("./pages/admin/Settings"));

// Customer Pages (keep normal for fast QR experience)
const Menu = lazy(() => import("./pages/customer/Menu"));
const Cart = lazy(() => import("./pages/customer/Cart"));
const OrderStatus = lazy(() => import("./pages/customer/OrderStatus"));

import AdminLayout from "./components/AdminLayout";

function App() {
  return (
    <OrderProvider>
      <Router>
        {/* 🔥 Suspense wrapper REQUIRED */}
        <Suspense fallback={<div style={{ padding: 20 }}>Loading...</div>}>
          <Routes>
            {/* Customer Routes */}
            <Route path="/" element={<Navigate to="/table/1" />} />
            <Route path="/table/:tableId" element={<Menu />} />
            <Route path="/table/:tableId/cart" element={<Cart />} />
            <Route path="/table/:tableId/status" element={<OrderStatus />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<Navigate to="/admin/login" />} />
            <Route path="/admin/login" element={<AdminLogin />} />

            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/tables" element={<AdminTables />} />
              <Route path="/admin/analytics" element={<Analytics />} />
              <Route path="/admin/history" element={<History />} />
              <Route path="/admin/udhar" element={<Udhar />} />
              <Route path="/admin/settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<Navigate to="/table/1" />} />
          </Routes>
        </Suspense>
      </Router>
    </OrderProvider>
  );
}

export default App;
