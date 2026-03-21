import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { OrderProvider } from './context/OrderContext';

// Admin Pages
import AdminLogin from './pages/admin/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminTables from './pages/admin/Tables';
import Analytics from './pages/admin/Analytics';
import History from './pages/admin/History';
import Udhar from './pages/admin/Udhar';
import Settings from './pages/admin/Settings';

// Customer Pages
import Menu from './pages/customer/Menu';
import Cart from './pages/customer/Cart';
import OrderStatus from './pages/customer/OrderStatus';

import AdminLayout from './components/AdminLayout';

function App() {
  return (
    <OrderProvider>
      <Router>
        <Routes>
          {/* Customer Routes (assuming format: /table/:tableId) */}
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
        </Routes>
      </Router>
    </OrderProvider>
  );
}

export default App;
