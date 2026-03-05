import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader2, Compass, Navigation, MapPin, History, Star, Trash2, X, Search, Share2, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sendMessage, ChatMessage, MapLocation } from './services/geminiService';

interface HistoryItem {
  id: string;
  query: string;
  timestamp: number;
  isFavorite: boolean;
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Olá! Eu sou seu assistente de exploração. Como posso ajudar você hoje? Posso encontrar restaurantes, pontos turísticos ou traduzir informações para você.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowInstallGuide(true);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Explorador AI',
          text: 'Confira este assistente de viagens inteligente!',
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copiar para área de transferência
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem('search_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('search_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    // Add to history
    const newHistoryItem: HistoryItem = {
      id: Date.now().toString(),
      query: userMsg,
      timestamp: Date.now(),
      isFavorite: false,
    };
    setHistory(prev => [newHistoryItem, ...prev].slice(0, 50)); // Keep last 50

    const result = await sendMessage(userMsg, messages);

    setMessages((prev) => [
      ...prev,
      { role: 'model', text: result.text, locations: result.locations },
    ]);
    
    setIsLoading(false);
  };

  const toggleFavorite = (id: string) => {
    setHistory(prev => prev.map(item => 
      item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
    ));
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const useHistoryItem = (query: string) => {
    setInput(query);
    setIsHistoryOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-stone-50 font-sans text-stone-900 overflow-hidden select-none">
      {/* Header */}
      <header className="h-16 border-b border-stone-200 bg-white flex items-center justify-between px-4 lg:px-6 z-20 shadow-sm shrink-0 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-600 rounded-lg lg:rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Compass size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-sm lg:text-lg tracking-tight">Explorador AI</h1>
            <p className="hidden sm:block text-[10px] text-stone-500 font-medium uppercase tracking-wider">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors active:bg-stone-200"
            title="Compartilhar App"
          >
            <Share2 size={20} />
          </button>
          <button
            onClick={handleInstallClick}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all",
              deferredPrompt 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100 animate-pulse" 
                : "bg-stone-50 text-stone-500 border-stone-200"
            )}
          >
            <Smartphone size={14} />
            {deferredPrompt ? "Instalar" : "Como Instalar"}
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-stone-100 text-stone-600 transition-colors active:bg-stone-200"
            title="Histórico de buscas"
          >
            <History size={20} />
            <span className="hidden sm:inline text-sm font-medium">Histórico</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden relative max-w-4xl mx-auto w-full">
        {/* History Sidebar/Overlay */}
        <AnimatePresence>
          {showInstallGuide && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowInstallGuide(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-stone-800">Como Instalar</h3>
                    <button onClick={() => setShowInstallGuide(false)} className="text-stone-400 hover:text-stone-600">
                      <X size={24} />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">1</div>
                      <p className="text-stone-600 text-sm">Abra este link no <b>Google Chrome</b> do seu Android.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">2</div>
                      <p className="text-stone-600 text-sm">Toque nos <b>três pontinhos (⋮)</b> no canto superior direito.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">3</div>
                      <p className="text-stone-600 text-sm">Selecione <b>"Instalar aplicativo"</b> ou <b>"Adicionar à tela inicial"</b>.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInstallGuide(false)}
                    className="w-full mt-8 bg-emerald-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-transform"
                  >
                    Entendi!
                  </button>
                </motion.div>
              </motion.div>
            </>
          )}

          {isHistoryOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsHistoryOpen(false)}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm z-30"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white shadow-2xl z-40 flex flex-col"
              >
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <h2 className="font-semibold text-stone-800 flex items-center gap-2">
                    <History size={18} className="text-emerald-600" />
                    Histórico de Buscas
                  </h2>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-stone-400 p-8 text-center">
                      <Search size={32} className="mb-2 opacity-20" />
                      <p className="text-sm">Nenhuma busca recente encontrada.</p>
                    </div>
                  ) : (
                    history.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center gap-2 p-3 rounded-xl hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100"
                      >
                        <button
                          onClick={() => useHistoryItem(item.query)}
                          className="flex-1 text-left text-sm text-stone-700 truncate"
                          title={item.query}
                        >
                          {item.query}
                        </button>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleFavorite(item.id)}
                            className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              item.isFavorite ? "text-amber-400 bg-amber-50" : "text-stone-300 hover:text-amber-400 hover:bg-stone-100"
                            )}
                            title={item.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          >
                            <Star size={14} fill={item.isFavorite ? "currentColor" : "none"} />
                          </button>
                          <button
                            onClick={() => removeFromHistory(item.id)}
                            className="p-1.5 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remover do histórico"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {history.length > 0 && (
                  <div className="p-4 border-t border-stone-100">
                    <button
                      onClick={() => setHistory([])}
                      className="w-full py-2 text-xs font-medium text-stone-400 hover:text-red-500 transition-colors"
                    >
                      Limpar todo o histórico
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chat Section */}
        <section className="flex flex-col bg-white shadow-sm flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex flex-col max-w-[90%] sm:max-w-[80%]",
                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "px-4 py-3 rounded-2xl text-sm lg:text-base shadow-sm",
                      msg.role === 'user'
                        ? "bg-emerald-600 text-white rounded-tr-none"
                        : "bg-stone-100 text-stone-800 rounded-tl-none border border-stone-200"
                    )}
                  >
                    <div className="markdown-body">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                  
                  {msg.locations && msg.locations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {msg.locations.map((loc, lIdx) => (
                        <a
                          key={lIdx}
                          href={loc.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                          title="Abrir no Google Maps"
                        >
                          <MapPin size={12} />
                          {loc.title}
                          <Navigation size={12} className="ml-1 opacity-60" />
                        </a>
                      ))}
                    </div>
                  )}
                  
                  <span className="text-[10px] mt-1 text-stone-400 font-medium uppercase tracking-tighter">
                    {msg.role === 'user' ? 'Você' : 'Assistente'}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex items-center gap-2 text-stone-400">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs font-medium italic">Pesquisando informações...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 lg:p-8 border-t border-stone-100 bg-stone-50/50 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="relative flex items-center gap-2 max-w-3xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Onde vamos explorar hoje?"
                className="flex-1 bg-white border border-stone-200 rounded-2xl px-4 lg:px-6 py-3 lg:py-4 text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                enterKeyHint="send"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 lg:w-14 lg:h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 active:scale-90 shrink-0"
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[9px] lg:text-[10px] text-center mt-4 text-stone-400 font-medium uppercase tracking-widest">
              Respostas inteligentes com dados do Google Maps
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
