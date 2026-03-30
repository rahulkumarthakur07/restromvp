import React, { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Users, X, Edit2 } from "lucide-react";

const STAFF_KEY = "resmvp_staff_members";
const SHIFTS_KEY = "resmvp_shifts_config";

const DEFAULT_SHIFTS = [
  { id: "morning", name: "Morning", time: "6:00 AM – 2:00 PM", color: "amber" },
  { id: "evening", name: "Evening", time: "2:00 PM – 10:00 PM", color: "blue" },
  { id: "night",   name: "Night",   time: "10:00 PM – 6:00 AM", color: "violet" },
  { id: "fullday", name: "Full Day", time: "8:00 AM – 8:00 PM", color: "emerald" },
];

const COLOR_MAP = {
  amber:   { bg: "bg-amber-50",   border: "border-amber-100",   text: "text-amber-600",   dot: "bg-amber-400" },
  blue:    { bg: "bg-blue-50",    border: "border-blue-100",    text: "text-blue-600",    dot: "bg-blue-400" },
  violet:  { bg: "bg-violet-50",  border: "border-violet-100",  text: "text-violet-600",  dot: "bg-violet-400" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600", dot: "bg-emerald-400" },
  pink:    { bg: "bg-pink-50",    border: "border-pink-100",    text: "text-pink-600",    dot: "bg-pink-400" },
  rose:    { bg: "bg-rose-50",    border: "border-rose-100",    text: "text-rose-600",    dot: "bg-rose-400" },
};

export default function Shifts() {
  const [staff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY)) || []; }
    catch { return []; }
  });

  const [shifts, setShifts] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SHIFTS_KEY)) || DEFAULT_SHIFTS; }
    catch { return DEFAULT_SHIFTS; }
  });

  const [showAddShift, setShowAddShift] = useState(false);
  const [newShift, setNewShift] = useState({ name: "", time: "", color: "pink" });

  useEffect(() => { localStorage.setItem(SHIFTS_KEY, JSON.stringify(shifts)); }, [shifts]);

  const assignedShiftOf = (staffMember) =>
    staffMember.shift
      ? shifts.find(sh => staffMember.shift.toLowerCase().includes(sh.name.toLowerCase()))?.id || null
      : null;

  const staffForShift = (shiftId) => {
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return [];
    return staff.filter(s => s.shift && s.shift.toLowerCase().includes(shift.name.toLowerCase()) && s.status === "active");
  };

  const addShift = (e) => {
    e.preventDefault();
    if (!newShift.name.trim() || !newShift.time.trim()) return;
    setShifts(prev => [...prev, { id: Date.now().toString(), ...newShift }]);
    setNewShift({ name: "", time: "", color: "pink" });
    setShowAddShift(false);
  };

  const deleteShift = (id) => {
    if (confirm("Delete this shift?")) setShifts(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-3">
              <Clock className="w-4 h-4" /><span>Shifts</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight leading-none mb-1">Shift Management</h1>
            <p className="text-gray-400 font-medium text-sm">View shifts and see who is assigned to each one.</p>
          </div>
          <button onClick={() => setShowAddShift(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gray-950 hover:bg-black text-white font-extrabold rounded-2xl shadow-lg transition-all active:scale-95 text-sm self-start">
            <Plus className="w-4 h-4" /> Add Shift
          </button>
        </div>
      </div>

      {/* Shift Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shifts.map((shift) => {
          const c = COLOR_MAP[shift.color] || COLOR_MAP.blue;
          const members = staffForShift(shift.id);
          return (
            <div key={shift.id} className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Shift Header */}
              <div className={`${c.bg} ${c.border} border-b p-5 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${c.dot} shadow-sm`} />
                  <div>
                    <h3 className={`font-black text-base ${c.text}`}>{shift.name}</h3>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">{shift.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest bg-white/70 px-2.5 py-1 rounded-xl border border-white tabular-nums">
                    {members.length} staff
                  </span>
                  {!DEFAULT_SHIFTS.find(d => d.id === shift.id) && (
                    <button onClick={() => deleteShift(shift.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-xl bg-white/70 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all border border-white">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Members */}
              <div className="p-4">
                {members.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-bold text-gray-300">No staff in this shift</p>
                    <p className="text-[11px] text-gray-300 font-medium">Assign shifts via All Staff page.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map(s => (
                      <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-pink-500 to-rose-400 flex items-center justify-center font-black text-white text-xs shadow-sm shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-gray-900 text-sm truncate">{s.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{s.role}</p>
                        </div>
                        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest tabular-nums">{s.phone || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Shift Modal */}
      {showAddShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-4xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-50">
              <div>
                <h2 className="font-black text-gray-950 text-lg">Create Shift</h2>
                <p className="text-xs text-gray-400 font-medium mt-0.5">Add a new shift time slot.</p>
              </div>
              <button onClick={() => setShowAddShift(false)} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={addShift} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Shift Name *</label>
                <input required type="text" placeholder="e.g. Afternoon" value={newShift.name} onChange={e => setNewShift({ ...newShift, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Time *</label>
                <input required type="text" placeholder="e.g. 1:00 PM – 9:00 PM" value={newShift.time} onChange={e => setNewShift({ ...newShift, time: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {Object.keys(COLOR_MAP).map(c => (
                    <button key={c} type="button" onClick={() => setNewShift({ ...newShift, color: c })}
                      className={`w-8 h-8 rounded-xl transition-all ${COLOR_MAP[c].dot} ${newShift.color === c ? "ring-2 ring-offset-2 ring-gray-950 scale-110" : "opacity-60 hover:opacity-100"}`} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAddShift(false)} className="flex-1 py-3 text-sm font-black text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all">Cancel</button>
                <button type="submit" className="flex-1 py-3 text-sm font-black text-white bg-gray-950 hover:bg-black rounded-2xl shadow-lg transition-all active:scale-95">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
