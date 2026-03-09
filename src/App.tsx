import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, RotateCw, Settings, X, Trophy, Moon, Sun, Languages } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Howl } from 'howler';
import { translations } from './i18n';

// --- Sound Effects ---
// Using placeholder URLs for demonstration. In a real app, use hosted assets.
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

// --- Components ---

export default function App() {
  const [names, setNames] = useState<string[]>(() => {
    const saved = localStorage.getItem('names');
    return saved ? JSON.parse(saved) : DEFAULT_NAMES;
  });
  const [newName, setNewName] = useState('');
  const [bulkNames, setBulkNames] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [spinMode, setSpinMode] = useState<'drag' | 'button' | 'auto'>(() => (localStorage.getItem('spinMode') as any) || 'button');
  const [lang, setLang] = useState<'id' | 'en'>(() => (localStorage.getItem('lang') as any) || 'id');
  const [darkMode, setDarkMode] = useState(() => JSON.parse(localStorage.getItem('darkMode') || 'false'));
  const [sensitivity, setSensitivity] = useState(() => parseFloat(localStorage.getItem('sensitivity') || '1'));
  const [currentPage, setCurrentPage] = useState<'wheel' | 'settings'>('wheel');
  
  const t = translations[lang];

  // --- Persistence ---
  useEffect(() => { localStorage.setItem('names', JSON.stringify(names)); }, [names]);
  useEffect(() => { localStorage.setItem('spinMode', spinMode); }, [spinMode]);
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);
  useEffect(() => { localStorage.setItem('darkMode', JSON.stringify(darkMode)); }, [darkMode]);
  useEffect(() => { localStorage.setItem('sensitivity', sensitivity.toString()); }, [sensitivity]);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isSpinning && names.length > 0) spinProgrammatically();
      } else if (e.code === 'Escape') {
        clearAllNames();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSpinning, names.length]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const wheelRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  
  // Physics state
  const physics = useRef({
    angle: 0,
    velocity: 0,
    isDragging: false,
    lastMouseAngle: 0,
    lastTime: 0,
  });

  // --- Wheel Drawing & Physics ---
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = darkMode ? '#fff' : '#333';
      ctx.font = 'bold 20px sans-serif';
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
      ctx.arc(
        centerX,
        centerY,
        radius,
        i * sliceAngle - Math.PI / 2,
        (i + 1) * sliceAngle - Math.PI / 2
      );
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(i * sliceAngle + sliceAngle / 2 - Math.PI / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      
      // Adjust font size based on number of names
      const fontSize = Math.max(10, Math.min(24, 150 / names.length));
      ctx.font = `bold ${fontSize}px sans-serif`;
      
      // Shadow for better readability
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      
      const text = names[i].length > 15 ? names[i].substring(0, 13) + '...' : names[i];
      ctx.fillText(text, radius - 20, 0);
      ctx.restore();
    }
    
    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
    ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = darkMode ? '#4b5563' : '#333';
    ctx.stroke();

    ctx.restore();
  }, [names, darkMode, t.noNames]);

  const updatePhysics = useCallback(() => {
    if (!physics.current.isDragging) {
      physics.current.angle += physics.current.velocity;
      // Physics: Friction is slightly less for longer, more satisfying spins
      physics.current.velocity *= 0.99; 

      if (Math.abs(physics.current.velocity) < 0.002 && physics.current.velocity !== 0) {
        physics.current.velocity = 0;
        setIsSpinning(false);
        spinSound.stop();
        winSound.play();
        
        // Calculate winner
        if (names.length > 0) {
          const sliceAngle = (2 * Math.PI) / names.length;
          let normalizedAngle = (-physics.current.angle) % (2 * Math.PI);
          if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
          const winnerIndex = Math.floor(normalizedAngle / sliceAngle);
          
          const wonName = names[winnerIndex];
          setWinner(wonName);
          
          // Confetti
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FF595E', '#FFCA3A', '#8AC926', '#1982C4', '#6A4C93']
          });
        }
      }
    }

    drawWheel();
    requestRef.current = requestAnimationFrame(updatePhysics);
  }, [names, drawWheel]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updatePhysics);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
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
    
    // Handle wrap-around
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    // Apply sensitivity
    physics.current.angle += deltaAngle * sensitivity;
    
    const now = performance.now();
    const dt = now - physics.current.lastTime;
    if (dt > 0) {
      // Calculate velocity (radians per frame approx)
      physics.current.velocity = (deltaAngle / dt) * 16 * sensitivity;
    }
    
    physics.current.lastMouseAngle = currentAngle;
    physics.current.lastTime = now;
  };

  const handlePointerUp = () => {
    if (!physics.current.isDragging) return;
    physics.current.isDragging = false;
    
    // If they gave it a good spin, mark as spinning
    if (Math.abs(physics.current.velocity) > 0.05) {
      setIsSpinning(true);
      spinSound.play();
    }
  };

  // Prevent scrolling on touch devices when interacting with the wheel
  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    
    const preventDefault = (e: TouchEvent) => {
      if (physics.current.isDragging) {
        e.preventDefault();
      }
    };
    
    canvas.addEventListener('touchmove', preventDefault, { passive: false });
    return () => canvas.removeEventListener('touchmove', preventDefault);
  }, []);

  const spinProgrammatically = useCallback(() => {
    if (names.length === 0 || isSpinning) return;
    setWinner(null);
    setIsSpinning(true);
    spinSound.play();
    // Random velocity between 0.3 and 0.6
    physics.current.velocity = Math.random() * 0.3 + 0.3;
  }, [names.length, isSpinning]);

  // Auto spin logic
  useEffect(() => {
    if (spinMode === 'auto' && winner) {
      const timer = setTimeout(() => {
        setWinner(null);
        spinProgrammatically();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [winner, spinMode, spinProgrammatically]);

  // Prevent body scroll when winner modal is open
  useEffect(() => {
    if (winner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [winner]);

  // --- Name Management ---
  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      setNames([...names, newName.trim()]);
      setNewName('');
    }
  };

  const handleBulkAdd = () => {
    const newNames = bulkNames
      .split('\n')
      .map(n => n.trim())
      .filter(n => n.length > 0);
    if (newNames.length > 0) {
      setNames([...names, ...newNames]);
      setBulkNames('');
    }
  };

  const removeName = (index: number) => {
    removeSound.play();
    setNames(names.filter((_, i) => i !== index));
  };

  const clearAllNames = () => {
    setNames([]);
  };

  const removeWinnerAndSpin = () => {
    if (winner) {
      const newNames = names.filter(n => n !== winner);
      setNames(newNames);
      setWinner(null);
      if (newNames.length > 0) {
        setIsSpinning(true);
        spinSound.play();
        physics.current.velocity = Math.random() * 0.3 + 0.3;
      }
    }
  };

  return (
    <div className={`min-h-screen relative ${darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-[#6a5cff] to-[#9b5cff] text-white'} font-sans p-4 md:p-8 flex flex-col gap-8`}>
      
      {/* Settings Bar & Navigation */}
      <div className="absolute top-4 right-4 flex gap-2 z-50">
        <button onClick={() => setCurrentPage(currentPage === 'wheel' ? 'settings' : 'wheel')} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
          {currentPage === 'wheel' ? <Settings className="w-6 h-6" /> : <RotateCw className="w-6 h-6" />}
        </button>
        <button onClick={() => setLang(lang === 'id' ? 'en' : 'id')} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
          <Languages className="w-6 h-6" />
        </button>
        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
          {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </div>

      {currentPage === 'settings' ? (
        <div className="flex flex-col gap-8 flex-1 max-w-2xl mx-auto w-full">
          {/* Settings Page Content */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white/10'} backdrop-blur-md rounded-2xl p-6 shadow-xl border ${darkMode ? 'border-gray-700' : 'border-white/20'}`}>
            <h1 className="text-2xl font-bold mb-6">Settings</h1>
            
            {/* Name Management */}
            <div className="space-y-6">
              <form onSubmit={handleAddName} className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t.addName}
                  className="flex-1 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
                  disabled={isSpinning}
                />
                <button 
                  type="submit"
                  disabled={!newName.trim() || isSpinning}
                  className="bg-white text-[#6a5cff] p-2 rounded-xl font-bold hover:bg-white/90 transition disabled:opacity-50"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </form>

              <div className="relative">
                <textarea
                  value={bulkNames}
                  onChange={(e) => setBulkNames(e.target.value)}
                  placeholder={t.pasteNames}
                  className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 h-24 resize-none"
                  disabled={isSpinning}
                />
                {bulkNames.trim() && (
                  <button
                    onClick={handleBulkAdd}
                    className="absolute bottom-3 right-3 bg-white text-[#6a5cff] px-3 py-1 rounded-lg text-sm font-bold hover:bg-white/90 transition"
                  >
                    {t.addAll}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white/10'} backdrop-blur-md rounded-2xl p-6 shadow-xl border ${darkMode ? 'border-gray-700' : 'border-white/20'} flex-1`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t.names} ({names.length})</h2>
              {names.length > 0 && (
                <button 
                  onClick={clearAllNames}
                  disabled={isSpinning}
                  className="text-white/70 hover:text-white text-sm transition disabled:opacity-50"
                >
                  {t.clearAll}
                </button>
              )}
            </div>
            
            <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
              {names.length === 0 ? (
                <p className="text-white/50 text-center py-8">{t.noNames}</p>
              ) : (
                names.map((name, index) => (
                  <div 
                    key={`${name}-${index}`} 
                    className="flex justify-between items-center bg-white/10 rounded-lg px-4 py-2 group hover:bg-white/20 transition"
                  >
                    <span className="truncate pr-4">{name}</span>
                    <button 
                      onClick={() => removeName(index)}
                      disabled={isSpinning}
                      className="text-white/50 hover:text-white opacity-0 group-hover:opacity-100 transition disabled:opacity-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white/10'} backdrop-blur-md rounded-2xl p-6 shadow-xl border ${darkMode ? 'border-gray-700' : 'border-white/20'}`}>
            <h2 className="text-xl font-semibold mb-4">Wheel Settings</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSpinMode('drag')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${spinMode === 'drag' ? 'bg-white text-[#6a5cff]' : 'hover:bg-white/20'}`}>{t.dragSpin}</button>
              <button onClick={() => setSpinMode('button')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${spinMode === 'button' ? 'bg-white text-[#6a5cff]' : 'hover:bg-white/20'}`}>{t.buttonSpin}</button>
              <button onClick={() => setSpinMode('auto')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${spinMode === 'auto' ? 'bg-white text-[#6a5cff]' : 'hover:bg-white/20'}`}>{t.autoSpin}</button>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm font-medium opacity-70">Sensitivity</span>
              <input type="range" min="0.5" max="2" step="0.1" value={sensitivity} onChange={(e) => setSensitivity(parseFloat(e.target.value))} className="w-full" />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-8 flex-1">
          {/* Wheel Page Content */}
          <h1 className="text-3xl font-bold text-white">Random Wheel Picker</h1>
          <div className="relative w-full max-w-[500px] aspect-square">
            {/* Pointer */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 drop-shadow-lg">
              <svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 50L0 20C0 8.95431 8.95431 0 20 0C31.0457 0 40 8.95431 40 20L20 50Z" fill="white"/>
                <path d="M20 45L5 20C5 11.7157 11.7157 5 20 5C28.2843 5 35 11.7157 35 20L20 45Z" fill="#FF595E"/>
              </svg>
            </div>

            {/* Canvas */}
            <canvas
              ref={wheelRef}
              width={600}
              height={600}
              className={`w-full h-full rounded-full shadow-2xl ${spinMode === 'drag' && !isSpinning ? 'cursor-grab active:cursor-grabbing' : ''}`}
              onMouseDown={spinMode === 'drag' ? handlePointerDown : undefined}
              onMouseMove={spinMode === 'drag' ? handlePointerMove : undefined}
              onMouseUp={spinMode === 'drag' ? handlePointerUp : undefined}
              onMouseLeave={spinMode === 'drag' ? handlePointerUp : undefined}
              onTouchStart={spinMode === 'drag' ? handlePointerDown : undefined}
              onTouchMove={spinMode === 'drag' ? handlePointerMove : undefined}
              onTouchEnd={spinMode === 'drag' ? handlePointerUp : undefined}
              onTouchCancel={spinMode === 'drag' ? handlePointerUp : undefined}
            />
          </div>

          {/* Spin Button */}
          {(spinMode === 'button' || spinMode === 'auto') && (
            <button
              onClick={spinProgrammatically}
              disabled={isSpinning || names.length === 0}
              className="bg-white text-[#6a5cff] text-2xl font-bold py-4 px-12 rounded-full shadow-[0_8px_0_#e0e0e0] hover:shadow-[0_4px_0_#e0e0e0] hover:translate-y-1 active:shadow-none active:translate-y-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[0_8px_0_#e0e0e0] disabled:hover:translate-y-0"
            >
              {t.spin}
            </button>
          )}

          {/* Winner Modal */}
          {winner && !isSpinning && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => spinMode !== 'auto' && setWinner(null)} />
              <div className="bg-white text-gray-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative z-10 animate-in zoom-in duration-300 flex flex-col items-center text-center">
                <Trophy className="w-16 h-16 text-[#FFCA3A] mb-4" />
                <h3 className="text-2xl font-bold text-gray-500 mb-2">{t.winner}</h3>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#6a5cff] to-[#FF595E] mb-8 break-words w-full">
                  {winner}
                </div>
                
                {spinMode === 'auto' ? (
                  <div className="text-gray-500 font-medium animate-pulse">
                    {t.autoSpinning}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 w-full">
                    <button 
                      onClick={() => { setWinner(null); spinProgrammatically(); }}
                      className="w-full bg-[#6a5cff] text-white font-bold py-3 rounded-xl hover:bg-[#5a4ce0] transition"
                    >
                      {t.spinAgain}
                    </button>
                    <button 
                      onClick={removeWinnerAndSpin}
                      className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
                    >
                      {t.removeAndSpin}
                    </button>
                    <button 
                      onClick={() => setWinner(null)}
                      className="w-full text-gray-500 font-medium py-2 hover:text-gray-800 transition mt-2"
                    >
                      {t.close}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-white/60 py-4">
        <p>Built by MKA</p>
        <a href="https://mka.my.id" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">mka.my.id</a>
      </footer>
    </div>
  );
}
