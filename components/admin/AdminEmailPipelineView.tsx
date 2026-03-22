import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { sendEmail } from '../../services/email';
import { Mail, Send, Save, AlertTriangle, CheckCircle, Loader, Copy, Trash2, Search, ArrowLeft, LayoutTemplate, PlusCircle, Check } from 'lucide-react';

interface Campaign {
    id: string;
    subject: string;
    title: string;
    content: string;
    status: 'draft' | 'scheduled' | 'sent' | 'template';
    target_count: number;
    created_at: string;
    sent_at: string | null;
}

export const AdminEmailPipelineView: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Core Layout State: 'campaigns' | 'templates'
    const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');

    // Editor state
    const [currentCampaign, setCurrentCampaign] = useState<Campaign | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [subject, setSubject] = useState('');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isRawHtml, setIsRawHtml] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    
    // Status
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [actionResult, setActionResult] = useState<{ success?: string; error?: string } | null>(null);

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('email_campaigns')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setCampaigns(data || []);
        } catch (error: any) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewCampaign = () => {
        setCurrentCampaign(null);
        setSubject('');
        setTitle('');
        setContent('');
        setIsRawHtml(false);
        setActionResult(null);
        setActiveTab('campaigns');
        setIsEditing(true);
    };

    const handleNewTemplate = () => {
        setCurrentCampaign(null);
        setSubject('Novo Modelo Personalizado');
        setTitle('');
        setContent('');
        setIsRawHtml(false);
        setActionResult(null);
        setActiveTab('templates');
        setIsEditing(true);
    };

    const handleEdit = (cam: Campaign) => {
        setCurrentCampaign(cam);
        setSubject(cam.subject);
        setTitle(cam.title);
        
        const isRaw = cam.content.includes('<!--RAW_HTML-->') || cam.content.trim().startsWith('<html') || cam.content.trim().startsWith('<!DOCTYPE');
        setIsRawHtml(isRaw);
        setContent(cam.content.replace('<!--RAW_HTML-->\n', '').replace('<!--RAW_HTML-->', ''));
        
        setActionResult(null);
        setIsEditing(true);
    };

    const loadSavedTemplate = (templateCam: Campaign) => {
        setSubject(templateCam.subject);
        setTitle(templateCam.title);
        const isRaw = templateCam.content.includes('<!--RAW_HTML-->') || templateCam.content.trim().startsWith('<html') || templateCam.content.trim().startsWith('<!DOCTYPE');
        setIsRawHtml(isRaw);
        setContent(templateCam.content.replace('<!--RAW_HTML-->\n', '').replace('<!--RAW_HTML-->', ''));
        setShowTemplatePicker(false);
    };

    const handleSaveEntity = async (forceStatus?: 'draft' | 'template') => {
        if (!subject || !title) {
            setActionResult({ error: 'Assunto e Título são origatórios.' });
            return;
        }
        setSaving(true);
        setActionResult(null);
        
        
        let finalContent = content;
        if (isRawHtml && !finalContent.includes('<!--RAW_HTML-->')) {
            finalContent = '<!--RAW_HTML-->\n' + finalContent;
        }

        const targetStatus = forceStatus || (activeTab === 'templates' ? 'template' : 'draft');
        const payload = { subject, title, content: finalContent, status: targetStatus };

        try {
            if (currentCampaign && !currentCampaign.id.startsWith('sys_')) {
                const { error, data } = await supabase.from('email_campaigns').update(payload).eq('id', currentCampaign.id).select().single();
                if (error) throw error;
                if (data) setCurrentCampaign(data);
            } else {
                const { data, error } = await supabase.from('email_campaigns').insert([payload]).select().single();
                if (error) throw error;
                if (data) setCurrentCampaign(data);
            }
            setActionResult({ success: targetStatus === 'template' ? 'Modelo guardado com sucesso!' : 'Rascunho gravado com sucesso!' });
            loadCampaigns();
        } catch (error: any) {
            setActionResult({ error: 'Erro ao guardar: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleSend = async () => {
        if (!subject || !title || !content) {
            setActionResult({ error: 'Preencha todos os campos antes de enviar.' });
            return;
        }

        if (activeTab === 'templates') {
            setActionResult({ error: 'Não é possível disparar modelos. Crie uma campanha a partir deste modelo se desejar.' });
            return;
        }

        if (!window.confirm('Atenção: A campanha será enviada agora para TODA a base de assinantes.')) return;

        setSending(true);
        setActionResult(null);

        try {
            const { data: subscribers, error: subsError } = await supabase.from('newsletter_subscribers').select('email');
            if (subsError) throw subsError;

            if (!subscribers || subscribers.length === 0) {
                setActionResult({ error: 'A base de subscritores está vazia.' });
                setSending(false);
                return;
            }

            const emails = subscribers.map(sub => sub.email);
            let campaignId = currentCampaign?.id;
            
            let finalContent = content;
            if (isRawHtml && !finalContent.includes('<!--RAW_HTML-->')) {
                finalContent = '<!--RAW_HTML-->\n' + finalContent;
            }

            const payload = {
                subject,
                title,
                content: finalContent,
                status: 'sent',
                sent_at: new Date().toISOString(),
                target_count: emails.length
            };

            if (campaignId) {
                await supabase.from('email_campaigns').update(payload).eq('id', campaignId);
            } else {
                const { data } = await supabase.from('email_campaigns').insert([payload]).select().single();
                campaignId = data?.id;
            }

            const domain = typeof window !== 'undefined' ? window.location.origin : 'https://paocaseiro.co.mz';
            
            let htmlContent = '';
            
            if (isRawHtml) {
                // Send raw HTML exactly as the user provided
                htmlContent = content;
            } else {
                // Wrap in standard Pão Caseiro standard branding
                htmlContent = `
                    <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; color: #3b2f2f;">
                        <div style="background-color: #3b2f2f; padding: 20px; text-align: center;">
                            <img src="${domain}/logo_on_dark.png" alt="Pão Caseiro" style="height: 50px; max-width: 100%;">
                        </div>
                        <div style="padding: 30px; background-color: #f7f1eb;">
                            <h1 style="color: #d9a65a; font-family: 'Playfair Display', serif; margin-top: 0;">${title}</h1>
                            <div style="line-height: 1.6;">
                                ${content.replace(/\\n/g, '<br/>')}
                            </div>
                        </div>
                        <div style="background-color: #3b2f2f; color: white; padding: 20px; text-align: center; font-size: 12px;">
                            <p>Recebeu este email porque subscreveu a newsletter da Pão Caseiro.</p>
                            <p>© ${new Date().getFullYear()} Pão Caseiro - Lichinga, Niassa.</p>
                        </div>
                    </div>
                `;
            }

            for (let i = 0; i < emails.length; i += 50) {
                const chunk = emails.slice(i, i + 50);
                await sendEmail(chunk, subject, htmlContent);
            }

            // Important: Avoiding literal backticks nested inside the react component code which broke vite parser earlier.
            setActionResult({ 
                success: 'Soberbo! Foram informados ' + emails.length + ' leitores com sucesso!'
            });
            setIsEditing(false);
            loadCampaigns();
        } catch (error: any) {
            setActionResult({ error: 'Erro no servidor: ' + error.message });
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm('Eliminar permanentemente este registo?')) return;
        try {
            await supabase.from('email_campaigns').delete().eq('id', id);
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (error: any) {
            alert('Falha ao eliminar.');
        }
    };

    // Default System Templates injected
    const systemTemplates: Campaign[] = [
        { id: 'sys_1', subject: 'Aproveite a Nossa Promoção Exclusiva!', title: 'Oferta Especial: Leve Mais por Menos', content: 'Caríssimo cliente,\n\nEsta semana temos uma oferta imperdível, um desconto fantástico de 20% em todas as nossas empadas familiares.\n\nVenha saborear ou encomende já!', status: 'template', target_count: 0, created_at: new Date().toISOString(), sent_at: null },
        { id: 'sys_2', subject: 'Novidade Fresca a Sair do Forno!', title: 'Conheça a Nossa Nova Receita', content: 'Bom dia,\n\nAcabamos de lançar um novo produto no nosso menu. Depois de muitos pedidos, o Pão de Deus com Creme Dourado está finalmente disponível!\n\nFaça já a sua prova.', status: 'template', target_count: 0, created_at: new Date().toISOString(), sent_at: null },
        { id: 'sys_3', subject: 'As Festas Chegaram à Pão Caseiro!', title: 'Especial Natal: Encomendas Abertas', content: 'É a época mais maravilhosa do ano! Já abrimos as vagas para encomendas de doces natalícios. Fios de ovos, Bolo Rei clássico e muito mais.\n\nNão deixe para a última hora!', status: 'template', target_count: 0, created_at: new Date().toISOString(), sent_at: null }
    ];

    const isTemplateMode = activeTab === 'templates';
    const activeList = isTemplateMode 
        ? [...systemTemplates, ...campaigns.filter(c => c.status === 'template')] 
        : campaigns.filter(c => c.status !== 'template');
        
    const filteredList = activeList.filter(c => c.subject.toLowerCase().includes(searchTerm.toLowerCase()));
    const allTemplates = campaigns.filter(c => c.status === 'template');
    
    const combinedTemplates = [...systemTemplates, ...allTemplates];

    if (isEditing) {
        return (
            <div>
                {/* Editor Top Navigation - Uses the exact same gallery card wrapper */}
                <div className="flex justify-between items-center mb-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-[#3b2f2f] flex items-center gap-2 transition-colors uppercase text-[10px] font-bold tracking-widest bg-gray-50 px-4 py-2 rounded-xl">
                        <ArrowLeft size={16} /> Voltar ao Painel
                    </button>
                    
                    <div className="flex gap-3">
                        {currentCampaign?.status !== 'sent' && (
                            <>
                                {isTemplateMode ? (
                                    <button onClick={() => handleSaveEntity('template')} disabled={saving} className="bg-[#3b2f2f] text-[#d9a65a] px-6 py-2 rounded-xl font-bold text-sm cursor-pointer shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[150px]">
                                        {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Guardar Modelo
                                    </button>
                                ) : (
                                    <button onClick={() => handleSaveEntity('draft')} disabled={saving || sending} className="bg-white border border-[#d9a65a] text-[#d9a65a] px-6 py-2 rounded-xl font-bold text-sm cursor-pointer shadow-sm hover:bg-[#f7f1eb] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-w-[150px]">
                                        {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} Rascunhar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Editor Content Box */}
                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 max-w-4xl max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold text-[#3b2f2f] mb-6">
                        {isTemplateMode ? 'Gestor de Modelo' : (currentCampaign?.status === 'sent' ? 'Visualização Final (Enviada)' : 'Criador de Newsletter')}
                    </h2>

                    {/* Template Picker */}
                    {!isTemplateMode && currentCampaign?.status !== 'sent' && combinedTemplates.length > 0 && (
                        <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                                <LayoutTemplate size={16} /> Pretende reutilizar um formato base?
                            </span>
                            <div className="relative">
                                <button onClick={() => setShowTemplatePicker(!showTemplatePicker)} className="bg-white px-4 py-2 border border-gray-200 shadow-sm rounded-lg text-sm text-[#3b2f2f] font-medium hover:border-[#d9a65a] transition-all flex items-center gap-2">
                                    Escolher Modelo...
                                </button>
                                {showTemplatePicker && (
                                    <div className="absolute right-0 top-12 w-72 bg-white shadow-xl rounded-xl z-20 border border-gray-100 overflow-hidden">
                                        <div className="max-h-60 overflow-y-auto drop-shadow-sm">
                                            {combinedTemplates.map(t => (
                                                <button key={t.id} onClick={() => loadSavedTemplate(t)} className="w-full text-left px-4 py-3 hover:bg-[#f7f1eb] border-b border-gray-50 text-sm font-medium text-[#3b2f2f] flex flex-col transition-colors">
                                                    <span className="flex items-center gap-2">
                                                        {t.id.startsWith('sys_') && <span className="bg-[#d9a65a] text-white text-[8px] px-1.5 py-0.5 rounded-sm uppercase tracking-widest font-bold">Sistema</span>}
                                                        <span className="truncate">{t.subject}</span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {actionResult?.success && <div className="mb-6 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-2"><CheckCircle size={18}/> {actionResult.success}</div>}
                    {actionResult?.error && <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-2"><AlertTriangle size={18}/> {actionResult.error}</div>}

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Assunto (Visível na Caixa de Email)</label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                disabled={currentCampaign?.status === 'sent'}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 text-[#3b2f2f] focus:outline-none focus:border-[#d9a65a] focus:bg-white transition-all disabled:opacity-60"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Cabeçalho Design (H1 / Título Interno)</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={currentCampaign?.status === 'sent'}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-1 text-[#3b2f2f] focus:outline-none focus:border-[#d9a65a] focus:bg-white transition-all disabled:opacity-60"
                                placeholder={isRawHtml ? 'Opcional em Modo HTML Livre' : 'Insira o título principal do email'}
                            />
                        </div>
                        
                        <div className="pt-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                                    Corpo da Mensagem
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold tracking-widest uppercase ${!isRawHtml ? 'text-[#d9a65a]' : 'text-gray-400'}`}>
                                        Design Pão Caseiro
                                    </span>
                                    <button 
                                        onClick={() => setIsRawHtml(!isRawHtml)}
                                        disabled={currentCampaign?.status === 'sent'}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${isRawHtml ? 'bg-[#3b2f2f]' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isRawHtml ? 'translate-x-5' : ''}`}></div>
                                    </button>
                                    <span className={`text-[10px] font-bold tracking-widest uppercase ${isRawHtml ? 'text-[#3b2f2f]' : 'text-gray-400'}`}>
                                        Código HTML Livre
                                    </span>
                                </div>
                            </div>
                            
                            {isRawHtml ? (
                                <div className="bg-[#1e1e1e] p-1 rounded-xl mt-1">
                                    <div className="bg-[#2d2d2d] text-gray-300 text-[10px] px-3 py-1.5 rounded-t-lg font-mono flex gap-2">
                                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="ml-2">O design Padrão não será aplicado. O email será enviado exatamente como aqui programado.</span>
                                    </div>
                                    <textarea
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        disabled={currentCampaign?.status === 'sent'}
                                        rows={12}
                                        placeholder="Cole aqui o seu código HTML (ex: exportado do Mailchimp)..."
                                        className="w-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm border-0 rounded-b-lg px-4 py-4 focus:outline-none transition-all disabled:opacity-60 custom-scrollbar"
                                    />
                                </div>
                            ) : (
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    disabled={currentCampaign?.status === 'sent'}
                                    rows={8}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 mt-1 text-[#3b2f2f] focus:outline-none focus:border-[#d9a65a] focus:bg-white transition-all disabled:opacity-60 custom-scrollbar"
                                />
                            )}
                        </div>

                        {!isTemplateMode && currentCampaign?.status !== 'sent' && (
                            <div className="flex justify-end pt-4">
                                <button onClick={handleSend} disabled={sending || saving} className="bg-[#d9a65a] text-[#3b2f2f] px-8 py-3 rounded-xl font-bold cursor-pointer shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px]">
                                    {sending ? <><Loader className="animate-spin" size={20} /> Processando...</> : <><Send size={20} /> Disparar Campanha</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header Block matching Gallery/Repository UI exactly */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 gap-4">
                <div>
                    <h3 className="font-bold text-[#3b2f2f] text-lg flex items-center gap-2">
                        Painel de Marketing
                    </h3>
                    <div className="flex bg-gray-100 p-1 rounded-lg mt-3 w-max">
                        <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'campaigns' ? 'bg-white text-[#d9a65a] shadow-sm' : 'text-gray-500 hover:text-[#3b2f2f]'}`}>
                            Histórico
                        </button>
                        <button onClick={() => setActiveTab('templates')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'templates' ? 'bg-white text-[#d9a65a] shadow-sm' : 'text-gray-500 hover:text-[#3b2f2f]'}`}>
                            Templates Base
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-4 w-full md:w-auto mt-2 md:mt-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Procurar assunto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-[#d9a65a]"
                        />
                    </div>
                    <button 
                        onClick={isTemplateMode ? handleNewTemplate : handleNewCampaign}
                        className="bg-[#3b2f2f] text-[#d9a65a] px-5 py-2 rounded-xl font-bold text-sm cursor-pointer shadow-md hover:bg-black transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        <PlusCircle size={16} /> Novo {isTemplateMode ? 'Template' : 'Disparo'}
                    </button>
                </div>
            </div>

            {/* Exactly recreating Gallery cards format for Marketing artifacts */}
            {loading ? (
                <div className="flex justify-center py-10"><Loader size={32} className="text-[#d9a65a] animate-spin" /></div>
            ) : filteredList.length === 0 ? (
                <div className="text-center py-20 bg-white border border-gray-100 rounded-3xl shadow-sm">
                    <LayoutTemplate size={48} className="mx-auto mb-4 text-gray-300" />
                    <h4 className="text-[#3b2f2f] font-bold text-lg">{isTemplateMode ? 'Sem Templates' : 'Sem Histórico'}</h4>
                    <p className="text-gray-500 text-sm">{isTemplateMode ? 'Crie o seu primeiro formato de base!' : 'Crie a sua primeira campanha promocional.'}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredList.map(cam => (
                        <div key={cam.id} onClick={() => handleEdit(cam)} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all flex flex-col relative group cursor-pointer h-[160px]">
                            
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded flex items-center gap-1 ${
                                    cam.status === 'sent' ? 'bg-green-100 text-green-700' :
                                    cam.status === 'template' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {cam.id.startsWith('sys_') ? 'Sistema' : cam.status === 'sent' ? 'Lançado' : cam.status === 'template' ? 'Base' : 'Rascunho'}
                                </span>
                                
                                {cam.status === 'sent' && (
                                    <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                                        <Check size={10} /> {cam.target_count} Lidos
                                    </span>
                                )}
                            </div>
                            
                            <h4 className="text-[#3b2f2f] font-bold text-base truncate mb-1">{cam.subject || 'Sem Assunto'}</h4>
                            <p className="text-sm text-gray-500 line-clamp-2 leading-tight flex-1">
                                {cam.content || '...'}
                            </p>
                            
                            <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mt-3 pt-3 border-t border-gray-50 flex justify-between items-center">
                                <span>{cam.id.startsWith('sys_') ? '-- Permanente --' : new Date(cam.created_at).toLocaleDateString('pt-PT')}</span>
                                {cam.id.startsWith('sys_') && <span className="float-right"><LayoutTemplate size={12}/></span>}
                            </div>

                            {!cam.id.startsWith('sys_') && (
                                <button 
                                    onClick={(e) => handleDelete(e, cam.id)}
                                    className="absolute right-3 bottom-3 bg-red-500 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600 z-10"
                                    title="Eliminar definitivamente"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
