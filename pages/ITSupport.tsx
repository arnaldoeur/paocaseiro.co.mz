import React, { useState } from 'react';
import { Lock, Server, MessageSquare, CheckCircle, Clock } from 'lucide-react';

export const ITSupport: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { supabase } = await import('../services/supabase');
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .eq('username', 'admin') // Using admin account for Support panel as well
                .eq('password', password)
                .in('role', ['admin', 'support'])
                .single();

            if (data) {
                setIsAuthenticated(true);
            } else {
                alert('Acesso negado ou credenciais inválidas.');
            }
        } catch (err) {
            alert('Erro ao conectar ao sistema.');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-4">
                <div className="bg-[#2a2a2a] p-8 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                            <Server className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Zyph Tech, Lda Support</h1>
                        <p className="text-gray-400">Tech Dashboard Access</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Access Key</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#1a1a1a] border border-gray-700 text-white pl-10 p-3 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Enter secure key..."
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20">
                            Authenticate
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#1a1a1a] text-white">
            <header className="bg-[#2a2a2a] border-b border-gray-800 p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Server className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg">Zyph Tech Console</h1>
                        <p className="text-xs text-gray-400">Monitoring Pão Caseiro</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-xs font-mono bg-green-500/10 text-green-500 px-3 py-1 rounded-full border border-green-500/20">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        SYSTEM OPTIMAL
                    </span>
                    <button onClick={() => setIsAuthenticated(false)} className="text-sm font-bold text-gray-400 hover:text-white">Logout</button>
                </div>
            </header>

            <main className="p-6 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                        <h3 className="text-gray-400 text-sm font-bold mb-2">Active Tickets</h3>
                        <p className="text-3xl font-bold">0</p>
                    </div>
                    <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                        <h3 className="text-gray-400 text-sm font-bold mb-2">System Uptime</h3>
                        <p className="text-3xl font-bold text-green-500">99.9%</p>
                    </div>
                    <div className="bg-[#2a2a2a] p-6 rounded-2xl border border-gray-800">
                        <h3 className="text-gray-400 text-sm font-bold mb-2">Database Health</h3>
                        <p className="text-3xl font-bold text-blue-500">Healthy</p>
                    </div>
                </div>

                <div className="bg-[#2a2a2a] rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="font-bold text-lg">Support Ticket Queue</h2>
                        <button className="text-sm text-blue-400 hover:text-blue-300">Refresh</button>
                    </div>
                    <div className="p-12 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No active support tickets found.</p>
                    </div>
                </div>
            </main>
        </div>
    );
};
