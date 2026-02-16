import React, { useState, useMemo } from 'react';
import { Language, translations } from '../translations';
import { X, Calendar, Clock, MessageSquare, User, Phone, Search, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';

interface ScheduleOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    menuSections: { title: string; items: any[] }[];
}

export const ScheduleOrderModal: React.FC<ScheduleOrderModalProps> = ({ isOpen, onClose, language, menuSections = [] }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');

    // Product Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ item: any; quantity: number }[]>([]);

    if (!isOpen) return null;

    // Safety check for menuSections
    const safeSections = Array.isArray(menuSections) ? menuSections : [];

    const filteredSections = useMemo(() => {
        if (!searchTerm) return safeSections;
        return safeSections.map(section => ({
            ...section,
            items: Array.isArray(section.items) ? section.items.filter(item =>
                (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.desc && item.desc.toLowerCase().includes(searchTerm.toLowerCase()))
            ) : []
        })).filter(section => section.items.length > 0);
    }, [safeSections, searchTerm]);

    const addToSelection = (item: any) => {
        if (!item || !item.name) return;
        setSelectedItems(prev => {
            const existing = prev.find(i => i.item.name === item.name);
            if (existing) {
                return prev.map(i => i.item.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const removeFromSelection = (itemName: string) => {
        setSelectedItems(prev => prev.filter(i => i.item.name !== itemName));
    };

    const updateQuantity = (itemName: string, delta: number) => {
        setSelectedItems(prev => prev.map(i => {
            if (i.item.name === itemName) {
                return { ...i, quantity: Math.max(1, i.quantity + delta) };
            }
            return i;
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        let itemsText = '';
        if (selectedItems.length > 0) {
            itemsText = `*Itens Selecionados:*%0A` + selectedItems.map(i => `- ${i.quantity}x ${i.item.name}`).join('%0A') + `%0A%0A`;
        }

        const message = `*Agendamento de Encomenda*%0A%0A` +
            `*Nome:* ${name}%0A` +
            `*Telefone:* ${phone}%0A` +
            `*Data:* ${date}%0A` +
            `*Hora:* ${time}%0A%0A` +
            itemsText +
            `*Notas/Detalhes:*%0A${notes || 'Nenhum'}`;

        const whatsappUrl = `https://wa.me/258846930960?text=${message}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl my-8 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col md:flex-row max-h-[90vh]">

                {/* Left Side: Order Form */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto bg-gray-50 border-r border-gray-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6 md:hidden">
                        <h2 className="text-xl font-serif font-bold text-[#3b2f2f]">
                            {language === 'pt' ? 'Agendar' : 'Schedule'}
                        </h2>
                        <button onClick={onClose} className="hover:bg-gray-200 p-1 rounded-full transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <h3 className="text-lg font-bold text-[#3b2f2f] mb-4 flex items-center gap-2">
                        <User size={20} className="text-[#d9a65a]" />
                        {language === 'pt' ? 'Seus Dados' : 'Your Details'}
                    </h3>

                    <form id="schedule-form" onSubmit={handleSubmit} className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{language === 'pt' ? 'Nome' : 'Name'}</label>
                            <input required type="text" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#d9a65a] outline-none bg-white"
                                value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{language === 'pt' ? 'Telefone' : 'Phone'}</label>
                            <input required type="tel" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#d9a65a] outline-none bg-white"
                                value={phone} onChange={e => setPhone(e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{language === 'pt' ? 'Data' : 'Date'}</label>
                                <input required type="date" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#d9a65a] outline-none bg-white"
                                    value={date} onChange={e => setDate(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">{language === 'pt' ? 'Hora' : 'Time'}</label>
                                <input required type="time" className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#d9a65a] outline-none bg-white"
                                    value={time} onChange={e => setTime(e.target.value)} />
                            </div>
                        </div>

                        {/* Selected Items Summary for Mobile mainly, but useful here too */}
                        {selectedItems.length > 0 && (
                            <div className="mt-6 bg-white p-4 rounded-xl border border-[#d9a65a]/20 shadow-sm">
                                <h4 className="font-bold text-[#3b2f2f] mb-3 flex items-center gap-2">
                                    <ShoppingBag size={18} />
                                    {language === 'pt' ? 'Itens Selecionados' : 'Selected Items'}
                                </h4>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {selectedItems.map((selection, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <button type="button" onClick={() => updateQuantity(selection.item.name, -1)} className="p-1 hover:bg-gray-200 rounded"><Minus size={12} /></button>
                                                <span className="font-bold w-4 text-center">{selection.quantity}</span>
                                                <button type="button" onClick={() => updateQuantity(selection.item.name, 1)} className="p-1 hover:bg-gray-200 rounded"><Plus size={12} /></button>
                                                <span className="ml-2 truncate max-w-[120px]">{selection.item.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-[#d9a65a]">{selection.item.price * selection.quantity} MT</span>
                                                <button type="button" onClick={() => removeFromSelection(selection.item.name)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t flex justify-between font-bold text-[#3b2f2f]">
                                    <span>Total Estimado:</span>
                                    <span>{selectedItems.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0)} MT</span>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2 pt-4">
                            <label className="text-sm font-medium text-gray-700">{language === 'pt' ? 'Notas Adicionais' : 'Additional Notes'}</label>
                            <textarea rows={2} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#d9a65a] outline-none bg-white resize-none"
                                value={notes} onChange={e => setNotes(e.target.value)}
                                placeholder={language === 'pt' ? 'Mensagem opcional...' : 'Optional message...'} />
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-4"
                        >
                            <MessageSquare size={20} />
                            {language === 'pt' ? 'Agendar via WhatsApp' : 'Schedule via WhatsApp'}
                        </button>
                    </form>
                </div>

                {/* Right Side: Product Selector */}
                <div className="w-full md:w-1/2 bg-white flex flex-col h-[500px] md:h-auto">
                    <div className="p-4 border-b flex justify-between items-center bg-[#3b2f2f] text-white">
                        <div className="relative flex-1 mr-4">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder={language === 'pt' ? "Procurar produtos..." : "Search products..."}
                                className="w-full pl-10 pr-4 py-2 rounded-full bg-white/10 border border-white/20 text-white placeholder-gray-300 focus:outline-none focus:bg-white/20 focus:ring-2 focus:ring-[#d9a65a]"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors hidden md:block">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        {filteredSections.map((section, idx) => (
                            <div key={idx}>
                                <h4 className="font-serif font-bold text-lg text-[#d9a65a] mb-3 sticky top-0 bg-white py-2 z-10 border-b border-gray-100">
                                    {section.title}
                                </h4>
                                <div className="space-y-3">
                                    {Array.isArray(section.items) && section.items.map((item: any, i: number) => {
                                        const isSelected = selectedItems.find(si => si.item.name === item.name);
                                        return (
                                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${isSelected ? 'border-[#d9a65a] bg-[#d9a65a]/5' : 'border-gray-100 hover:border-gray-200'} transition-all group`}>
                                                <div className="flex items-center gap-3">
                                                    {item.image && (
                                                        <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-[#3b2f2f] text-sm">{item.name || 'Sem nome'}</p>
                                                        <p className="text-[#d9a65a] font-bold text-sm">{item.price} MT</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => addToSelection(item)}
                                                    className={`p-2 rounded-full transition-colors ${isSelected ? 'bg-[#d9a65a] text-white' : 'bg-gray-100 text-gray-600 hover:bg-[#d9a65a] hover:text-white'}`}
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {filteredSections.length === 0 && (
                            <div className="text-center py-10 text-gray-400">
                                {language === 'pt' ? 'Nenhum produto encontrado.' : 'No products found.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
