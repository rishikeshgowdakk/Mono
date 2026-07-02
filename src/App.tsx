import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Room from './components/Room';
import { motion } from 'framer-motion';
import { Share2, ArrowRight, Zap } from 'lucide-react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

function Landing() {
  const [code, setCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/${code.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center font-sans p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl shadow-blue-100/50 border border-gray-100"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-blue-200 rotate-3 hover:rotate-0 transition-transform duration-500">
            <Share2 className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">Mono</h1>
          <p className="text-gray-400 text-sm font-medium">Real-time collaborative pad. No login required.</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="relative group">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter room code..."
              className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl px-6 py-4 text-center text-xl font-bold outline-none transition-all placeholder:text-gray-300"
              autoFocus
            />
            <div className="absolute inset-0 rounded-2xl pointer-events-none group-focus-within:ring-4 ring-blue-100 transition-all" />
          </div>

          <button
            type="submit"
            disabled={!code.trim()}
            className="w-full py-4 bg-black text-white rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-gray-200 hover:shadow-blue-200 disabled:opacity-50 disabled:hover:bg-black flex items-center justify-center gap-2 group active:scale-95"
          >
            Enter Pad
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Sign in anonymously to ensure we have auth for Storage/Firestore
    signInAnonymously(auth).then((user) => {
      console.log("Anonymous Sign-in Success:", user.user.uid);
    }).catch(err => {
      console.error("Anonymous Sign-in Error:", err);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/:roomId" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
