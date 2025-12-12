import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LayoutList, BarChart2, Timer as TimerIcon, ArrowLeft, Plus, CheckCircle, XCircle, Calendar as CalendarIcon, Play, Save, X, Trash2, AlertTriangle } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from './api';

const WorkoutContext = createContext();
const WorkoutProvider = ({ children }) => {
  const [exercises, setExercises] = useState([]);
  const refreshExercises = () => api.get('/exercises').then(res => setExercises(res.data)).catch(console.error);
  useEffect(() => { refreshExercises(); }, []);
  return <WorkoutContext.Provider value={{ exercises, refreshExercises }}>{children}</WorkoutContext.Provider>;
};

const Timer = () => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [customInput, setCustomInput] = useState('');
  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) interval = setInterval(() => setSeconds(s => s - 1), 1000);
    else if (seconds === 0) setIsActive(false);
    return () => clearInterval(interval);
  }, [isActive, seconds]);
  const formatTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`;
  const handleStart = (t) => { setSeconds(t); setIsActive(true); };
  const handleCustom = () => { if(customInput) handleStart(parseInt(customInput)); setCustomInput(''); };
  return (
    <div className="fixed bottom-4 right-4 bg-black p-4 rounded-xl border border-red-900/50 text-white w-72 shadow-2xl z-50">
      <div className="flex justify-between items-center mb-4"><h3 className="flex items-center gap-2 font-bold text-sm text-gray-400"><TimerIcon size={16}/> Descanso</h3><span className="text-4xl font-mono text-red-500 font-bold tracking-widest">{formatTime(seconds)}</span></div>
      <div className="flex gap-2 mb-3">{[60, 90, 120].map(t => (<button key={t} onClick={() => handleStart(t)} className="flex-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs py-2 rounded text-white transition-colors">{t}s</button>))}</div>
      <div className="flex gap-2"><input type="number" placeholder="Seg..." value={customInput} onChange={e=>setCustomInput(e.target.value)} className="bg-slate-900 text-white text-xs p-2 rounded flex-1 border border-slate-800 outline-none focus:border-red-500"/><button onClick={handleCustom} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded flex items-center justify-center"><Play size={14} fill="white"/></button></div>
    </div>
  );
};

const CalendarGrid = () => {
  const [dates, setDates] = useState([]);
  const today = new Date();
  const days = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });
  useEffect(() => { api.get('/workouts/list').then(res => setDates(res.data.map(w => w.date.split('T')[0]))).catch(console.error); }, []);
  return (
    <div className="p-4 max-w-2xl mx-auto text-white">
      <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm"><ArrowLeft size={16}/> Voltar</Link>
      <h1 className="text-2xl font-bold mb-6 capitalize">{format(today, 'MMMM yyyy', { locale: ptBR })}</h1>
      <div className="grid grid-cols-7 gap-2 text-center mb-2 text-gray-500 text-sm"><div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div></div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const iso = format(day, 'yyyy-MM-dd');
          return (<Link to={`/workout/${iso}`} key={iso} className={`aspect-square flex items-center justify-center rounded-lg border font-bold text-sm ${dates.includes(iso) ? 'bg-red-900/40 border-red-600 text-red-100' : 'bg-slate-900 border-slate-800 text-gray-600'} ${isSameDay(day, today) ? 'ring-1 ring-white' : ''}`}>{format(day, 'd')}</Link>);
        })}
      </div>
    </div>
  );
};

const Week = () => {
  const [workouts, setWorkouts] = useState([]);
  const today = new Date();
  useEffect(() => { api.get('/workouts/list').then(res => setWorkouts(res.data)).catch(() => setWorkouts([])); }, []);
  const weekDays = Array.from({ length: 7 }).map((_, i) => { const d = addDays(startOfWeek(today, { weekStartsOn: 0 }), i); return { date: d, formatted: format(d, 'EEEE, dd/MM', { locale: ptBR }), iso: format(d, 'yyyy-MM-dd') }; });
  return (
    <div className="p-4 max-w-2xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-6">Semana Atual</h1>
      <div className="grid gap-3">
        {weekDays.map(day => {
          const hasWorkout = workouts.some(w => w.date.startsWith(day.iso));
          const isToday = isSameDay(day.date, today);
          return (
            <Link to={`/workout/${day.iso}`} key={day.iso} className={`p-4 rounded-lg flex justify-between items-center border transition ${hasWorkout ? 'bg-red-900/20 border-red-800' : isToday ? 'bg-slate-900 border-red-500' : 'bg-slate-900 border-slate-800'}`}>
              <div><span className="capitalize font-medium block">{day.formatted} {isToday && '(Hoje)'}</span>{hasWorkout && <span className="text-xs text-red-400">Registrado</span>}</div>
              <span className={`px-3 py-1 rounded text-xs font-bold ${hasWorkout ? 'bg-red-700 text-white' : 'bg-slate-800 text-gray-300'}`}>{hasWorkout ? 'VER' : 'ABRIR'}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

const Daily = () => {
  const { date } = useParams();
  const { exercises, refreshExercises } = useContext(WorkoutContext);
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [newExerciseId, setNewExerciseId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');

  const fetchWorkout = () => { setLoading(true); api.get(`/workouts/date/${date}`).then(res => { setWorkout(res.data); setError(false); }).catch(() => setError(true)).finally(() => setLoading(false)); };
  useEffect(() => { fetchWorkout(); }, [date]);

  const handleAddItem = async () => { if (!newExerciseId) return; await api.post(`/workouts/${workout.id}/items`, { exerciseId: newExerciseId, sets: 4 }); setNewExerciseId(''); fetchWorkout(); };
  const handleCreate = async () => { if (!customName) return; await api.post('/exercises', { name: customName }); refreshExercises(); setCustomName(''); alert('Criado!'); };
  
  // Deletar exercício da lista geral
  const handleDeleteEx = async (id, name) => { if(confirm(`Excluir definição de "${name}"? Isso não apaga treinos passados.`)) { await api.delete(`/exercises/${id}`); refreshExercises(); } };
  
  // Deletar Item do treino atual
  const handleDeleteItem = async (itemId) => {
    if(confirm('Remover este exercício do treino de hoje?')) {
        await api.delete(`/items/${itemId}`);
        fetchWorkout();
    }
  };

  const updateItem = async (item, field, val) => { setWorkout(prev => ({ ...prev, items: prev.items.map(i => i.id === item.id ? { ...i, [field]: val } : i) })); await api.put(`/items/${item.id}`, { [field]: val }); };
  const getStyle = (done) => done === true ? 'bg-green-950/40 border-green-600' : done === false ? 'bg-red-950/40 border-red-600' : 'bg-slate-900 border-slate-800';

  if (loading) return <div className="text-white p-10 text-center animate-pulse">Carregando treino...</div>;
  if (error || !workout) return (<div className="text-white p-10 text-center flex flex-col items-center"><AlertTriangle className="text-red-500 mb-2" size={40}/><p className="text-lg font-bold">Não foi possível carregar o treino.</p><p className="text-gray-400 text-sm mb-4">Verifique se o servidor está rodando.</p><Link to="/" className="text-blue-400 underline">Voltar</Link></div>);

  return (
    <div className="p-4 max-w-2xl mx-auto pb-48 text-white">
      <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm"><ArrowLeft size={16}/> Voltar</Link>
      <h1 className="text-2xl font-bold mb-6">Treino {date}</h1>
      <div className="space-y-3">
        {workout.items.map(item => (
          <div key={item.id} className={`p-4 rounded-lg border transition-all duration-300 relative ${getStyle(item.done)}`}>
            {/* BOTÃO DE DELETAR ITEM (LIXEIRA) */}
            <button 
                onClick={() => handleDeleteItem(item.id)}
                className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors p-1"
                title="Remover do treino"
            >
                <Trash2 size={16} />
            </button>

            <div className="flex justify-between items-center mb-2 pr-8">
              <h3 className={`font-bold ${item.done===false?'text-red-400':item.done===true?'text-green-400':'text-white'}`}>{item.exercise?.name}</h3>
            </div>
            
            <div className="flex items-center gap-4 mb-3">
               <div className="flex gap-2">
                <button onClick={() => updateItem(item, 'done', true)} className={`p-1 rounded-full ${item.done===true?'bg-green-600 text-white':'text-gray-600 hover:text-green-400'}`}><CheckCircle size={24}/></button>
                <button onClick={() => updateItem(item, 'done', false)} className={`p-1 rounded-full ${item.done===false?'bg-red-600 text-white':'text-gray-600 hover:text-red-400'}`}><XCircle size={24}/></button>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1"><label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Séries</label><input type="number" defaultValue={item.sets} onBlur={e=>updateItem(item,'sets',e.target.value)} className="bg-black/50 w-full p-3 rounded-lg text-white border border-white/10 focus:border-red-500 outline-none font-mono"/></div>
              <div className="flex-1"><label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Reps</label><input type="number" defaultValue={item.reps} onBlur={e=>updateItem(item,'reps',e.target.value)} className="bg-black/50 w-full p-3 rounded-lg text-white border border-white/10 focus:border-red-500 outline-none font-mono"/></div>
              <div className="flex-1"><label className="text-[10px] text-gray-500 font-bold uppercase pl-1">Carga (kg)</label><input type="number" defaultValue={item.weight} onBlur={e=>updateItem(item,'weight',e.target.value)} className="bg-black/50 w-full p-3 rounded-lg text-white border border-white/10 focus:border-red-500 outline-none font-mono"/></div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        {!isCreating ? (
          <div className="flex flex-col gap-2"><div className="flex gap-2"><select value={newExerciseId} onChange={e => setNewExerciseId(e.target.value)} className="bg-slate-900 text-white p-3 rounded-lg flex-1 border border-slate-800 focus:border-red-500 outline-none"><option value="">Adicionar exercício...</option>{exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select><button onClick={handleAddItem} className="bg-red-600 hover:bg-red-700 px-4 rounded-lg text-white flex items-center justify-center"><Plus/></button></div><button onClick={() => setIsCreating(true)} className="text-xs text-gray-500 hover:text-red-400 self-start ml-1 underline">Não achou? Criar novo</button></div>
        ) : (
          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 animate-in fade-in zoom-in"><div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">Criar & Gerenciar</h3><button onClick={() => setIsCreating(false)} className="text-gray-500 hover:text-white"><X size={20}/></button></div><div className="flex gap-2 mb-6"><input type="text" value={customName} onChange={e => setCustomName(e.target.value)} className="bg-black text-white p-3 rounded-lg flex-1 border border-slate-700 focus:border-red-500 outline-none" placeholder="Nome do exercício"/><button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white px-4 rounded-lg"><Save size={20}/></button></div><div className="border-t border-slate-800 pt-4 max-h-40 overflow-y-auto custom-scrollbar">{exercises.map(ex => (<div key={ex.id} className="flex justify-between items-center p-2 rounded hover:bg-slate-800 group"><span className="text-sm text-gray-300">{ex.name}</span><button onClick={() => handleDeleteEx(ex.id, ex.name)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button></div>))}</div></div>
        )}
      </div>
      <Timer />
    </div>
  );
};

const Progress = () => {
  const [data, setData] = useState([]);
  useEffect(() => { api.get('/stats').then(res => setData(res.data)).catch(console.error); }, []);
  return (
    <div className="p-6 max-w-4xl mx-auto text-white">
      <Link to="/" className="text-gray-400 hover:text-white flex items-center gap-2 mb-4 text-sm"><ArrowLeft size={16}/> Voltar</Link>
      <h1 className="text-2xl font-bold mb-6">Evolução de Cargas</h1>
      <div className="h-80 bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-xl">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" tickFormatter={(date) => { const d = date.split('-'); return `${d[2]}/${d[1]}`; }} />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#000000', borderColor: '#ef4444', color: '#fff' }} labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy')} />
              <Line type="monotone" dataKey="weight" stroke="#dc2626" strokeWidth={3} dot={{ r: 4, fill: '#dc2626' }} activeDot={{ r: 8 }} name="Carga Máxima (kg)" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
            <p>Ainda não há dados suficientes.</p>
            <p className="text-xs">Continue a registar os seus treinos para ver o gráfico.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <WorkoutProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-black text-gray-100 font-sans selection:bg-red-900 selection:text-white">
          <nav className="bg-black border-b border-slate-900 p-4 sticky top-0 z-10 backdrop-blur-md bg-black/80">
            <div className="max-w-2xl mx-auto flex justify-between items-center text-white"><Link to="/" className="font-bold text-xl tracking-tighter">Gym<span className="text-red-600">Track</span></Link><div className="flex gap-6"><Link to="/" className="hover:text-red-500 flex flex-col items-center text-xs gap-1"><LayoutList size={20}/> Semana</Link><Link to="/calendar" className="hover:text-red-500 flex flex-col items-center text-xs gap-1"><CalendarIcon size={20}/> Mês</Link><Link to="/progress" className="hover:text-red-500 flex flex-col items-center text-xs gap-1"><BarChart2 size={20}/> Evolução</Link></div></div>
          </nav>
          <Routes>
            <Route path="/" element={<Week />} />
            <Route path="/calendar" element={<CalendarGrid />} />
            <Route path="/workout/:date" element={<Daily />} />
            <Route path="/progress" element={<Progress />} />
          </Routes>
        </div>
      </BrowserRouter>
    </WorkoutProvider>
  );
}