import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

export const AdminChat = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInput('');
        setLoading(true);

        try {
            const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

            // Construct history for context
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [...history, { role: 'user', parts: [{ text: userMsg }] }],
                    systemInstruction: {
                        parts: [{ text: "Você é um assistente útil e amigável para a administração da Padaria Pão Caseiro. Ajude com dicas de gestão, análise de vendas, marketing e receitas. Responda sempre em Português de forma profissional e encorajadora." }]
                    }
                })
            });
            const data = await response.json();
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar sua solicitação.";
            setMessages(prev => [...prev, { role: 'model', text: reply }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: "Erro de conexão com o Assistente." }]);
        }
        setLoading(false);
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 bg-[#3b2f2f] text-[#d9a65a] p-4 rounded-full shadow-2xl hover:scale-110 transition-all z-50 flex items-center gap-2 group border-2 border-[#d9a65a]"
            >
                <Sparkles className="w-6 h-6 animate-pulse" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 font-bold whitespace-nowrap">IA Support</span>
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-[#d9a65a]/20 overflow-hidden z-50 flex flex-col max-h-[600px] animate-fade-in-up">
                    <div className="bg-[#3b2f2f] p-4 flex justify-between items-center text-white border-b border-[#d9a65a]/30">
                        <div className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-[#d9a65a]" />
                            <div>
                                <h3 className="font-bold text-sm leading-tight">Assistente Admin</h3>
                                <p className="text-[10px] text-[#d9a65a]/80">Powered by Gemini</p>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto bg-[#f9f9f9] space-y-3 h-80 min-h-[300px]">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 text-sm mt-10">
                                <Bot className="w-12 h-12 mx-auto mb-3 opacity-20 text-[#3b2f2f]" />
                                <p>Olá! Como posso ajudar na gestão da padaria hoje?</p>
                                <div className="mt-4 flex flex-wrap justify-center gap-2">
                                    {["Resumo de vendas?", "Dica de marketing", "Ideia de receita"].map(s => (
                                        <button key={s} onClick={() => { setInput(s); handleSend(); }} className="text-xs bg-white border px-2 py-1 rounded-full hover:bg-gray-100 transition-colors">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${m.role === 'user' ? 'bg-[#3b2f2f] text-white rounded-br-none' : 'bg-white border text-gray-800 rounded-bl-none'}`}>
                                    {m.role === 'model' && <Bot className="w-3 h-3 mb-1 text-[#d9a65a]" />}
                                    <div className="markdown-prose">{m.text}</div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 ml-2">
                                <Bot className="w-4 h-4 animate-bounce" />
                                <span>Processando...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-white border-t flex gap-2">
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Digite sua dúvida..."
                            className="flex-1 text-sm p-2 bg-gray-50 border rounded-lg focus:border-[#d9a65a] focus:bg-white outline-none transition-colors"
                        />
                        <button onClick={handleSend} disabled={loading || !input.trim()} className="bg-[#d9a65a] text-[#3b2f2f] p-2 rounded-lg disabled:opacity-50 hover:brightness-110 transition-all">
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
