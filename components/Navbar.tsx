import React, { useState } from 'react';
import { Menu, X, Phone, Languages, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, Language } from '../translations';
import { ClientLoginModal } from './ClientLoginModal';
import { supabase } from '../services/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

interface NavItem {
  id: string;
  labelKey: keyof typeof translations['pt']['nav'];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'hero', labelKey: 'home' },
  { id: 'about', labelKey: 'about' },
  { id: 'services', labelKey: 'services' },
  { id: 'classics', labelKey: 'classics' },
  { id: 'gallery', labelKey: 'gallery' },
  { id: 'contact', labelKey: 'contact' },
];

interface NavbarProps {
  language: Language;
  toggleLanguage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ language, toggleLanguage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [manualUserPhone, setManualUserPhone] = useState<string | null>(null);
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Check manual login
    const savedPhone = localStorage.getItem('pc_auth_phone');
    if (savedPhone) setManualUserPhone(savedPhone);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setManualUserPhone(null);
      }
    });

    // Also check for manual login changes via custom event or poll
    const checkManual = () => {
      const p = localStorage.getItem('pc_auth_phone');
      setManualUserPhone(p);
    };
    window.addEventListener('storage', checkManual);
    const interval = setInterval(checkManual, 2000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', checkManual);
      clearInterval(interval);
    };
  }, []);

  const handleNavigation = (id: string) => {
    setMobileMenuOpen(false);

    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: id } });
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const Logo = ({ className = "h-12" }: { className?: string }) => (
    <img
      src="/images/logo-official.png"
      alt="Pão Caseiro Logo"
      className={`object-contain ${className}`}
    />
  );



  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f7f1eb]/90 backdrop-blur-md shadow-sm border-b border-[#3b2f2f]/5 h-20 flex items-center">
        <div className="container mx-auto px-6 grid grid-cols-3 items-center">
          {/* Left: Logo */}
          <div className="flex justify-start">
            <div className="cursor-pointer" onClick={() => handleNavigation('hero')}>
              <Logo className="h-20" />
            </div>
          </div>

          {/* Center: Nav Items (Perfectly Centered) */}
          <div className="hidden lg:flex items-center justify-center gap-8 text-sm font-bold tracking-wide uppercase text-[#4b3a2f]">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                title={t.nav[item.labelKey]}
                className="hover:text-[#d9a65a] transition-colors relative group"
                aria-label={t.nav[item.labelKey]}
              >
                {t.nav[item.labelKey]}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d9a65a] transition-all group-hover:w-full" />
              </button>
            ))}
            <button
              onClick={() => navigate('/menu')}
              title="Menu"
              className="hover:text-[#d9a65a] transition-colors relative group text-[#d9a65a]"
              aria-label="Menu"
            >
              Menu
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d9a65a] transition-all group-hover:w-full" />
            </button>
          </div>

          {/* Right Side: Language, Account, and Call button */}
          <div className="hidden lg:flex items-center justify-end gap-3 xl:gap-4">
            <button
              onClick={toggleLanguage}
              title={language === 'pt' ? 'Mudar Idioma' : 'Change Language'}
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#3b2f2f]/10 hover:border-[#d9a65a] hover:text-[#d9a65a] transition-all"
              aria-label="Toggle Language"
            >
              <Languages className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{language}</span>
            </button>

            {(user || manualUserPhone) ? (
              <button
                onClick={() => navigate('/dashboard')}
                title={t.nav.myAccount}
                className="flex items-center gap-2 text-[#3b2f2f] px-4 py-2 rounded-full font-bold hover:bg-[#d9a65a]/10 transition-all border border-[#d9a65a]/20 bg-[#d9a65a]/5 group"
                aria-label={t.nav.myAccount}
              >
                <div className="w-8 h-8 rounded-full bg-[#d9a65a] flex items-center justify-center text-[#3b2f2f] group-hover:bg-[#3b2f2f] group-hover:text-[#d9a65a] transition-colors overflow-hidden">
                  {JSON.parse(localStorage.getItem('pc_user_data') || '{}')?.avatar_url ? (
                    <img
                      src={JSON.parse(localStorage.getItem('pc_user_data') || '{}')?.avatar_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-black uppercase">
                      {(user?.email || manualUserPhone || '?')[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="hidden xl:inline">{t.nav.myAccount}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                title={t.nav.login}
                className="flex items-center gap-2 text-[#3b2f2f] px-4 py-2 rounded-full font-bold hover:bg-[#d9a65a] hover:text-[#3b2f2f] transition-all border border-[#3b2f2f]/10"
                aria-label={t.nav.login}
              >
                <div className="w-8 h-8 rounded-full bg-[#3b2f2f]/5 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#d9a65a]" />
                </div>
                <span>{t.nav.login}</span>
              </button>
            )}

            <a
              href="tel:+258879146662"
              className="flex items-center gap-2 xl:gap-3 bg-[#d9a65a] text-[#3b2f2f] px-4 xl:px-6 py-3 rounded-xl font-bold hover:bg-[#c2934f] transition-all text-sm whitespace-nowrap"
              title={t.nav.callUs}
              aria-label={t.nav.callUs}
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">+258 87 9146 662</span>
              <span className="sm:hidden">Ligar</span>
            </a>
          </div>

          {/* Mobile Actions Overlay Trigger */}
          <div className="lg:hidden flex items-center justify-end gap-4">
            <button
              id="mobile-menu-toggle"
              className="text-[#3b2f2f]"
              onClick={() => setMobileMenuOpen(true)}
              title={t.nav.openMenu}
              aria-label={t.nav.openMenu}
            >
              <Menu className="w-8 h-8" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[60] bg-[#3b2f2f] text-[#f7f1eb] flex flex-col items-center justify-center gap-8"
          >
            <button
              id="mobile-menu-close"
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full"
              onClick={() => setMobileMenuOpen(false)}
              title={t.nav.closeMenu}
              aria-label={t.nav.closeMenu}
            >
              <X className="w-8 h-8" />
            </button>

            <Logo className="h-24 mb-8 brightness-0 invert" />

            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleNavigation(item.id)}
                className="text-3xl font-serif hover:text-[#d9a65a] transition-colors"
                title={t.nav[item.labelKey]}
                aria-label={t.nav[item.labelKey]}
              >
                {t.nav[item.labelKey]}
              </button>
            ))}
            <button
              id="mobile-nav-menu"
              onClick={() => { navigate('/menu'); setMobileMenuOpen(false); }}
              className="text-3xl font-serif hover:text-[#d9a65a] transition-colors text-[#d9a65a]"
              title="Ver Menu"
              aria-label="Ver Menu"
            >
              Ver Menu
            </button>

            <button
              onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 hover:border-[#d9a65a] hover:text-[#d9a65a] transition-all mt-4"
              title={language === 'pt' ? 'Mudar para Inglês' : 'Change to Portuguese'}
            >
              <Languages className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">{language === 'pt' ? 'English' : 'Português'}</span>
            </button>

            {/* Mobile Login/Account Button */}
            {(user || manualUserPhone) ? (
              <button
                onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 bg-[#f7f1eb]/10 px-8 py-4 rounded-full border border-white/20 hover:border-[#d9a65a] transition-all"
                title={t.nav.myAccount}
              >
                <div className="w-8 h-8 rounded-full bg-[#d9a65a] flex items-center justify-center text-[#3b2f2f]">
                  <span className="text-xs font-black uppercase">
                    {(user?.email || manualUserPhone || '?')[0].toUpperCase()}
                  </span>
                </div>
                <span className="font-bold">{t.nav.myAccount}</span>
              </button>
            ) : (
              <button
                onClick={() => { setIsLoginModalOpen(true); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 bg-[#d9a65a] text-[#3b2f2f] px-8 py-4 rounded-full font-bold hover:bg-white transition-all shadow-lg"
                title={t.nav.login}
              >
                <User className="w-6 h-6" />
                <span>{t.nav.login}</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ClientLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        language={language}
      />
    </>
  );
};
