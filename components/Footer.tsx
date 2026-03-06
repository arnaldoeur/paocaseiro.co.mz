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
    { id: 'gallery', labelKey: 'gallery' },
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
                    <div className="lg:col-span-2 space-y-4 flex flex-col items-start text-left">
                        <img
                            src="/paocaseiropng.png"
                            alt="Pão Caseiro"
                            className="h-24 object-contain drop-shadow-lg"
                        />
                        <p className="leading-relaxed max-w-md text-sm">
                            {t.footer.description}
                        </p>
                    </div>

                    {/* 2. Quick Links */}
                    <div className="flex flex-col items-start text-left">
                        <h4 className="font-serif text-xl text-[#d9a65a] mb-4">{t.footer.quickLinks}</h4>
                        <ul className="w-full grid grid-cols-2 gap-2 text-sm md:block md:space-y-2">
                            {NAV_ITEMS.map((item) => (
                                <li key={item.id}>
                                    <button
                                        onClick={() => handleNavigation(item.id)}
                                        className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center gap-2"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#d9a65a]" />
                                        {t.nav[item.labelKey]}
                                    </button>
                                </li>
                            ))}
                            <li>
                                <button
                                    onClick={() => navigate('/menu')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center gap-2 font-bold text-[#d9a65a]"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#d9a65a]" />
                                    Menu
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => navigate('/privacidade')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center gap-2 text-xs"
                                >
                                    <span className="w-1 h-1 rounded-full bg-[#d9a65a]/50" />
                                    Política de Privacidade
                                </button>
                            </li>
                            <li>
                                <button
                                    onClick={() => navigate('/termos')}
                                    className="hover:text-[#d9a65a] hover:translate-x-2 transition-all duration-300 flex items-center gap-2 text-xs"
                                >
                                    <span className="w-1 h-1 rounded-full bg-[#d9a65a]/50" />
                                    Termos de Serviço
                                </button>
                            </li>
                        </ul>
                    </div>

                    {/* 3. Contact Info */}
                    <div className="flex flex-col items-start text-left">
                        <h4 className="font-serif text-xl text-[#d9a65a] mb-4">{t.footer.contacts}</h4>
                        <div className="space-y-3 w-full flex flex-col items-start text-sm">
                            <a
                                href="https://www.google.com/maps/search/?api=1&query=Lichinga+Av.+Acordo+de+Lusaka"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 group hover:opacity-80 transition-opacity"
                            >
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors mt-0.5">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="block text-[#f7f1eb] font-bold">{t.contact.visit.locationLabel}</span>
                                    <span>{t.contact.visit.location}</span>
                                </div>
                            </a>

                            <a href="tel:+258879146662" className="flex items-start gap-3 group hover:opacity-80 transition-opacity">
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors mt-0.5">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="block text-[#f7f1eb] font-bold">Telefone</span>
                                    <span>+258 87 9146 662</span>
                                </div>
                            </a>

                            <a href="https://wa.me/258846930960" target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group hover:opacity-80 transition-opacity">
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors mt-0.5">
                                    <MessageCircle className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="block text-[#f7f1eb] font-bold">WhatsApp</span>
                                    <span>+258 84 6930 960</span>
                                </div>
                            </a>

                            {/* Email */}
                            <div className="flex items-start gap-3 group">
                                <div className="bg-[#d9a65a]/10 p-2 rounded-full text-[#d9a65a] group-hover:bg-[#d9a65a] group-hover:text-[#2a2121] transition-colors mt-0.5">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="block text-[#f7f1eb] font-bold">{t.contact.visit.emailLabel}</span>
                                    {t.contact.visit.emails.map((email: string, index: number) => (
                                        <a key={index} href={`mailto:${email}`} className="block hover:text-[#d9a65a] transition-colors">
                                            {email}
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Socials */}
                            <div className="flex gap-4 pt-4">
                                {[
                                    { Icon: Instagram, href: 'https://www.instagram.com/paocaseirolxg/' },
                                    { Icon: Facebook, href: '#' },
                                    { Icon: Mail, href: 'mailto:info@paocaseiro.co.mz' }
                                ].map(({ Icon, href }, i) => (
                                    <a key={i} href={href} target="_blank" rel="noopener noreferrer" title={Icon === Instagram ? 'Instagram' : Icon === Facebook ? 'Facebook' : 'E-mail'} className="bg-[#f7f1eb]/5 hover:bg-[#d9a65a] hover:text-[#2a2121] p-3 rounded-full transition-all duration-300">
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
