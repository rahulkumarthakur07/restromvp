import React, { useState, useEffect, useMemo } from "react";
import { CalendarCheck, CheckCircle, XCircle, Clock, Users, History, ChevronDown, ChevronUp } from "lucide-react";

const STAFF_KEY = "resmvp_staff_members";
const ATTENDANCE_KEY = "resmvp_attendance";

export default function Attendance() {
  const [staff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY)) || []; }
    catch { return []; }
  });

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendance, setAttendance] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || {}; }
    catch { return {}; }
  });
  const [expandedStaff, setExpandedStaff] = useState(null);

  useEffect(() => { localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(attendance)); }, [attendance]);

  const todayRecords = useMemo(() => attendance[date] || {}, [attendance, date]);

  const setStatus = (staffId, status) => {
    setAttendance(prev => ({
      ...prev,
      [date]: { ...prev[date], [staffId]: status },
    }));
  };

  const presentCount = Object.values(todayRecords).filter(v => v === "present").length;
  const absentCount = Object.values(todayRecords).filter(v => v === "absent").length;
  const leaveCount = Object.values(todayRecords).filter(v => v === "leave").length;
  const unmarkedCount = staff.filter(s => !todayRecords[s.id]).length;

  const activeStaff = staff.filter(s => s.status === "active");

  // Get history for a specific staff member across all dates
  const getStaffHistory = (staffId) => {
    const records = [];
    Object.entries(attendance).forEach(([d, log]) => {
      if (log[staffId]) {
        records.push({ date: d, status: log[staffId] });
      }
    });
    return records.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30); // Last 30 records
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-5 pb-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-cyan-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center space-x-2 bg-cyan-50 text-cyan-600 px-5 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-widest mb-3">
              <CalendarCheck className="w-4 h-4" /><span>Attendance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight leading-none mb-1">Attendance Tracker</h1>
            <p className="text-gray-400 font-medium text-sm">Mark and review daily attendance for your team.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Select Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-extrabold text-gray-800 outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all" />
          </div>
        </div>

        {/* Summary */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Present", count: presentCount, color: "emerald" },
            { label: "Absent", count: absentCount, color: "red" },
            { label: "Leave", count: leaveCount, color: "amber" },
            { label: "Unmarked", count: unmarkedCount, color: "gray" },
          ].map(({ label, count, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-3xl px-4 py-3`}>
              <span className={`text-[10px] font-extrabold text-${color}-500 uppercase tracking-widest mb-1 block`}>{label}</span>
              <span className={`text-xl font-extrabold text-${color}-700 tabular-nums`}>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-4xl border border-gray-100 shadow-sm overflow-hidden">
        {activeStaff.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mb-5"><Users className="w-10 h-10 text-gray-200" /></div>
            <p className="font-extrabold text-gray-300 text-xl mb-1">No active staff</p>
            <p className="text-gray-300 font-medium text-sm">Add staff members first from the All Staff section.</p>
          </div>
        ) : (
          <div>
            <div className="p-4 border-b border-gray-50 bg-gray-50/40 flex items-center justify-between">
              <h2 className="font-extrabold text-gray-950 text-sm uppercase tracking-widest">Staff List</h2>
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest tabular-nums">
                {new Date(date).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {activeStaff.map(s => {
                const status = todayRecords[s.id] || null;
                const isExpanded = expandedStaff === s.id;
                const staffHistory = isExpanded ? getStaffHistory(s.id) : [];

                return (
                  <div key={s.id} className="flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50/60 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-pink-500 to-rose-400 flex items-center justify-center font-extrabold text-white text-sm shadow-sm shrink-0">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-gray-900 text-sm">{s.name}</p>
                            <button 
                              onClick={() => setExpandedStaff(isExpanded ? null : s.id)}
                              className={`p-1 rounded-lg transition-all ${isExpanded ? "bg-cyan-100 text-cyan-600" : "bg-gray-100 text-gray-400 hover:text-gray-600"}`}
                              title="Show History"
                            >
                              <History className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-400 font-medium">{s.role} · {s.shift}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {[
                          { key: "present", label: "P", activeClass: "bg-emerald-500 text-white border-emerald-400 shadow-emerald-500/30" },
                          { key: "absent", label: "A", activeClass: "bg-red-500 text-white border-red-400 shadow-red-500/30" },
                          { key: "leave", label: "L", activeClass: "bg-amber-500 text-white border-amber-400 shadow-amber-500/30" },
                        ].map(({ key, label, activeClass }) => (
                          <button key={key} onClick={() => setStatus(s.id, status === key ? null : key)}
                            className={`w-9 h-9 rounded-xl font-extrabold text-xs border transition-all active:scale-95 shadow-sm ${
                              status === key ? `${activeClass} shadow-lg` : "bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100"
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expandable History View */}
                    {isExpanded && (
                      <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                        <div className="bg-gray-50 rounded-3xl border border-gray-100 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                              <History className="w-3 h-3" /> Recent History (Last 30 days)
                            </h3>
                            <button onClick={() => setExpandedStaff(null)} className="text-[10px] font-extrabold text-cyan-600 hover:underline">Hide</button>
                          </div>
                          {staffHistory.length === 0 ? (
                            <p className="text-xs text-gray-400 font-medium italic text-center py-2">No past records found for this member.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {staffHistory.map(h => (
                                <div key={h.date} className="flex flex-col items-center bg-white border border-gray-100 rounded-xl px-2.5 py-1.5 shadow-sm min-w-[65px]">
                                  <span className="text-[9px] font-extrabold text-gray-400 tabular-nums">
                                    {new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                                  </span>
                                  <span className={`text-[10px] font-black uppercase mt-0.5 ${
                                    h.status === "present" ? "text-emerald-500" : h.status === "absent" ? "text-red-500" : "text-amber-500"
                                  }`}>
                                    {h.status === "present" ? "PRES" : h.status === "absent" ? "ABS" : "LEAV"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
