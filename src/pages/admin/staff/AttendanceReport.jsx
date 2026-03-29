import React, { useState, useEffect, useMemo } from "react";
import { 
  Calendar, CheckCircle, XCircle, Clock, Users, 
  ChevronLeft, ChevronRight, BarChart3, AlertTriangle, 
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

const STAFF_KEY = "resmvp_staff_members";
const ATTENDANCE_KEY = "resmvp_attendance";

const RANGES = [
  { id: "30d", label: "Last 30 Days", months: 1 },
  { id: "90d", label: "Last 90 Days", months: 3 },
  { id: "6m",  label: "6 Months",     months: 6 },
  { id: "1y",  label: "1 Year",       months: 12 },
  { id: "all", label: "Lifetime",     months: -1 },
];

export default function AttendanceReport() {
  const [staff] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STAFF_KEY)) || []; }
    catch { return []; }
  });

  const [attendance] = useState(() => {
    try { return JSON.parse(localStorage.getItem(ATTENDANCE_KEY)) || {}; }
    catch { return {}; }
  });

  const [selectedStaffId, setSelectedStaffId] = useState(() => staff[0]?.id || "");
  const [range, setRange] = useState("30d");
  const [page, setPage] = useState(0); // For paginating through chunks of months

  // Calculate the months to display based on range and pagination
  const monthsToDisplay = useMemo(() => {
    const activeRange = RANGES.find(r => r.id === range);
    const now = new Date();
    const months = [];
    
    let count = activeRange.months;
    if (count === -1) {
      // Lifetime: find the earliest record
      const dates = Object.keys(attendance).sort();
      if (dates.length > 0) {
        const earliest = new Date(dates[0]);
        count = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1;
      } else {
        count = 1;
      }
    }

    // Paginate: show 6 months at a time (2 rows of 3) if range > 1
    const monthsPerPage = range === "30d" ? 1 : 6;
    const startIdx = page * monthsPerPage;
    const endIdx = Math.min(startIdx + monthsPerPage, count);

    for (let i = startIdx; i < endIdx; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        year: d.getFullYear(),
        month: d.getMonth(),
        name: d.toLocaleString("en-IN", { month: "long" }),
      });
    }
    return months;
  }, [range, page, attendance]);

  const maxPages = useMemo(() => {
    const activeRange = RANGES.find(r => r.id === range);
    let count = activeRange.months;
    if (count === -1) {
      const dates = Object.keys(attendance).sort();
      if (dates.length > 0) {
        const now = new Date();
        const earliest = new Date(dates[0]);
        count = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth()) + 1;
      } else {
        count = 1;
      }
    }
    const monthsPerPage = range === "30d" ? 1 : 6;
    return Math.ceil(count / monthsPerPage);
  }, [range, attendance]);

  const stats = useMemo(() => {
    if (!selectedStaffId) return { present: 0, absent: 0, leave: 0 };
    let p = 0, a = 0, l = 0;
    
    // We count over the entire range, not just current page
    const activeRange = RANGES.find(r => r.id === range);
    const now = new Date();
    const startDate = new Date();
    if (activeRange.id === "30d") startDate.setDate(now.getDate() - 30);
    else if (activeRange.id === "90d") startDate.setDate(now.getDate() - 90);
    else if (activeRange.id === "6m") startDate.setMonth(now.getMonth() - 6);
    else if (activeRange.id === "1y") startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setFullYear(1970); // Lifetime

    Object.entries(attendance).forEach(([dateStr, log]) => {
      const d = new Date(dateStr);
      if (d >= startDate && d <= now) {
        const s = log[selectedStaffId];
        if (s === "present") p++;
        else if (s === "absent") a++;
        else if (s === "leave") l++;
      }
    });

    return { present: p, absent: a, leave: l };
  }, [selectedStaffId, range, attendance]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 pb-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-cyan-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
             <Link to="/admin/staff/attendance" className="p-2.5 rounded-2xl bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-100 mt-1">
                <ArrowLeft className="w-5 h-5" />
             </Link>
             <div>
               <div className="inline-flex items-center space-x-2 bg-cyan-50 text-cyan-600 px-5 py-2 rounded-2xl text-xs font-extrabold uppercase tracking-widest mb-3">
                 <BarChart3 className="w-4 h-4" /><span>Attendance Insights</span>
               </div>
               <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 tracking-tight leading-none mb-1">Attendance Detailed Report</h1>
               <p className="text-gray-400 font-medium text-sm">Visual tracking and performance metrics for your team.</p>
             </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3">
             <div className="flex flex-col gap-1.5 min-w-[220px]">
               <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">Select Staff Member</label>
               <select 
                 value={selectedStaffId} 
                 onChange={e => { setSelectedStaffId(e.target.value); setPage(0); }}
                 className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-extrabold text-gray-800 outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all appearance-none cursor-pointer"
               >
                 {staff.map(s => (
                   <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        {/* Range Selector */}
        <div className="relative flex flex-wrap gap-2 mt-8">
          {RANGES.map(r => (
            <button 
              key={r.id} 
              onClick={() => { setRange(r.id); setPage(0); }}
              className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all border ${
                range === r.id 
                  ? "bg-gray-950 text-white border-gray-950 shadow-lg shadow-black/10" 
                  : "bg-white text-gray-500 border-gray-100 hover:bg-gray-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="relative grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-50">
           <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-4">
              <span className="text-[9px] font-extrabold text-emerald-500 uppercase tracking-widest block mb-1">Total Present</span>
              <span className="text-2xl font-extrabold text-emerald-700 tabular-nums">{stats.present} <span className="text-xs font-bold text-emerald-400">days</span></span>
           </div>
           <div className="bg-red-50 border border-red-100 rounded-3xl p-4">
              <span className="text-[9px] font-extrabold text-red-500 uppercase tracking-widest block mb-1">Total Absent</span>
              <span className="text-2xl font-extrabold text-red-700 tabular-nums">{stats.absent} <span className="text-xs font-bold text-red-400">days</span></span>
           </div>
           <div className="bg-amber-50 border border-amber-100 rounded-3xl p-4">
              <span className="text-[9px] font-extrabold text-amber-500 uppercase tracking-widest block mb-1">Total Leave</span>
              <span className="text-2xl font-extrabold text-amber-700 tabular-nums">{stats.leave} <span className="text-xs font-bold text-amber-400">days</span></span>
           </div>
        </div>
      </div>

      {/* Calendar Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {monthsToDisplay.map((m) => {
          const daysInMonth = getDaysInMonth(m.year, m.month);
          const firstDay = getFirstDayOfMonth(m.year, m.month);
          const today = new Date();
          const todayStr = today.toISOString().split("T")[0];

          return (
            <div key={`${m.year}-${m.month}`} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-6 overflow-hidden flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-5 px-1 border-b border-gray-50 pb-3">
                 <h2 className="text-base font-extrabold text-gray-950 tracking-tight">
                   {m.name} <span className="text-gray-300 ml-0.5">{m.year}</span>
                 </h2>
                 <div className="flex gap-2.5">
                    <div title="Present" className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/20" />
                    <div title="Absent" className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/20" />
                    <div title="Leave" className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/20" />
                 </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <div key={`${day}-${idx}`} className="text-center text-[9px] font-extrabold text-gray-300 uppercase tracking-widest mb-1.5">{day}</div>
                ))}
                
                {/* Empty slots for month start */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${m.year}-${String(m.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const status = attendance[dateStr]?.[selectedStaffId];
                  const isFuture = new Date(dateStr) > today;
                  const isToday = dateStr === todayStr;

                  let bgColor = "bg-white";
                  let borderColor = "border-gray-50";
                  let textColor = "text-gray-400";

                  if (status === "present") {
                    bgColor = "bg-emerald-500";
                    borderColor = "border-emerald-600 shadow-md shadow-emerald-500/10";
                    textColor = "text-white";
                  } else if (status === "absent") {
                    bgColor = "bg-red-500";
                    borderColor = "border-red-600 shadow-md shadow-red-500/10";
                    textColor = "text-white";
                  } else if (status === "leave") {
                    bgColor = "bg-amber-500";
                    borderColor = "border-amber-600 shadow-md shadow-amber-500/10";
                    textColor = "text-white";
                  } else if (isFuture) {
                    borderColor = "border-gray-50 border-dashed opacity-40";
                  } else if (isToday) {
                    borderColor = "border-cyan-500 bg-cyan-50/20";
                    textColor = "text-cyan-600";
                  }

                  return (
                    <div 
                      key={day} 
                      className={`relative w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 flex items-center justify-center rounded-[1.25rem] border-2 transition-all duration-300 ${bgColor} ${borderColor} ${textColor}`}
                      title={`${dateStr}: ${status || (isFuture ? "Upcoming" : "No Record")}`}
                    >
                      <span className="text-sm font-extrabold tabular-nums">{day}</span>
                      {isToday && status === undefined && (
                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {maxPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-8">
           <button 
             disabled={page >= maxPages - 1} 
             onClick={() => setPage(p => p + 1)}
             className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
           >
             <ChevronLeft className="w-5 h-5" />
           </button>
           <div className="px-6 py-2.5 bg-white border border-gray-100 rounded-2xl">
             <span className="text-xs font-extrabold text-gray-900">Page {page + 1} <span className="text-gray-300">of {maxPages}</span></span>
           </div>
           <button 
             disabled={page === 0} 
             onClick={() => setPage(p => p - 1)}
             className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:pointer-events-none transition-all"
           >
             <ChevronRight className="w-5 h-5" />
           </button>
        </div>
      )}
    </div>
  );
}
