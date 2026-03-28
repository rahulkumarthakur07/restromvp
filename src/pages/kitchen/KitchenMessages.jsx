import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, onSnapshot, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { MessageSquare, Send } from 'lucide-react';

export default function KitchenMessages() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const staffName = localStorage.getItem('resmvp_waiter_name') || 'Kitchen Staff';

  useEffect(() => {
    const q = query(collection(db, 'kitchenMessages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'kitchenMessages'), {
        text: text.trim(),
        sender: staffName,
        from: 'kitchen',
        timestamp: serverTimestamp(),
        resolved: false,
      });
      setText('');
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <MessageSquare className="w-7 h-7 text-orange-600" />
          Message Admin
        </h1>
        <p className="text-gray-500 font-medium text-sm mt-0.5">Send a message to the admin/manager.</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 min-h-0" style={{minHeight: '300px', maxHeight: '500px'}}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30" />
            <p className="font-medium text-sm">No messages yet. Send one below!</p>
          </div>
        )}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'kitchen' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
              msg.from === 'kitchen'
                ? 'bg-orange-500 text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            }`}>
              <p className="text-xs font-bold opacity-70 mb-0.5">{msg.sender}</p>
              <p className="text-sm font-medium">{msg.text}</p>
              {msg.resolved && (
                <p className="text-xs opacity-60 mt-1">✓ Seen by Admin</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type your message to admin..."
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 shadow-sm"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
