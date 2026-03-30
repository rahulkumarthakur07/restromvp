import React, { useState, useEffect, useMemo } from "react";
import {
  Users, Plus, Search, X, Edit2, Trash2, Filter, UserCheck, UserX, Phone, Calendar, Briefcase,
} from "lucide-react";

const STORAGE_KEY = "resmvp_staff_members";

const ROLES = ["Manager", "Chef", "Waiter", "Cashier", "Delivery", "Cleaner", "Security"];
const SHIFTS = ["Morning (6AM–2PM)", "Evening (2PM–10PM)", "Night (10PM–6AM)", "Full Day"];

const EMPTY_FORM = {
  name: "", role: ROLES[0], phone: "", salary: "", shift: SHIFTS[0],
  joinDate: new Date().toISOString().split("T")[0], status: "active",
};

export default function AllStaff() {
  const [staff, setStaff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(staff)); }, [staff]);

  const openAdd = () => { setForm(EMPTY_FORM); setEditingId(null); setShowModal(true); };
  const openEdit = (s) => {
    setForm({ name: s.name, role: s.role, phone: s.phone, salary: String(s.salary), shift: s.shift, joinDate: s.joinDate, status: s.status });
    setEditingId(s.id); setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const payload = { id: editingId || Date.now().toString(), ...form, salary: parseFloat(form.salary) || 0 };
    if (editingId) setStaff(prev => prev.map(s => s.id === editingId ? payload : s));
    else setStaff(prev => [payload, ...prev]);
    setShowModal(false);
  };

  const handleDelete = (id) => { if (confirm("Remove this staff member?")) setStaff(prev => prev.filter(s => s.id !== id)); };
  const toggleStatus = (id) => setStaff(prev => prev.map(s => s.id === id ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s));

  const filtered = useMemo(() => staff.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.phone.includes(search);
    const matchRole = filterRole === "All" || s.role === filterRole;
    return matchSearch && matchRole;
  }), [staff, search, filterRole]);

  const activeCount = staff.filter(s => s.status === "active").length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-pink-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 bg-pink-50 text-pink-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-3">
              <Users className="w-4 h-4" /><span>All Staff</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight leading-none mb-1">Staff Directory</h1>
            <p className="text-gray-400 font-medium text-sm">Manage your team members and their details.</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-5 py-3 bg-gray-950 hover:bg-black text-white font-black rounded-2xl shadow-lg transition-all active:scale-95 text-sm self-start">
            <Plus className="w-4 h-4" /> Add Staff
          </button>
        </div>
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          <div className="bg-gray-50 border border-gray-100 rounded-3xl px-4 py-3">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Total Staff</span>
            <span className="text-xl font-black text-gray-950">{staff.length}</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl px-4 py-3">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 block">Active</span>
            <span className="text-xl font-black text-emerald-700">{activeCount}</span>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-3xl px-4 py-3">
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1 block">Inactive</span>
            <span className="text-xl font-black text-red-700">{staff.length - activeCount}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm p-4 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input type="text" placeholder="Search by name or phone..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-pink-500/30 transition-all" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="pl-8 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold text-gray-700 outline-none cursor-pointer">
            <option value="All">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-5"><Users className="w-10 h-10 text-gray-200" /></div>
            <p className="font-black text-gray-300 text-xl mb-1">{staff.length === 0 ? "No staff yet" : "No results found"}</p>
            <p className="text-gray-300 font-medium text-sm">{staff.length === 0 ? "Click 'Add Staff' to get started." : "Try changing search or filter."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Name", "Role", "Phone", "Shift", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <tr key={s.id} className={`border-b border-gray-50 hover:bg-gray-50/60 transition-all ${s.status === "inactive" ? "opacity-60" : ""} ${idx === filtered.length - 1 ? "border-b-0" : ""}`}>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-linear-to-tr from-pink-500 to-rose-400 flex items-center justify-center font-black text-white text-sm shadow-sm">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 text-sm">{s.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium">Joined {s.joinDate}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold px-3 py-1.5 bg-pink-50 text-pink-600 rounded-2xl border border-pink-100">{s.role}</span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-bold text-gray-600">{s.phone || "—"}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-xs font-bold text-gray-500">{s.shift}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button onClick={() => toggleStatus(s.id)} className={`text-[10px] font-black px-2.5 py-1 rounded-2xl border uppercase tracking-widest transition-all ${s.status === "active" ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"}`}>
                        {s.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-500 transition-all active:scale-95 border border-blue-100">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 text-red-500 transition-all active:scale-95 border border-red-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-50 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-black text-gray-950 text-lg">{editingId ? "Edit Staff" : "Add Staff Member"}</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">{editingId ? "Update details below." : "Fill in the information to add a new staff."}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {[["Name *", "name", "text", "e.g. Ramesh Kumar"], ["Phone", "phone", "tel", "e.g. 9800000000"]].map(([label, key, type, ph]) => (
                <div key={key}>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">{label}</label>
                  <input required={key === "name"} type={type} placeholder={ph} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-pink-500/40 focus:border-pink-300 transition-all" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Role *</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-pink-500/40 cursor-pointer">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Shift *</label>
                  <select value={form.shift} onChange={e => setForm({ ...form, shift: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-pink-500/40 cursor-pointer">
                    {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Salary (Rs.)</label>
                  <input type="number" min="0" placeholder="0" value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-pink-500/40 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Join Date</label>
                  <input type="date" value={form.joinDate} onChange={e => setForm({ ...form, joinDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-pink-500/40 transition-all" />
                </div>
              </div>
              {editingId && (
                <div>
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-pink-500/40 cursor-pointer">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-sm font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all active:scale-95">Cancel</button>
                <button type="submit" className="flex-1 py-3 text-sm font-black text-white bg-gray-950 hover:bg-black rounded-2xl shadow-lg transition-all active:scale-95">{editingId ? "Save Changes" : "Add Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
