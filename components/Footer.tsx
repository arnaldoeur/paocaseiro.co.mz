import React from 'react';
import { MapPin, Phone, MessageCircle, Instagram, Facebook, Mail } from 'lucide-react';
import { translations, Language } from '../translations';
import { useNavigate, useLocation } from 'react-router-dom';

interface FooterProps {
    language: Language;
}

const NAV_ITEMS = [
    { id: 'hero', labelKey: 'home' },
    { id: 'about', labelKey: 'about' },
    { id: 'services', labelKey: 'services' },
    { id: 'classics', labelKey: 'classics' },
    { id: 'contact', labelKey: 'contact' },
] as const;

export const Footer: React.FC<FooterProps> = ({ language }) => {
    const t = translations[language];
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (id: string) => {
        if (location.pathname !== '/') {
            navigate('/', { state: { scrollTo: id } });
        } else {
            const element = document.getElementById(id);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <footer className="bg-[#2a2121] text-[#f7f1eb]/70 py-12 border-t border-[#d9a65a]/20 font-sans relative overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* 1. Brand & Description */}
                    <div className="lg:col-span-2 space-y-4 flex flex-col items-center text-center md:items-start md:text-left">
                        <img
                            src="/logo_on_dark.png"
                            alt="Pão Caseiro"
                            className="h-24 object-contain drop-shadow-lg"
                        />
                        <p className="leading-relaxed max-w-md text-sm">
                            {t.footer.description}
                        </p>
                    </div>

                    {/* 2. Quick Links */}
                    <div className="flex flex-col items-center text-center md:items-start md:text-left">
                        <div className="inline-block text-left">
                            <h4 className="font-serif text-xl text-[#d9a65a] mb-4 text-center md:text-left">{t.footer.quickLinks}</h4>
                            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:block md:space-y-2">
                            {NAV_ITEMS.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleNavigation(item.id)}
                                        className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center justify-center md:justify-start gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#d9a65a] shrink-0" />
                                        {t.nav[item.labelKey]}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    onClick={() => navigate('/gallery')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center justify-center md:justify-start gap-2 text-[#f7f1eb]/80"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#d9a65a] shrink-0" />
                                    {language === 'pt' ? 'Galeria' : 'Gallery'}
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => navigate('/menu')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center justify-center md:justify-start gap-2 font-bold text-[#d9a65a]"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#d9a65a] shrink-0" />
                                    {language === 'en' ? 'Menu' : 'Menu'}
                                </button>
                            </li>

                            <li>
                                <button
                                    onClick={() => navigate('/privacidade')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center justify-center md:justify-start gap-2 text-xs"
                                >
                                    <span className="w-1 h-1 rounded-full bg-[#d9a65a]/50 shrink-0" />
                                    Política de Privacidade
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => navigate('/termos')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center justify-center md:justify-start gap-2 text-xs"
                                >
                                    <span className="w-1 h-1 rounded-full bg-[#d9a65a]/50 shrink-0" />
                                    Termos de Serviço
                                </button>
                            </li>
                        </ul>
                        </div>
                    </div>

                    {/* 3. Contact Info */}
                    <div className="flex flex-col items-center text-center md:items-start md:text-left">
                        <h4 className="font-serif text-xl text-[#d9a65a] mb-4">{t.footer.contacts}</h4>
                        <div className="space-y-4 w-full flex flex-col items-center md:items-start text-sm">
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=Lichinga+Av.+Acordo+de+Lusaka"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-4 group hover:opacity-80 transition-opacity w-full max-w-xs md:max-w-none"
                            >
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors shrink-0">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[#f7f1eb] font-bold text-sm">{t.contact.visit.locationLabel}</span>
                                    <span className="text-xs opacity-80">{t.contact.visit.location}</span>
                                </div>
                            </a>

                            <a href="tel:+258879146662" className="flex items-center gap-4 group hover:opacity-80 transition-opacity w-full max-w-xs md:max-w-none">
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors shrink-0">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[#f7f1eb] font-bold text-sm">Telefone / Encomendas</span>
                                    <span className="text-xs opacity-80">+258 87 9146 662</span>
                                </div>
                            </a>

                            <a href="https://wa.me/258879146662" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 group hover:opacity-80 transition-opacity w-full max-w-xs md:max-w-none">
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors shrink-0">
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[#f7f1eb] font-bold text-sm">WhatsApp</span>
                                    <span className="text-xs opacity-80">+258 87 9146 662</span>
                                </div>
                            </a>

                            {/* Email */}
                            <div className="flex items-center gap-4 group w-full max-w-xs md:max-w-none justify-start">
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors shrink-0">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-[#f7f1eb] font-bold text-sm">{t.contact.visit.emailLabel}</span>
                                    {t.contact.visit.emails.map((email: string, index: number) => (
                                        <a key={index} href={`mailto:${email}`} className="block hover:text-[#d9a65a] transition-colors text-xs opacity-80">
                                            {email}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Socials */}
                            <div className="flex justify-center md:justify-start gap-3 pt-6 w-full">
                                {[
                                    { Icon: Instagram, href: 'https://www.instagram.com/paocaseiro.co.mz' },
                                    { Icon: Facebook, href: 'http://facebook.com/paocaseiro.co.mz/' },
                                    { Icon: Mail, href: 'mailto:geral@paocaseiro.co.mz' }
                                ].map(({ Icon, href }, i) => (
                                    <a 
                                        key={i} 
                                        href={href} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        title={Icon === Instagram ? 'Instagram' : Icon === Facebook ? 'Facebook' : 'E-mail'} 
                                        className="bg-[#d9a65a]/10 text-[#d9a65a] hover:bg-[#d9a65a] hover:text-[#2a2121] p-3 rounded-xl transition-all duration-300 border border-[#d9a65a]/20"
                                    >
                                        <Icon className="w-5 h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="border-t border-[#f7f1eb]/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm opacity-60 text-center md:text-left">
                    <p>{t.footer.rights.replace('{year}', new Date().getFullYear().toString())}</p>
                    <p>
                        {t.footer.designed}{' '}
                        <a
                            href="https://zyph.co.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:text-[#d9a65a] transition-colors"
                        >
                            Zyph
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};
