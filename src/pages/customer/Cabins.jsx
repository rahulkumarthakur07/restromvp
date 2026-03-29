import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft, Users, Hotel, CheckCircle2, X } from 'lucide-react';
import { decryptTableId } from '../../utils/crypto';
import { useDarkMode } from '../../hooks/useDarkMode';
import LoaderScreen from '../../components/LoaderScreen';

export default function Cabins() {
  const { tableId: urlTableId } = useParams();
  const tableId = decryptTableId(urlTableId);
  const navigate = useNavigate();
  const { isDark } = useDarkMode('dark');

  const [cabins, setCabins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [booking, setBooking] = useState(false);
  const [successId, setSuccessId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'cabins'), orderBy('name'));
    const unsub = onSnapshot(q, snap => {
      setCabins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleBook = async () => {
    if (!name.trim()) { alert('Please enter your name.'); return; }
    setBooking(true);
    try {
      await updateDoc(doc(db, 'cabins', bookingModal.id), {
        status: 'booked',
        bookedBy: name.trim(),
        bookingPhone: phone.trim(),
        bookedAt: serverTimestamp(),
        tableId: tableId,
      });
      setSuccessId(bookingModal.id);
      setBookingModal(null);
      setName('');
      setPhone('');
    } catch (e) {
      console.error(e);
      alert('Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} pb-24`}>
      <header className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} border-b px-4 py-4 flex items-center space-x-3 sticky top-0 z-10 shadow-sm`}>
        <button onClick={() => navigate(`/table/${urlTableId}`)} className={`p-2 -ml-2 rounded-full ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Hotel className="w-6 h-6 text-indigo-500" />
          <h1 className={`text-xl font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>Cabins & VIP Rooms</h1>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-4">
        {loading && <LoaderScreen message="Loading Cabins..." />}

        {!loading && cabins.length === 0 && (
          <div className={`text-center py-20 rounded-3xl border-2 border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
            <Hotel className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No cabins available right now.</p>
          </div>
        )}

        {cabins.map(cabin => (
          <div
            key={cabin.id}
            className={`rounded-3xl overflow-hidden shadow-sm border ${
              cabin.status === 'booked'
                ? isDark ? 'border-red-900 bg-gray-800' : 'border-red-100 bg-red-50/30'
                : isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
            }`}
          >
            {cabin.image && (
              <div className="relative">
                <img src={cabin.image} alt={cabin.name} className={`w-full h-44 object-cover ${cabin.status === 'booked' ? 'opacity-50 grayscale' : ''}`} />
                {cabin.status === 'booked' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-red-600 text-white font-black text-lg px-6 py-2 rounded-full shadow-lg -rotate-6">BOOKED</span>
                  </div>
                )}
                {successId === cabin.id && (
                  <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                    <CheckCircle2 className="w-16 h-16 text-white" />
                  </div>
                )}
              </div>
            )}

            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className={`text-lg font-black ${isDark ? 'text-white' : 'text-gray-800'}`}>{cabin.name}</h2>
                  {cabin.description && <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>{cabin.description}</p>}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-2 ${
                  cabin.status === 'booked'
                    ? 'bg-red-100 text-red-600'
                    : 'bg-green-100 text-green-700'
                }`}>
                  {cabin.status === 'booked' ? 'Booked' : 'Available'}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-3 mb-4">
                <span className={`font-black text-xl ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Rs. {cabin.price}</span>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>per session</span>
                {cabin.capacity && (
                  <span className={`flex items-center gap-1 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Users className="w-3.5 h-3.5" />
                    Up to {cabin.capacity}
                  </span>
                )}
              </div>

              {cabin.status === 'available' ? (
                <button
                  onClick={() => { setBookingModal(cabin); setSuccessId(null); }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-2xl shadow-md shadow-indigo-200 transition-all active:scale-95"
                >
                  Book This Cabin
                </button>
              ) : (
                <div className={`text-center py-3 rounded-2xl font-bold text-sm ${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                  Currently Unavailable
                </div>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-black text-gray-800">Book {bookingModal.name}</h2>
                <button onClick={() => setBookingModal(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-gray-600 font-bold text-lg mb-5">Rs. {bookingModal.price} / session</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Your name *"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={handleBook}
                disabled={booking || !name.trim()}
                className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50"
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
