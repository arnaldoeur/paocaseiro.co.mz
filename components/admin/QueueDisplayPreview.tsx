import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Ticket {
    id: string;
    ticket_number: string;
    counter: string;
    status: string;
}

interface QueueDisplayPreviewProps {
    callingTickets: Ticket[];
}

export const QueueDisplayPreview: React.FC<QueueDisplayPreviewProps> = ({ callingTickets }) => {
    const lastCalled = callingTickets.length > 0 ? callingTickets[0] : null;
    const recentTickets = callingTickets.slice(1, 4);

    return (
        <div className="bg-[#050505] rounded-3xl overflow-hidden shadow-2xl border border-white/5 flex flex-col h-[400px] font-sans">
            {/* Mini Header */}
            <div className="bg-white/5 py-4 px-6 flex justify-between items-center border-b border-white/5">
                <span className="text-amber-500 font-black text-[10px] uppercase tracking-[0.4em]">Pão Caseiro TV Display</span>
                <div className="flex items-center gap-2">
                    <span className="text-white/20 text-[8px] font-black uppercase tracking-widest leading-none">Live Monitoring</span>
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                </div>
            </div>

            <div className="flex-1 flex p-6 gap-6 overflow-hidden">
                {/* Main Ticket */}
                <div className="flex-[1.5] bg-white/[0.02] rounded-2xl border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     
                     <AnimatePresence mode="wait">
                        {lastCalled ? (
                            <motion.div
                                key={lastCalled.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.1 }}
                                className="text-center"
                            >
                                <div className="text-xs font-black text-amber-500/40 uppercase tracking-[0.5em] mb-4">A Chamar</div>
                                <div className="text-7xl font-black font-mono text-white mb-6 tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
                                    {lastCalled.ticket_number}
                                </div>
                                <div className="bg-amber-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                                    {lastCalled.counter || 'BALCÃO'}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="flex flex-col items-center gap-4 opacity-10">
                                <div className="w-12 h-12 border-2 border-white/20 rounded-full animate-spin-slow" />
                                <p className="text-white text-[10px] font-black uppercase tracking-widest">Posto Inativo</p>
                            </div>
                        )}
                     </AnimatePresence>
                </div>

                {/* Side List: Recent History */}
                <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-slate-500">
                        <div className="h-[1px] flex-1 bg-white/5" />
                        <p className="text-[8px] font-black uppercase tracking-[0.3em]">Histórico</p>
                        <div className="h-[1px] flex-1 bg-white/5" />
                    </div>
                    <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                        {recentTickets.map((ticket, i) => (
                            <div key={ticket.id} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center opacity-40 hover:opacity-70 transition-opacity">
                                <span className="text-xl font-mono font-black text-white leading-none mb-1">{ticket.ticket_number}</span>
                                <span className="text-[8px] font-black text-amber-500/60 uppercase tracking-widest">{ticket.counter}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mini Footer */}
            <div className="bg-white/[0.01] py-3 text-center border-t border-white/5">
                <p className="text-amber-500/30 text-[8px] uppercase tracking-[0.4em] font-black">
                    Zyph Intelligence Queue Display v2
                </p>
            </div>
        </div>
    );
};
