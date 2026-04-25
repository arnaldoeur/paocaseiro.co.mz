import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageCircle, Sparkles, Loader, Trash2, Clock, Plus, ChevronRight, Menu, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

// OpenRouter API Configuration
const OPENROUTER_API_KEY = (import.meta as any).env.VITE_OPENROUTER_API_KEY || "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";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const AI_MODEL = "openrouter/free";

interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system' | 'model';
    content: string;
    reasoning_details?: any; // Added to support Gemma 4 reasoning
    created_at?: string;
}

interface Session {
    id: string;
    title: string;
    created_at: string;
}

interface AdminSupportAIProps {
    userName: string;
    stats: {
        totalSales: number;
        totalOrders: number;
        pendingOrders: number;
        lowStockCount: number;
        unavailableProducts: string[];
    };
}

export const AdminSupportAI: React.FC<AdminSupportAIProps> = ({ userName, stats }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true); // For mobile toggle
    const containerRef = useRef<HTMLDivElement>(null);

    const quickQuestions = [
        "Resumo de hoje?",
        "Produtos esgotados?",
        "Dicas para aumentar vendas?",
        "Como gerir melhor os pedidos?"
    ];

    const scrollToBottom = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: containerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    };

    // Load Sessions
    const loadSessions = () => {
        const localSessions = localStorage.getItem(`ai_sessions_admin`);
        if (localSessions) {
            setSessions(JSON.parse(localSessions));
        }
    };

    useEffect(() => {
        loadSessions();
    }, [userName]);

    // Load Messages for Session
    const loadSessionMessages = (sessionId: string) => {
        setIsLoading(true);
        setCurrentSessionId(sessionId);
        
        const localHistory = localStorage.getItem(`ai_history_${sessionId}`);
        if (localHistory) {
            setMessages(JSON.parse(localHistory));
        } else {
            setMessages([]);
        }
        
        setIsLoading(false);
        if (window.innerWidth < 768) setShowSidebar(false); // Close sidebar on mobile select
    };

    // New Chat
    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([
            { role: 'assistant', content: `Olá ${userName}! Novo chat iniciado. Como posso ajudar?` }
        ]);
        if (window.innerWidth < 768) setShowSidebar(false);
    };

    // Initial State
    useEffect(() => {
        if (!currentSessionId) {
            handleNewChat();
        }
    }, [userName]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const saveMessageIndex = (msg: Message, sessionId: string) => {
        const localHistoryStr = localStorage.getItem(`ai_history_${sessionId}`);
        let hist = localHistoryStr ? JSON.parse(localHistoryStr) : [];
        hist.push({
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.content,
            created_at: new Date().toISOString()
        });
        localStorage.setItem(`ai_history_${sessionId}`, JSON.stringify(hist));
    };

    const createSession = (firstMessage: string): string => {
        const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
        const newSession = {
            id: 'sess_' + Date.now().toString(),
            title: title,
            created_at: new Date().toISOString()
        };
        
        const localSessionsStr = localStorage.getItem(`ai_sessions_admin`);
        let localSessions = localSessionsStr ? JSON.parse(localSessionsStr) : [];
        localSessions.unshift(newSession);
        
        localStorage.setItem(`ai_sessions_admin`, JSON.stringify(localSessions));
        setSessions(localSessions);
        return newSession.id;
    };

    const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('Apagar esta conversa?')) return;

        localStorage.removeItem(`ai_history_${sessionId}`);
        
        const localSessionsStr = localStorage.getItem(`ai_sessions_admin`);
        let localSessions: Session[] = localSessionsStr ? JSON.parse(localSessionsStr) : [];
        localSessions = localSessions.filter(s => s.id !== sessionId);
        
        localStorage.setItem(`ai_sessions_admin`, JSON.stringify(localSessions));
        setSessions(localSessions);
        
        if (currentSessionId === sessionId) {
            handleNewChat();
        }
    };

    // Helper to format text (Bold handling regex)
    const formatMessage = (content: string) => {
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={index} className="font-bold text-[#d9a65a]">{part.slice(2, -2)}</strong>;
            }
            return <span key={index}>{part}</span>;
        });
    };

    const handleSend = async (text: string = input) => {
        if (!text.trim()) return;

        const userMsg: Message = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        // Ensure Session Exists
        let targetSessionId = currentSessionId;
        if (!targetSessionId) {
            targetSessionId = await createSession(text);
            setCurrentSessionId(targetSessionId);
        }

        if (targetSessionId) {
            saveMessageIndex(userMsg, targetSessionId);
        }

        const systemContext = JSON.stringify({
            identity: "Zyph AI",
            creator: "Zyph Tech, Lda",
            localized_context: {
                country: "Moçambique",
                city: "Lichinga",
                business_type: "Padaria e Pastelaria (Pão Caseiro)",
                admin_name: userName
            },
            data_context: {
                today_sales: `${stats.totalSales} MT`,
                total_orders: stats.totalOrders,
                pending_orders: stats.pendingOrders,
                low_stock: stats.lowStockCount,
                unavailable_items: stats.unavailableProducts
            },
            instructions: [
                "Você é a 'Zyph AI'. Nunca use outros nomes.",
                "Respostas extremamente curtas, humanas e objetivas.",
                "Português de Moçambique.",
                "Sem saudações repetitivas. Se já disse 'Olá', pule para a resposta nas próximas interações.",
                "Foco total na realidade da Padaria Pão Caseiro em Lichinga.",
                "Não use negrito (**). Use texto simples."
            ],
            style: "concise"
        });

        // Add a hint for the AI about previous messages
        const conversationHint = messages.length > 2 ? "\n(Note: This is a continuing conversation. No need for greetings or introductions.)" : "";

        try {
            const historyMessages = messages
                .filter(m => m.role !== 'system' && m.content.trim() !== "")
                .slice(-6)
                .map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.content,
                    reasoning_details: m.reasoning_details // Pass back for Gemma 4
                }));

            const finalMessages = [
                ...historyMessages,
                { 
                    role: 'user', 
                    content: `INSTRUÇÕES: Zyph AI da Padaria Pão Caseiro. Resposta curta. Moçambique.\n\nPERGUNTA: ${text}` 
                }
            ];

            const response = await fetch(OPENROUTER_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                },
                body: JSON.stringify({ 
                    model: AI_MODEL,
                    messages: finalMessages,
                    stream: true,
                    temperature: 0.7,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Erro na API do OpenRouter');
            }

            // --- STREAMING LOGIC ---
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = "";
            
            const botMsgId = 'bot_' + Date.now();
            setMessages(prev => [...prev, { role: 'assistant', content: "", id: botMsgId }]);
            setIsLoading(false);

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                        
                        if (trimmedLine.startsWith('data: ')) {
                            try {
                                const jsonData = JSON.parse(trimmedLine.slice(6));
                                const deltaContent = jsonData.choices[0]?.delta?.content;
                                if (deltaContent) {
                                    accumulatedContent += deltaContent;
                                    setMessages(prev => prev.map(m => 
                                        m.id === botMsgId ? { ...m, content: accumulatedContent } : m
                                    ));
                                }
                            } catch (e) {
                                console.error("Error parsing stream chunk", e);
                            }
                        }
                    }
                }
            }

            if (targetSessionId) {
                saveMessageIndex({ role: 'assistant', content: accumulatedContent }, targetSessionId);
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            const isOffline = !navigator.onLine;
            let errorMessage = `A chave de acesso da Zyph AI expirou ou é inválida. Por favor, atualize a chave VITE_OPENROUTER_API_KEY no ficheiro .env ou contacte o suporte técnico da Zyph Tech.`;
            
            if (isOffline) {
                errorMessage = `Sem conexão à internet. Verifique sua rede e tente novamente.`;
            } else if (error.message && !error.message.includes('fetch')) {
                errorMessage = `Erro na API: ${error.message}`;
            }

            const errorMsg: Message = { 
                role: 'assistant', 
                content: errorMessage
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 relative">

            {/* Sidebar (History) */}
            <AnimatePresence>
                {showSidebar && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 300, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-[#fcfbf9] border-r border-gray-200 flex flex-col shrink-0 absolute md:relative z-20 h-full shadow-xl md:shadow-none"
                    >
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-[#3b2f2f] text-white">
                            <h3 className="font-serif font-bold flex items-center gap-2"><Clock size={16} /> Histórico</h3>
                            <button title="Fechar Histórico" onClick={() => setShowSidebar(false)} className="hover:text-[#d9a65a] transition-colors"><ChevronLeft size={20} /></button>
                        </div>

                        <div className="p-4">
                            <button onClick={handleNewChat} className="w-full bg-[#d9a65a] text-[#3b2f2f] py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                <Plus size={18} /> Novo Chat
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-1 p-2">
                            {sessions.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSessionMessages(session.id)}
                                    className={`p-3 rounded-xl cursor-pointer transition-colors group relative ${currentSessionId === session.id ? 'bg-white shadow-md border border-gray-100' : 'hover:bg-gray-200'}`}
                                >
                                    <h4 className="font-bold text-sm text-[#3b2f2f] truncate pr-6">{session.title}</h4>
                                    <p className="text-[10px] text-gray-400 mt-1">{new Date(session.created_at).toLocaleDateString('pt-PT')}</p>

                                    <button
                                        title="Apagar Conversa"
                                        onClick={(e) => handleDeleteSession(e, session.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <p className="text-center text-xs text-gray-400 mt-10">Sem histórico recente.</p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative w-full">
                {/* Header */}
                <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        {!showSidebar && (
                            <button title="Abrir Histórico" onClick={() => setShowSidebar(true)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                                <ChevronRight size={20} />
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-full bg-[#3b2f2f] flex items-center justify-center text-[#d9a65a]">
                            <Bot className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold font-serif text-[#3b2f2f]">Suporte & IA Zyph</h2>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-[#d9a65a]" /> Online
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div ref={containerRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50 space-y-6 scroll-smooth">
                    {messages.map((msg, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl shadow-sm border ${msg.role === 'user'
                                ? 'bg-[#3b2f2f] text-white border-[#3b2f2f] rounded-tr-none'
                                : 'bg-white text-gray-800 border-gray-200 rounded-tl-none'
                                }`}>
                                {msg.role === 'assistant' && (
                                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[#d9a65a] uppercase tracking-wider">
                                        <Bot className="w-3 h-3" /> Zyph AI
                                    </div>
                                )}
                                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {formatMessage(msg.content)}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-gray-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                                <Loader className="w-4 h-4 animate-spin text-[#d9a65a]" />
                                <span className="text-sm text-gray-500 italic">Digitando...</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="max-w-4xl mx-auto w-full">
                        {/* Quick Questions */}
                        {(messages.length < 2 || !currentSessionId) && (
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                                {quickQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(q)}
                                        className="whitespace-nowrap bg-gray-50 hover:bg-[#d9a65a] hover:text-white px-4 py-2 rounded-full text-xs font-bold transition-all text-gray-600 border border-gray-200 hover:border-[#d9a65a] shadow-sm transform hover:scale-105"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3 items-center bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-[#d9a65a] focus-within:ring-1 focus-within:ring-[#d9a65a]/20 transition-all shadow-inner">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Pergunte sobre stock, vendas ou gestão..."
                                className="flex-1 p-2 bg-transparent outline-none text-sm min-w-0"
                                disabled={isLoading}
                            />
                            <button
                                title="Enviar"
                                onClick={() => handleSend()}
                                disabled={isLoading || !input.trim()}
                                className="bg-[#3b2f2f] text-[#d9a65a] w-10 h-10 rounded-xl flex items-center justify-center hover:shadow-lg hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-[10px] text-center text-gray-400 mt-2">Zyph AI pode cometer erros. Verifique informações importantes.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
