import React, { useState, useEffect, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  DollarSign,
  Archive,
  MinusCircle,
  History,
  Clock,
} from "lucide-react";

const STORAGE_KEY = "resmvp_inventory";
const HISTORY_KEY = "resmvp_inventory_history";

const UNITS = ["kg", "g", "pcs", "liters", "ml", "dozen", "bag", "box"];
const CATEGORIES = [
  "Vegetables",
  "Fruits",
  "Dairy",
  "Meat & Poultry",
  "Seafood",
  "Grains & Pulses",
  "Spices & Seasoning",
  "Beverages",
  "Bakery",
  "Snacks",
  "Cleaning Supplies",
  "Other",
];

const EMPTY_FORM = {
  name: "",
  category: CATEGORIES[0],
  quantity: "",
  unit: UNITS[0],
  pricePerUnit: "",
  minStockLevel: "",
};

function getStatus(quantity, minLevel) {
  const qty = parseFloat(quantity) || 0;
  const min = parseFloat(minLevel) || 0;
  if (qty === 0) return "out";
  if (qty <= min) return "low";
  return "in";
}

const StatusBadge = ({ status }) => {
  if (status === "out")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-2xl bg-red-50 text-red-600 border border-red-100">
        <XCircle className="w-3 h-3" /> Out of Stock
      </span>
    );
  if (status === "low")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100">
        <AlertTriangle className="w-3 h-3" /> Low Stock
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
      <CheckCircle className="w-3 h-3" /> In Stock
    </span>
  );
};

export default function Inventory() {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [takeOutItem, setTakeOutItem] = useState(null);
  const [takeOutAmount, setTakeOutAmount] = useState("");
  const [takeOutReason, setTakeOutReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      pricePerUnit: String(item.pricePerUnit),
      minStockLevel: String(item.minStockLevel),
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = {
      id: editingId || Date.now().toString(),
      name: form.name.trim(),
      category: form.category,
      quantity: parseFloat(form.quantity) || 0,
      unit: form.unit,
      pricePerUnit: parseFloat(form.pricePerUnit) || 0,
      minStockLevel: parseFloat(form.minStockLevel) || 0,
      createdAt: editingId
        ? items.find((i) => i.id === editingId)?.createdAt
        : Date.now(),
    };

    if (editingId) {
      setItems((prev) => prev.map((i) => (i.id === editingId ? payload : i)));
    } else {
      setItems((prev) => [payload, ...prev]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    if (confirm("Delete this inventory item?")) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  const openTakeOut = (item) => {
    setTakeOutItem(item);
    setTakeOutAmount("");
    setTakeOutReason("");
  };

  const handleTakeOut = (e) => {
    e.preventDefault();
    const deduct = parseFloat(takeOutAmount) || 0;
    if (deduct <= 0) return;
    const entry = {
      id: Date.now().toString(),
      itemId: takeOutItem.id,
      itemName: takeOutItem.name,
      unit: takeOutItem.unit,
      amount: deduct,
      reason: takeOutReason.trim() || "—",
      before: takeOutItem.quantity,
      after: Math.max(0, takeOutItem.quantity - deduct),
      timestamp: Date.now(),
    };
    setHistory((prev) => [entry, ...prev]);
    setItems((prev) =>
      prev.map((i) =>
        i.id === takeOutItem.id
          ? { ...i, quantity: Math.max(0, i.quantity - deduct) }
          : i
      )
    );
    setTakeOutItem(null);
  };

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const status = getStatus(item.quantity, item.minStockLevel);
      const matchSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchCat =
        filterCategory === "All" || item.category === filterCategory;
      const matchStatus = filterStatus === "All" || status === filterStatus;
      return matchSearch && matchCat && matchStatus;
    });
  }, [items, search, filterCategory, filterStatus]);

  const summaryStats = useMemo(() => {
    const total = items.reduce(
      (s, i) => s + (i.quantity || 0) * (i.pricePerUnit || 0),
      0
    );
    const inStock = items.filter(
      (i) => getStatus(i.quantity, i.minStockLevel) === "in"
    ).length;
    const low = items.filter(
      (i) => getStatus(i.quantity, i.minStockLevel) === "low"
    ).length;
    const out = items.filter(
      (i) => getStatus(i.quantity, i.minStockLevel) === "out"
    ).length;
    return { total, inStock, low, out };
  }, [items]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-6">
      {/* Page Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-violet-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 bg-violet-50 text-violet-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-3">
              <Archive className="w-4 h-4" />
              <span>Stock Control</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight leading-none mb-1">
              Inventory Management
            </h1>
            <p className="text-gray-400 font-medium text-sm">
              Track your ingredients, supplies, and stock levels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-gray-50 text-gray-700 font-black rounded-2xl shadow-sm border border-gray-200 transition-all active:scale-95 text-sm"
            >
              <History className="w-4 h-4 text-gray-400" />
              History
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-5 py-3 bg-gray-950 hover:bg-black text-white font-black rounded-2xl shadow-lg shadow-gray-900/20 transition-all active:scale-95 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="bg-gray-50 border border-gray-100 rounded-3xl px-4 py-3 flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total Value
            </span>
            <span className="text-lg font-black text-gray-950">
              Rs. {summaryStats.total.toFixed(0)}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl px-4 py-3 flex flex-col">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> In Stock
            </span>
            <span className="text-lg font-black text-emerald-700">
              {summaryStats.inStock} items
            </span>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-3xl px-4 py-3 flex flex-col">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Low Stock
            </span>
            <span className="text-lg font-black text-amber-700">
              {summaryStats.low} items
            </span>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-3xl px-4 py-3 flex flex-col">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Out of Stock
            </span>
            <span className="text-lg font-black text-red-700">
              {summaryStats.out} items
            </span>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            placeholder="Search items or categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer"
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/30 cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-5">
              <Package className="w-10 h-10 text-gray-200" />
            </div>
            <p className="font-black text-gray-300 text-xl mb-1">
              {items.length === 0 ? "No items yet" : "No results found"}
            </p>
            <p className="text-gray-300 font-medium text-sm">
              {items.length === 0
                ? "Click 'Add Item' to start tracking your inventory."
                : "Try changing your search or filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Item Name", "Category", "Qty", "Unit", "Price/Unit", "Total Value", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-4 text-left text-[10px] font-extrabold text-gray-400 uppercase tracking-widest whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => {
                  const status = getStatus(item.quantity, item.minStockLevel);
                  const totalValue = item.quantity * item.pricePerUnit;
                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 transition-all ${
                        idx === filtered.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-violet-400" />
                          </div>
                          <span className="font-extrabold text-gray-900 text-sm">
                            {item.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-xs font-bold px-3 py-1.5 bg-gray-50 text-gray-600 rounded-2xl border border-gray-100">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`font-extrabold text-sm tabular-nums ${
                            status === "out"
                              ? "text-red-500"
                              : status === "low"
                              ? "text-amber-500"
                              : "text-gray-900"
                          }`}
                        >
                          {item.quantity}
                        </span>
                        {item.minStockLevel > 0 && (
                          <span className="block text-[10px] text-gray-400 font-bold">
                            min: {item.minStockLevel}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                        {item.unit}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900 tabular-nums">
                        Rs. {item.pricePerUnit.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="font-extrabold text-gray-950 text-sm tabular-nums">
                          Rs. {totalValue.toFixed(0)}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openTakeOut(item)}
                            title="Take Out Stock"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-500 transition-all active:scale-95 border border-orange-100"
                          >
                            <MinusCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-500 transition-all active:scale-95 border border-blue-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all active:scale-95 border border-red-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl shadow-gray-900/20 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div>
                <h2 className="font-black text-gray-950 text-lg leading-tight">
                  {editingId ? "Edit Item" : "Add Inventory Item"}
                </h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {editingId ? "Update the item details below." : "Fill in the details to add a new item."}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Item Name */}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Item Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Tomatoes"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Category *
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300 transition-all cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Quantity + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Quantity *
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Unit *
                  </label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300 transition-all cursor-pointer"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price + Min Stock */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Price / Unit *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">Rs.</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={form.pricePerUnit}
                      onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })}
                      className="w-full pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Min Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={form.minStockLevel}
                    onChange={(e) => setForm({ ...form, minStockLevel: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-300 transition-all"
                  />
                </div>
              </div>

              {/* Total Value Preview */}
              {form.quantity && form.pricePerUnit && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                  <span className="text-xs font-black text-violet-500 uppercase tracking-widest">
                    Total Value Preview
                  </span>
                  <span className="font-black text-violet-700 text-base">
                    Rs. {((parseFloat(form.quantity) || 0) * (parseFloat(form.pricePerUnit) || 0)).toFixed(0)}
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 text-sm font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-black text-white bg-gray-950 hover:bg-black rounded-2xl shadow-lg shadow-gray-900/20 transition-all active:scale-95"
                >
                  {editingId ? "Save Changes" : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Take Out Modal */}
      {takeOutItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl shadow-gray-900/20 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div>
                <h2 className="font-black text-gray-950 text-lg leading-tight">Take Out Stock</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  Deduct from <span className="font-black text-gray-700">{takeOutItem.name}</span>
                </p>
              </div>
              <button
                onClick={() => setTakeOutItem(null)}
                className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleTakeOut} className="p-6 space-y-4">
              {/* Current stock info */}
              <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Current Stock</span>
                <span className="font-black text-orange-700 text-base">
                  {takeOutItem.quantity} {takeOutItem.unit}
                </span>
              </div>

              {/* Amount to deduct */}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Amount to Take Out *
                </label>
                <div className="relative">
                  <input
                    required
                    autoFocus
                    type="number"
                    min="0.01"
                    max={takeOutItem.quantity}
                    step="any"
                    placeholder={`Max ${takeOutItem.quantity}`}
                    value={takeOutAmount}
                    onChange={(e) => setTakeOutAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-300 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                    {takeOutItem.unit}
                  </span>
                </div>
              </div>

              {/* Reason (optional) */}
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Used in kitchen, Spoiled..."
                  value={takeOutReason}
                  onChange={(e) => setTakeOutReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-300 transition-all"
                />
              </div>

              {/* Remaining preview */}
              {takeOutAmount && parseFloat(takeOutAmount) > 0 && (
                <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 flex justify-between items-center">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Remaining After</span>
                  <span className={`font-black text-base ${
                    Math.max(0, takeOutItem.quantity - parseFloat(takeOutAmount)) === 0
                      ? "text-red-500"
                      : Math.max(0, takeOutItem.quantity - parseFloat(takeOutAmount)) <= takeOutItem.minStockLevel
                      ? "text-amber-500"
                      : "text-emerald-600"
                  }`}>
                    {Math.max(0, takeOutItem.quantity - (parseFloat(takeOutAmount) || 0)).toFixed(2)} {takeOutItem.unit}
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTakeOutItem(null)}
                  className="flex-1 py-3 text-sm font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 text-sm font-black text-white bg-orange-500 hover:bg-orange-600 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <MinusCircle className="w-4 h-4" /> Confirm Take Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-4xl md:rounded-4xl shadow-2xl shadow-gray-900/20 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-50 shrink-0">
              <div>
                <h2 className="font-black text-gray-950 text-lg leading-tight flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  Take-Out History
                </h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">
                  {history.length} {history.length === 1 ? "entry" : "entries"} recorded
                </p>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => { if (confirm("Clear all history?")) setHistory([]); }}
                    className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-gray-200" />
                  </div>
                  <p className="font-black text-gray-300 text-lg mb-1">No history yet</p>
                  <p className="text-gray-300 font-medium text-sm">Take-out operations will appear here once recorded.</p>
                </div>
              ) : (
                <div className="p-4 space-y-2.5">
                  {history.map((entry) => (
                    <div key={entry.id} className="bg-gray-50 border border-gray-100 rounded-3xl p-4 flex flex-col gap-2 hover:bg-gray-100/60 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shrink-0">
                            <MinusCircle className="w-4 h-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="font-black text-gray-900 text-sm leading-tight">{entry.itemName}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                              {new Date(entry.timestamp).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}
                              {" · "}
                              {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-orange-600 text-sm shrink-0">-{entry.amount} {entry.unit}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white border border-gray-200 px-2.5 py-1 rounded-xl">
                          Before: {entry.before} {entry.unit}
                        </span>
                        <span className="text-gray-300 text-xs">→</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl border ${
                          entry.after === 0 ? "bg-red-50 border-red-100 text-red-500" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                        }`}>
                          After: {entry.after} {entry.unit}
                        </span>
                      </div>

                      {entry.reason && entry.reason !== "—" && (
                        <p className="text-xs text-gray-500 font-semibold bg-white border border-gray-100 rounded-xl px-3 py-2 leading-snug">
                          📝 {entry.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-50 shrink-0">
              <button
                onClick={() => setShowHistory(false)}
                className="w-full py-3 text-sm font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
