import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Trash2, Plus, RotateCw, Settings, X, Trophy, Moon, Sun, Languages, Volume2, VolumeX, History, List as ListIcon, Save, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Howl, Howler } from 'howler';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { translations } from './i18n';

// --- Sound Effects ---
const spinSound = new Howl({ src: ['https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg'], volume: 0.2 });
const winSound = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/success_bell.ogg'], volume: 0.5 });
const removeSound = new Howl({ src: ['https://actions.google.com/sounds/v1/cartoon/pop.ogg'], volume: 0.3 });

// --- Constants & Helpers ---
const COLORS = [
  '#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93',
  '#FF924C', '#52A675', '#3E5C76', '#E07A5F', '#3D405B',
  '#F94144', '#F3722C', '#F8961E', '#F9844A', '#F9C74F',
  '#90BE6D', '#43AA8B', '#4D908E', '#577590', '#277DA1'
];
const DEFAULT_NAMES = ['Anita', 'Budi', 'Lara', 'Karim', 'Surya', 'Mega', 'Cakra', 'Sri'];

type AppTab = 'wheel' | 'list' | 'settings' | 'history';

export default function App() {
  // Saved Lists
  const [savedLists, setSavedLists] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('savedLists');
    return saved ? JSON.parse(saved) : { Default: DEFAULT_NAMES };
  });
  const [currentListName, setCurrentListName] = useState(() => localStorage.getItem('currentListName') || 'Default');

  // Main State
  const [names, setNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('names');
    return saved ? JSON.parse(saved) : DEFAULT_NAMES;
  });
  const [history, setHistory] = useState<{name: string, time: number}[]>(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [winCounts, setWinCounts] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('winCounts');
    return saved ? JSON.parse(saved) : {};
  });

  // Settings
  const [spinMode, setSpinMode] = useState<'drag' | 'button' | 'auto'>(() => (localStorage.getItem('spinMode') as any) || 'button');
  const [lang, setLang] = useState<'id' | 'en'>(() => (localStorage.getItem('lang') as any) || 'id');
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode') || 'false'));
  const [sensitivity, setSensitivity] = useState(() => parseFloat(localStorage.getItem('sensitivity') || '1'));
  const [isMuted, setIsMuted] = useState(() => JSON.parse(localStorage.getItem('isMuted') || 'false'));
  const [autoRemove, setAutoRemove] = useState(() => JSON.parse(localStorage.getItem('autoRemove') || 'false'));
  
  // UI State
  const [newName, setNewName] = useState('');
  const [bulkNames, setBulkNames] = useState('');
  const [newListName, setNewListName] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTab>('wheel');

  const t = translations[lang];

  // Apply Volume
  useEffect(() => {
    Howler.mute(isMuted);
    localStorage.setItem('isMuted', JSON.stringify(isMuted));
  }, [isMuted]);

  // Persistence
  useEffect(() => { localStorage.setItem('names', JSON.stringify(names)); }, [names]);
  useEffect(() => { localStorage.setItem('history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('winCounts', JSON.stringify(winCounts)); }, [winCounts]);
  useEffect(() => { localStorage.setItem('spinMode', spinMode); }, [spinMode]);
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('sensitivity', sensitivity.toString()); }, [sensitivity]);
  useEffect(() => { localStorage.setItem('savedLists', JSON.stringify(savedLists)); }, [savedLists]);
  useEffect(() => { localStorage.setItem('currentListName', currentListName); }, [currentListName]);
  useEffect(() => { localStorage.setItem('autoRemove', JSON.stringify(autoRemove)); }, [autoRemove]);

  useEffect(() => {
    document.title = "Random Wheel Picker";
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const wheelRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const lastWinnerRef = useRef<string | null>(null);
  
  const physics = useRef({ angle: 0, velocity: 0, friction: 0.99, isDragging: false, lastMouseAngle: 0, lastTime: 0 });

  // --- Wheel Drawing ---
  const drawWheel = useCallback(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, width, height);

    if (names.length === 0) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = darkMode ? '#fff' : '#333';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillText(t.noNames, centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / names.length;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(physics.current.angle);
    ctx.translate(-centerX, -centerY);

    for (let i = 0; i < names.length; i++) {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, i * sliceAngle - Math.PI / 2, (i + 1) * sliceAngle - Math.PI / 2);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = darkMode ? '#1a1b26' : '#ffffff';
      ctx.stroke();

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(i * sliceAngle + sliceAngle / 2 - Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      
      const fontSize = Math.max(12, Math.min(28, 180 / names.length));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.fillText(names[i].length > 18 ? names[i].substring(0, 16) + '...' : names[i], radius - 25, 0);
      ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = darkMode ? '#4b5563' : '#e5e7eb';
    ctx.stroke();
    ctx.restore();
  }, [names, darkMode, t.noNames]);

  const updatePhysics = useCallback(() => {
    if (!physics.current.isDragging) {
      physics.current.angle += physics.current.velocity;
      physics.current.velocity *= physics.current.friction; 

      if (Math.abs(physics.current.velocity) < 0.0015 && physics.current.velocity !== 0) {
        physics.current.velocity = 0;
        setIsSpinning(false);
        spinSound.stop();
        winSound.play();
        
        if (names.length > 0) {
          const sliceAngle = (2 * Math.PI) / names.length;
          let normalizedAngle = (-physics.current.angle) % (2 * Math.PI);
          if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
          const winnerIndex = Math.floor(normalizedAngle / sliceAngle);
          
          const wonName = names[winnerIndex];
          setWinner(wonName);
          lastWinnerRef.current = wonName;
          
          setWinCounts(prev => ({ ...prev, [wonName]: (prev[wonName] || 0) + 1 }));
          setHistory(prev => [{name: wonName, time: Date.now()}, ...prev].slice(0, 50));
          
          confetti({
            particleCount: 200,
            spread: 90,
            origin: { y: 0.5 },
            colors: ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93']
          });

          if (autoRemove) {
             setTimeout(() => {
                 setNames(prev => prev.filter(n => n !== wonName));
             }, 3000);
          }
        }
      }
    }
    drawWheel();
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, [names, drawWheel, autoRemove]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [updatePhysics]);

  // --- Interaction Handlers ---
  const getMouseAngle = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = wheelRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = clientX - rect.left - canvas.width / 2;
    const y = clientY - rect.top - canvas.height / 2;
    return Math.atan2(y, x);
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (names.length === 0 || winner) return;
    physics.current.isDragging = true;
    physics.current.velocity = 0;
    physics.current.lastMouseAngle = getMouseAngle(e);
    physics.current.lastTime = performance.now();
    setIsSpinning(false);
    spinSound.stop();
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!physics.current.isDragging) return;
    const currentAngle = getMouseAngle(e);
    let deltaAngle = currentAngle - physics.current.lastMouseAngle;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    physics.current.angle += deltaAngle * sensitivity;
    
    const now = performance.now();
    const dt = now - physics.current.lastTime;
    if (dt > 0) physics.current.velocity = (deltaAngle / dt) * 16 * sensitivity;
    
    physics.current.lastMouseAngle = currentAngle;
    physics.current.lastTime = now;
  };

  const handlePointerUp = () => {
    if (!physics.current.isDragging) return;
    physics.current.isDragging = false;
    if (Math.abs(physics.current.velocity) > 0.05) {
      setIsSpinning(true);
      spinSound.play();
    }
  };

  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const preventDefault = (e: TouchEvent) => { if (physics.current.isDragging) e.preventDefault(); };
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    return () => canvas.removeEventListener('touchmove', preventDefault);
  }, []);

  const spinProgrammatically = useCallback(() => {
    if (names.length === 0 || isSpinning) return;
    setWinner(null);
    setIsSpinning(true);
    spinSound.play();
    
    const predictWinner = (v0: number, f: number, currentAngle: number, numNames: number) => {
      let v = v0;
      let angle = currentAngle;
      while (v >= 0.0015) { angle += v; v *= f; }
      const sliceAngle = (2 * Math.PI) / numNames;
      let normalizedAngle = (-angle) % (2 * Math.PI);
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
      return Math.floor(normalizedAngle / sliceAngle);
    };

    let v0 = Math.random() * 0.5 + 0.4;
    let f = 0.985 + Math.random() * 0.01;

    if (names.length > 1) {
      let attempts = 0;
      let predictedIndex = predictWinner(v0, f, physics.current.angle, names.length);
      const currentWinCounts = names.map(n => winCounts[n] || 0);
      const avgWins = currentWinCounts.reduce((a, b) => a + b, 0) / names.length;
      
      while (attempts < 15) {
        const predictedName = names[predictedIndex];
        const isLastWinner = predictedName === lastWinnerRef.current;
        const isOverWinner = (winCounts[predictedName] || 0) > avgWins + 1.5;
        if (isLastWinner || isOverWinner) {
          v0 = Math.random() * 0.5 + 0.4;
          f = 0.985 + Math.random() * 0.01;
          predictedIndex = predictWinner(v0, f, physics.current.angle, names.length);
          attempts++;
        } else break;
      }
    }
    physics.current.velocity = v0;
    physics.current.friction = f;
  }, [names, isSpinning, winCounts]);

  useEffect(() => {
    if (spinMode === 'auto' && winner) {
      const timer = setTimeout(() => { setWinner(null); spinProgrammatically(); }, 3500);
      return () => clearTimeout(timer);
    }
  }, [winner, spinMode, spinProgrammatically]);

  useEffect(() => {
    document.body.style.overflow = winner ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [winner]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeTab === 'wheel') {
        e.preventDefault();
        if (!isSpinning && names.length > 0) spinProgrammatically();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, names.length, spinProgrammatically, activeTab]);

  // --- Helpers ---
  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) { setNames([...names, newName.trim()]); setNewName(''); }
  };
  const handleBulkAdd = () => {
    const newNamesList = bulkNames.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (newNamesList.length > 0) { setNames([...names, ...newNamesList]); setBulkNames(''); }
  };
  const saveCurrentList = () => {
    if (newListName.trim()) {
      setSavedLists(prev => ({ ...prev, [newListName.trim()]: names }));
      setCurrentListName(newListName.trim());
      setNewListName('');
    }
  };
  const loadList = (listName: string) => {
    if (savedLists[listName]) {
      setNames(savedLists[listName]);
      setCurrentListName(listName);
    }
  };
  const deleteList = (listName: string) => {
    const newLists = { ...savedLists };
    delete newLists[listName];
    setSavedLists(newLists);
    if (currentListName === listName) setCurrentListName('');
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row transition-colors duration-300",
      darkMode ? "bg-slate-950 text-slate-100" : "bg-zinc-50 text-slate-900"
    )}>
      
      {/* Sidebar for Desktop / Hidden on Mobile */}
      <aside className={cn(
        "hidden md:flex flex-col w-[350px] lg:w-[400px] shrink-0 border-r transition-colors shadow-2xl z-20 h-screen overflow-y-auto custom-scrollbar",
        darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-zinc-200"
      )}>
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-6">
            <img src="https://cdn-icons-png.flaticon.com/512/1041/1041935.png" alt="Logo" className="w-10 h-10 drop-shadow-md" referrerPolicy="no-referrer" />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Random Wheel</h1>
          </div>
          <div className="flex border-b border-inherit mb-6">
            <button onClick={() => setActiveTab('list')} className={cn("flex-1 pb-3 text-sm font-semibold transition-colors border-b-2", activeTab === 'list' || activeTab === 'wheel' ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300")}>{t.names} ({names.length})</button>
            <button onClick={() => setActiveTab('history')} className={cn("flex-1 pb-3 text-sm font-semibold transition-colors border-b-2", activeTab === 'history' ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300")}>History</button>
            <button onClick={() => setActiveTab('settings')} className={cn("flex-1 pb-3 text-sm font-semibold transition-colors border-b-2", activeTab === 'settings' ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300")}>Settings</button>
          </div>
        </div>

        <div className="px-6 pb-6 flex-1">
          {/* List Tab */}
          {(activeTab === 'list' || activeTab === 'wheel') && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6">
              <div className="space-y-3">
                <form onSubmit={handleAddName} className="flex gap-2">
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.addName} className={cn("flex-1 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-zinc-300 text-slate-900")} disabled={isSpinning} />
                  <button type="submit" disabled={!newName.trim() || isSpinning} className="bg-blue-600 text-white p-2 px-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"><Plus className="w-5 h-5" /></button>
                </form>
                <div className="relative">
                  <textarea value={bulkNames} onChange={e => setBulkNames(e.target.value)} placeholder={t.pasteNames} className={cn("w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none transition-colors mb-0", darkMode ? "bg-slate-800 border-slate-700 text-white" : "bg-white border-zinc-300 text-slate-900")} disabled={isSpinning} />
                  {bulkNames.trim() && <button onClick={handleBulkAdd} className="absolute bottom-3 right-3 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition">{t.addAll}</button>}
                </div>
              </div>

              <div className="flex flex-col border border-inherit rounded-xl overflow-hidden shadow-sm">
                <div className={cn("flex justify-between items-center px-4 py-3 bg-opacity-50 border-b border-inherit", darkMode ? "bg-slate-800" : "bg-zinc-100")}>
                  <span className="font-semibold text-sm">Current List: {currentListName || 'Unsaved'}</span>
                  {names.length > 0 && <button onClick={() => { setNames([]); setWinCounts({}); }} disabled={isSpinning} className="text-xs font-semibold text-red-500 hover:text-red-700">{t.clearAll}</button>}
                </div>
                <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                  {names.length === 0 ? <p className="text-center text-sm py-6 opacity-50">{t.noNames}</p> : names.map((name, i) => (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} key={`${name}-${i}`} className={cn("flex justify-between items-center px-3 py-2 rounded-lg group transition-colors", darkMode ? "hover:bg-slate-800" : "hover:bg-zinc-100")}>
                      <span className="truncate pr-3 text-sm font-medium">{name}</span>
                      <button onClick={() => { removeSound.play(); setNames(names.filter((_, idx) => idx !== i)); }} disabled={isSpinning} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"><X className="w-4 h-4" /></button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Recent Winners</h3>
                {history.length > 0 && <button onClick={() => setHistory([])} className="text-xs font-semibold text-red-500 hover:text-red-700">Clear</button>}
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {history.length === 0 ? <p className="text-sm opacity-50 py-4">No winners yet.</p> : history.map((item, i) => (
                  <div key={i} className={cn("flex justify-between items-center px-4 py-3 rounded-xl", darkMode ? "bg-slate-800" : "bg-white border shadow-sm")}>
                    <div className="flex items-center gap-3"><Trophy className="w-4 h-4 text-yellow-500" /><span className="font-bold">{item.name}</span></div>
                    <span className="text-xs opacity-50">{new Date(item.time).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-8">
              <section>
                <h3 className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-4">Wheel Config</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Spin Method</label>
                    <div className={cn("flex rounded-lg p-1", darkMode ? "bg-slate-800" : "bg-slate-200")}>
                      {['button', 'drag', 'auto'].map(mode => (
                        <button key={mode} onClick={() => setSpinMode(mode as any)} className={cn("flex-1 py-1.5 text-sm font-medium rounded-md transition-colors", spinMode === mode ? (darkMode ? "bg-slate-950 text-white shadow" : "bg-white text-blue-600 shadow-sm") : "text-slate-500 hover:text-slate-700")}>
                          {mode === 'button' ? t.buttonSpin : mode === 'drag' ? t.dragSpin : t.autoSpin}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-sm font-medium">Touch Sensitivity</label>
                       <span className="text-xs opacity-50">{sensitivity.toFixed(1)}x</span>
                    </div>
                    <input type="range" min="0.5" max="2" step="0.1" value={sensitivity} onChange={e => setSensitivity(parseFloat(e.target.value))} className="w-full accent-blue-600" />
                  </div>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm font-medium">Auto-remove winner</span>
                    <input type="checkbox" checked={autoRemove} onChange={e => setAutoRemove(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold opacity-60 uppercase tracking-wider mb-4">Saved Lists</h3>
                <div className="flex gap-2 border-b border-inherit pb-4 mb-4">
                  <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="New list name..." className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-zinc-300")} />
                  <button onClick={saveCurrentList} disabled={!newListName.trim()} className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-slate-700 disabled:opacity-50"><Save className="w-4 h-4" /> Save</button>
                </div>
                <div className="space-y-2">
                  {Object.keys(savedLists).length === 0 ? <p className="text-sm opacity-50">No saved lists.</p> : Object.entries(savedLists).map(([name, list]) => (
                    <div key={name} className={cn("flex items-center justify-between px-3 py-2 rounded-lg", darkMode ? "bg-slate-800" : "bg-white border shadow-sm", currentListName === name ? "border-l-4 border-l-blue-500" : "")}>
                      <div><p className="font-medium text-sm">{name}</p><p className="text-xs opacity-50">{list.length} names</p></div>
                      <div className="flex gap-2">
                        <button onClick={() => loadList(name)} className="text-blue-500 bg-blue-500/10 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-500/20">Load</button>
                        <button onClick={() => deleteList(name)} className="text-red-500 bg-red-500/10 p-1 rounded hover:bg-red-500/20"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}
        </div>
        
        {/* Footer info */}
        <div className="p-6 text-center text-xs opacity-40 mt-auto">
          Built by <a href="https://mka.my.id" target="_blank" rel="noreferrer" className="underline hover:opacity-100">mka.my.id</a>
        </div>
      </aside>

      {/* Main Wheel Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative p-4 pb-24 md:pb-4 overflow-hidden">
        {/* Top Floating Actions (Desktop & Mobile) */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-2 z-10">
           <button onClick={() => setIsMuted(!isMuted)} className={cn("w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-105", darkMode ? "bg-slate-800/80 text-white hover:bg-slate-700" : "bg-white/80 text-slate-800 hover:bg-white")}>
              {isMuted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
           </button>
           <button onClick={() => setLang(lang === 'id' ? 'en' : 'id')} className={cn("w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-105", darkMode ? "bg-slate-800/80 text-white hover:bg-slate-700" : "bg-white/80 text-slate-800 hover:bg-white")}>
              <Languages className="w-5 h-5" />
           </button>
           <button onClick={() => setDarkMode(!darkMode)} className={cn("w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-105", darkMode ? "bg-slate-800/80 text-white hover:bg-slate-700" : "bg-white/80 text-slate-800 hover:bg-white")}>
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
           </button>
        </div>

        {/* Brand Mobile */}
        <div className="md:hidden flex flex-col items-center gap-2 mb-8 mt-4 pt-12">
           <img src="https://cdn-icons-png.flaticon.com/512/1041/1041935.png" alt="Logo" className="w-12 h-12 drop-shadow-lg" referrerPolicy="no-referrer" />
           <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Random Wheel Picker</h1>
        </div>

        {/* Mobile View Switcher */}
        <div className="md:hidden w-full max-w-lg mb-8">
           {activeTab !== 'wheel' && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("p-6 rounded-3xl shadow-xl", darkMode ? "bg-slate-900 border border-slate-800" : "bg-white border border-zinc-200")}>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold capitalize">{activeTab}</h2>
                 <button onClick={() => setActiveTab('wheel')} className="bg-blue-100 text-blue-600 p-2 rounded-full hover:bg-blue-200"><X className="w-5 h-5"/></button>
               </div>
               {activeTab === 'list' && (
                  <div className="flex flex-col gap-6">
                    <div className="space-y-3">
                      <form onSubmit={handleAddName} className="flex gap-2">
                         <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder={t.addName} className={cn("flex-1 rounded-xl px-4 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50")} disabled={isSpinning} />
                         <button type="submit" disabled={!newName.trim() || isSpinning} className="bg-blue-600 text-white px-4 rounded-xl font-bold"><Plus className="w-5 h-5"/></button>
                      </form>
                      <textarea value={bulkNames} onChange={e => setBulkNames(e.target.value)} placeholder={t.pasteNames} className={cn("w-full rounded-xl px-4 py-3 border focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50")} disabled={isSpinning} />
                      <button onClick={handleBulkAdd} disabled={!bulkNames.trim() || isSpinning} className="w-full bg-slate-800 dark:bg-slate-700 text-white font-bold py-3 rounded-xl disabled:opacity-50">{t.addAll}</button>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold mb-3"><span>{t.names} ({names.length})</span> <button onClick={() => {setNames([]); setWinCounts({});}} className="text-red-500 text-sm">{t.clearAll}</button></div>
                      <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {names.map((name, i) => (
                           <div key={i} className={cn("flex justify-between items-center p-3 rounded-xl", darkMode ? "bg-slate-800" : "bg-slate-100")}>
                             <span className="truncate pr-2 font-medium">{name}</span>
                             <button onClick={() => setNames(names.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5"/></button>
                           </div>
                        ))}
                      </div>
                    </div>
                  </div>
               )}
               {activeTab === 'history' && (
                  <div className="flex flex-col gap-4">
                    <button onClick={() => setHistory([])} className="text-sm font-semibold text-red-500 self-end">Clear All</button>
                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                      {history.map((item, i) => (
                        <div key={i} className={cn("flex justify-between items-center px-4 py-3 rounded-xl", darkMode ? "bg-slate-800" : "bg-slate-100")}><div className="flex items-center gap-3"><Trophy className="w-4 h-4 text-yellow-500" /><span className="font-bold">{item.name}</span></div><span className="text-xs opacity-50">{new Date(item.time).toLocaleTimeString()}</span></div>
                      ))}
                    </div>
                  </div>
               )}
               {activeTab === 'settings' && (
                 <div className="flex flex-col gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Spin Method</label>
                      <div className="flex gap-2">
                        {['button', 'drag', 'auto'].map(mode => <button key={mode} onClick={() => setSpinMode(mode as any)} className={cn("flex-1 py-2 rounded-xl text-sm font-bold capitalize transition", spinMode === mode ? "bg-blue-600 text-white" : darkMode ? "bg-slate-800 text-slate-300" : "bg-slate-200 text-slate-700")}>{mode === 'button' ? t.buttonSpin : mode === 'drag' ? t.dragSpin : t.autoSpin}</button>)}
                      </div>
                    </div>
                    <div>
                       <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border dark:border-slate-800">
                          <span className="font-medium">Auto-remove winner</span>
                          <input type="checkbox" checked={autoRemove} onChange={e => setAutoRemove(e.target.checked)} className="w-5 h-5 accent-blue-600" />
                       </label>
                    </div>
                    <div className="pt-4 border-t dark:border-slate-800">
                      <h4 className="text-sm font-semibold mb-3">Saved Lists</h4>
                      <div className="flex gap-2 mb-4">
                        <input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="New list name..." className={cn("flex-1 rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-blue-500", darkMode ? "bg-slate-800 border-slate-700" : "bg-white border-zinc-300")} />
                        <button onClick={saveCurrentList} disabled={!newListName.trim()} className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 hover:bg-slate-700 disabled:opacity-50"><Save className="w-4 h-4" /> Save</button>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(savedLists).map(([name, list]) => (
                          <div key={name} className={cn("flex items-center justify-between px-3 py-3 rounded-lg border", darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-zinc-200", currentListName === name ? "border-l-4 border-l-blue-500" : "")}>
                            <div><p className="font-medium text-sm">{name}</p><p className="text-xs opacity-50">{list.length} names</p></div>
                            <div className="flex gap-2">
                              <button onClick={() => loadList(name)} className="text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-500/20">Load</button>
                              <button onClick={() => deleteList(name)} className="text-red-500 bg-red-500/10 p-1.5 rounded-lg hover:bg-red-500/20"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
               )}
             </motion.div>
           )}
        </div>

        {/* The Wheel */}
        <div className={cn("relative w-full max-w-[420px] lg:max-w-[550px] aspect-square transition-all duration-500", activeTab !== 'wheel' && "hidden md:block")}>
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 drop-shadow-2xl">
             <svg width="48" height="60" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 50L0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20L20 50Z" fill={darkMode ? '#1e293b' : 'white'}/>
                <path d="M20 45L5 20C5 11.7157 11.7157 5 20 5C28.2843 5 35 11.7157 35 20L20 45Z" fill="#3b82f6"/>
             </svg>
          </div>
          <div className={cn("w-full h-full rounded-full p-[6px] shadow-[0_0_60px_rgba(37,99,235,0.15)] dark:shadow-[0_0_60px_rgba(0,0,0,0.5)]", darkMode ? "bg-slate-800" : "bg-white")}>
            <canvas
              ref={wheelRef} width={800} height={800}
              className={cn("w-full h-full rounded-full shadow-inner", spinMode === 'drag' && !isSpinning ? "cursor-grab active:cursor-grabbing" : "")}
              onMouseDown={spinMode === 'drag' ? handlePointerDown : undefined} onMouseMove={spinMode === 'drag' ? handlePointerMove : undefined} onMouseUp={spinMode === 'drag' ? handlePointerUp : undefined} onMouseLeave={spinMode === 'drag' ? handlePointerUp : undefined}
              onTouchStart={spinMode === 'drag' ? handlePointerDown : undefined} onTouchMove={spinMode === 'drag' ? handlePointerMove : undefined} onTouchEnd={spinMode === 'drag' ? handlePointerUp : undefined} onTouchCancel={spinMode === 'drag' ? handlePointerUp : undefined}
            />
          </div>
        </div>

        {/* Spin Button */}
        {(spinMode === 'button' || spinMode === 'auto') && activeTab === 'wheel' && (
          <button onClick={spinProgrammatically} disabled={isSpinning || names.length === 0} className="mt-12 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xl md:text-2xl font-black py-4 px-14 md:px-16 rounded-full shadow-[0_8px_0_#1d4ed8] hover:shadow-[0_4px_0_#1d4ed8] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {t.spin}
          </button>
        )}
      </main>

      {/* Winner Modal */}
      <AnimatePresence>
        {winner && !isSpinning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => spinMode !== 'auto' && setWinner(null)} />
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }} className={cn("rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative z-10 flex flex-col items-center text-center border", darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-transparent")}>
              <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', delay: 0.1 }} className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-full mb-4">
                <Trophy className="w-12 h-12 text-yellow-500" />
              </motion.div>
              <h3 className="text-lg font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">{t.winner}</h3>
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 mb-8 w-full break-words py-2 leading-tight">
                {winner}
              </div>
              
              {spinMode === 'auto' ? (
                <div className="text-slate-500 font-semibold animate-pulse">{t.autoSpinning}</div>
              ) : (
                <div className="flex flex-col gap-3 w-full">
                  {!autoRemove && (
                    <button onClick={() => { setNames(names.filter(n => n !== winner)); setWinner(null); }} className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold py-3.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition flex justify-center items-center gap-2">
                       <Trash2 className="w-5 h-5"/> {t.removeAndSpin}
                    </button>
                  )}
                  <button onClick={() => { setWinner(null); spinProgrammatically(); }} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex justify-center items-center gap-2">
                     <Play className="w-5 h-5 fill-current"/> {t.spinAgain}
                  </button>
                  <button onClick={() => setWinner(null)} className="w-full text-slate-500 font-semibold py-2 hover:text-slate-800 dark:hover:text-slate-300 transition mt-2">
                    {t.close}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className={cn("md:hidden fixed bottom-0 left-0 right-0 border-t z-50 px-4 pb-safe pt-2 flex justify-around", darkMode ? "bg-slate-900/95 border-slate-800 backdrop-blur-lg" : "bg-white/95 border-slate-200 backdrop-blur-lg")}>
         {[
           { id: 'wheel', icon: RotateCw, label: 'Wheel' },
           { id: 'list', icon: ListIcon, label: 'List' },
           { id: 'history', icon: History, label: 'History' },
           { id: 'settings', icon: Settings, label: 'Settings' }
         ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as AppTab)} className={cn("flex flex-col items-center gap-1 p-3 rounded-xl min-w-[70px] transition", activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300")}>
               <tab.icon className={cn("w-6 h-6", activeTab === tab.id ? "stroke-[2.5px]" : "")} />
               <span className="text-[10px] font-bold">{tab.label}</span>
            </button>
         ))}
      </nav>
    </div>
  );
}
