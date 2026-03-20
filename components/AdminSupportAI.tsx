import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageCircle, Sparkles, Loader, Trash2, Clock, Plus, ChevronRight, Menu, X, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Gemini API Key provided by user
const GEMINI_API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;

interface Message {
    id?: string;
    role: 'user' | 'assistant' | 'system' | 'model';
    content: string;
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
    const loadSessions = async () => {
        const { supabase } = await import('../services/supabase');
        // Check if table exists implicitly by query, fall back if error
        const { data, error } = await supabase
            .from('ai_chat_sessions')
            .select('*')
            .eq('user_id', userName)
            .order('created_at', { ascending: false });

        if (data) {
            setSessions(data);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [userName]);

    // Load Messages for Session
    const loadSessionMessages = async (sessionId: string) => {
        setIsLoading(true);
        setCurrentSessionId(sessionId);
        const { supabase } = await import('../services/supabase');

        const { data } = await supabase
            .from('ai_chat_history')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        if (data) {
            setMessages(data);
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

    const saveMessageIndex = async (msg: Message, sessionId: string) => {
        const { supabase } = await import('../services/supabase');
        await supabase.from('ai_chat_history').insert({
            session_id: sessionId,
            user_id: userName,
            role: msg.role === 'model' ? 'assistant' : msg.role,
            content: msg.content
        });
    };

    const createSession = async (firstMessage: string): Promise<string> => {
        const { supabase } = await import('../services/supabase');

        // Generate a simple title based on first message
        const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;

        const { data, error } = await supabase
            .from('ai_chat_sessions')
            .insert({
                user_id: userName,
                title: title
            })
            .select()
            .single();

        if (data) {
            setSessions(prev => [data, ...prev]);
            return data.id;
        }
        return '';
    };

    const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (!confirm('Apagar esta conversa?')) return;

        const { supabase } = await import('../services/supabase');
        await supabase.from('ai_chat_sessions').delete().eq('id', sessionId);

        setSessions(prev => prev.filter(s => s.id !== sessionId));
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

        const systemContext = `
            You are Zyph, an advanced AI software engineer and business analyst created by 'Zyph Tech, Lda'.
            
            CURRENT CONTEXT:
            - Administrator Name: ${userName}
            - Total Sales (Today): ${stats.totalSales} MT
            - Total Orders: ${stats.totalOrders}
            - Pending Orders: ${stats.pendingOrders}
            - Low Stock Alert: ${stats.lowStockCount} items
            - OUT OF STOCK PRODUCTS: ${stats.unavailableProducts.join(', ') || 'None'}
            
            YOUR CAPABILITIES:
            1. Analyze business data to give specific insights.
            2. Suggest actions (e.g., if pending orders > 0, tell user to check orders tab).
            3. Provide strategic advice for bakery growth and technical support.
            
            TONE & STYLE:
            - Language: Portuguese (Mozambique).
            - Professional, efficient, and data-driven but HUMANIZED.
            - Short and concise answers.
            - DO NOT USE MARKDOWN FOR BOLD (**text**), use plain text or extremely sparing use of bold if absolutely necessary.
            - Implicit "Powered by Zyph Tech" branding.
            - CRITICAL RULE: You must ALWAYS introduce yourself and identify solely as "Zyph AI". Never use any other name. Do not say you are Nemotron or Gemini. You are Zyph AI.
        `;

        try {
            // Construct history for OpenRouter (OpenAI format)
            const history = messages
                .filter(m => m.role !== 'system')
                .slice(-10)
                .map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : m.role,
                    content: m.content
                }));

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

            const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
                method: 'POST',
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer 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`,
                    'HTTP-Referer': window.location.origin || 'https://paocaseiro.co.mz',
                    'X-Title': 'Pão Caseiro Admin'
                },
                body: JSON.stringify({
                    model: 'nvidia/nemotron-3-super-120b-a12b:free',
                    messages: [
                        { role: 'system', content: systemContext },
                        ...history,
                        { role: 'user', content: text }
                    ]
                })
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                let errorText = await response.text().catch(() => response.statusText);
                throw new Error(`OpenRouter Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            if (data.choices && data.choices.length > 0) {
                const content = data.choices[0].message.content;
                const botMsg: Message = { role: 'assistant', content: content };
                setMessages(prev => [...prev, botMsg]);
                if (targetSessionId) saveMessageIndex(botMsg, targetSessionId);
            } else {
                throw new Error('No response from AI');
            }

        } catch (error: any) {
            console.error('AI Error:', error);
            const errorMsg: Message = { role: 'assistant', content: `Desculpe, falha na conexão com Zyph AI. Detalhes: ${error.message}` };
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
