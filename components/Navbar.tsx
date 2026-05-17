import React, { useState, useEffect } from 'react';
import { Menu, X, Phone, Languages, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, Language } from '../translations';
import { ClientLoginModal } from './ClientLoginModal';
import { authService } from '../services/authService';
import { sendWelcomeEmail, sendAdminNewUserNotification } from '../services/email';
import { hostingerService } from '../services/hostingerService';


interface NavItem {
  id: string;
  labelKey: keyof typeof translations['pt']['nav'];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'hero', labelKey: 'home' },
  { id: 'about', labelKey: 'about' },
  { id: 'services', labelKey: 'services' },
  { id: 'classics', labelKey: 'classics' },
  { id: 'blog', labelKey: 'blog' },
  { id: 'contact', labelKey: 'contact' },
];

interface NavbarProps {
  language: Language;
  toggleLanguage: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ language, toggleLanguage }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const [manualUserPhone, setManualUserPhone] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(JSON.parse(localStorage.getItem('pc_user_data') || '{}'));
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();
  const menuLoginMaintenance = false;

  React.useEffect(() => {
    // Get initial session
    authService.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Check manual login
    const savedPhone = localStorage.getItem('pc_auth_phone');
    if (savedPhone) setManualUserPhone(savedPhone);

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setManualUserPhone(null);
        
        if (event === 'SIGNED_IN') {
          const user = session.user;
          // Note: hostinger user might have different field for created_at
          const createdAt = user.created_at || user.registration_date;
          if (createdAt) {
            const created = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const isNewUser = (now - created) < 15 * 60 * 1000; // Registration within last 15 minutes
            
            if (isNewUser) {
              const hasSent = localStorage.getItem(`welcome_sent_${user.id}`);
              if (!hasSent) {
                const userName = user.name || user.full_name || '';
                const userEmail = user.email || '';
                
                if (userEmail) {
                  localStorage.setItem(`welcome_sent_${user.id}`, 'true');
                  sendWelcomeEmail(userEmail, userName).catch(err => console.error("Welcome email error:", err));
                  sendAdminNewUserNotification(userEmail, userName).catch(err => console.error("Admin notification error:", err));
                }
              }
            }
          }
        }
      } else {
        setManualUserPhone(localStorage.getItem('pc_auth_phone'));
      }
    });

    // Also check for manual login changes via custom event or poll
    const checkManual = () => {
      const p = localStorage.getItem('pc_auth_phone');
      setManualUserPhone(p);
      setUserData(JSON.parse(localStorage.getItem('pc_user_data') || '{}'));
    };
    window.addEventListener('storage', checkManual);
    window.addEventListener('pc_user_update', checkManual);
    const interval = setInterval(checkManual, 2000);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', checkManual);
      window.removeEventListener('pc_user_update', checkManual);
      clearInterval(interval);
    };
  }, []);

  // Force close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

    const handleNavigation = (id: string) => {
      setMobileMenuOpen(false);

      if (id === 'blog') {
        navigate('/blog');
        return;
      }

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

    // External Trigger for Login Modal
    React.useEffect(() => {
      const handleOpenLogin = () => {
        setIsLoginModalOpen(true);
      };
      window.addEventListener('open_pc_login', handleOpenLogin);
      return () => window.removeEventListener('open_pc_login', handleOpenLogin);
    }, []);

  const Logo = ({ className = "h-12" }: { className?: string }) => (
    <img
      src="/assets/ui/logo.png"
      alt="Pão Caseiro Logo"
      className={`object-contain ${className}`}
    />
  );



  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#f7f1eb]/95 backdrop-blur-md shadow-sm border-b border-[#3b2f2f]/5 h-20 flex items-center">
        <div className="container mx-auto px-6 flex justify-between lg:grid lg:grid-cols-3 items-center">
          {/* Left: Logo & Language */}
          <div className="flex items-center justify-start gap-4">
            <div className="cursor-pointer" onClick={() => handleNavigation('hero')}>
              <Logo className="h-16 lg:h-20" />
            </div>
            {/* Desktop Language Toggle */}
            <button
              onClick={toggleLanguage}
              title={language === 'pt' ? 'Mudar para Inglês' : 'Change to Portuguese'}
              className="hidden lg:flex items-center justify-center h-6 w-9 rounded-sm hover:scale-110 transition-transform overflow-hidden shadow-sm border border-[#3b2f2f]/10 shrink-0"
              aria-label="Toggle Language"
            >
              {language === 'pt' ? (
                <img src="https://flagcdn.com/mz.svg" alt="MZ" className="w-full h-full object-cover" />
              ) : (
                <img src="https://flagcdn.com/us.svg" alt="US" className="w-full h-full object-cover" />
              )}
            </button>
          </div>

          {/* Center: Nav Items (Centered) */}
          <div className="hidden lg:flex items-center justify-center gap-5 xl:gap-8 text-sm font-bold tracking-wide uppercase text-[#4b3a2f]">
            {NAV_ITEMS.map((item) => {
              const isActive = (item.id === 'hero' && location.pathname === '/') || 
                               (item.id === 'blog' && location.pathname.startsWith('/blog'));
              return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                title={t.nav[item.labelKey]}
                className={`hover:text-[#d9a65a] transition-colors relative group ${isActive ? 'text-[#d9a65a]' : ''}`}
                aria-label={t.nav[item.labelKey]}
              >
                {t.nav[item.labelKey]}
                <span className={`absolute -bottom-1 left-0 h-0.5 bg-[#d9a65a] transition-all group-hover:w-full ${isActive ? 'w-full' : 'w-0'}`} />
              </button>
              );
            })}
            <button
              onClick={() => {
                navigate('/menu');
              }}
              title="Menu"
              className={`hover:text-[#d9a65a] transition-colors relative group ${location.pathname === '/menu' ? 'text-[#d9a65a]' : ''}`}
              aria-label="Menu"
            >
              Menu
              <span className={`absolute -bottom-1 left-0 h-0.5 bg-[#d9a65a] transition-all group-hover:w-full ${location.pathname === '/menu' ? 'w-full' : 'w-0'}`} />
            </button>
          </div>

          {/* Right Side: Account and Call button */}
          <div className="hidden lg:flex items-center justify-end gap-3 xl:gap-4">
            {(user || manualUserPhone) ? (
              <button
                onClick={() => navigate('/dashboard')}
                title={t.nav.myAccount}
                className="flex items-center gap-2 text-[#3b2f2f] px-5 py-2.5 rounded-full font-bold hover:bg-[#d9a65a] hover:text-white transition-all border border-[#d9a65a]/30 bg-white shadow-sm group active:scale-95"
                aria-label={t.nav.myAccount}
              >
                <div className="w-6 h-6 rounded-full bg-[#d9a65a]/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                  <User className="w-4 h-4 text-[#d9a65a] group-hover:text-white" />
                </div>
                <span className="hidden xl:inline">{t.nav.myAccount}</span>
              </button>
            ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                title={t.nav.login}
                className="flex items-center justify-center h-11 px-6 bg-[#3b2f2f] hover:bg-[#d9a65a] text-white hover:text-[#3b2f2f] rounded-full transition-all shadow-md font-black text-xs uppercase tracking-widest active:scale-95"
              >
                <User size={16} className="mr-2" />
                {t.nav.login}
              </button>
            )}

            <a
              href="tel:+258879146662"
              className="hidden sm:flex items-center gap-3 border border-[#3b2f2f]/10 px-6 py-2 rounded-full font-bold text-[#3b2f2f] hover:bg-white transition-all shadow-sm bg-white/50"
              title={t.nav.callUs}
              aria-label={t.nav.callUs}
            >
              <Phone className="w-4 h-4 text-[#d9a65a]" />
              <span className="text-sm tracking-wide">+258 87 9146 662</span>
            </a>
          </div>

          {/* Mobile Actions Overlay Trigger */}
          <div className="lg:hidden flex items-center justify-end">
            <button
              id="mobile-menu-toggle"
              className="text-[#3b2f2f] p-2"
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
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-[60] bg-[#3b2f2f]/95 backdrop-blur-md text-[#f7f1eb] flex flex-col items-center justify-start overflow-y-auto cursor-pointer"
          >
            <button
              id="mobile-menu-close"
              className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full z-[70] hover:bg-white/20 active:scale-95 transition-all shadow-lg cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(false);
              }}
              title={t.nav.closeMenu}
              aria-label={t.nav.closeMenu}
            >
              <X className="w-8 h-8" />
            </button>

            {/* Inner Content Wrapper that stops propagation to background */}
            <div 
              className="flex flex-col items-center justify-start gap-5 w-full max-w-md pt-20 pb-12 px-6 cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className="cursor-pointer hover:scale-105 transition-transform mb-4"
                onClick={() => handleNavigation('hero')}
              >
                <Logo className="h-20" />
              </div>

              {NAV_ITEMS.map((item) => {
                const isActive = (item.id === 'hero' && location.pathname === '/') || 
                                 (item.id === 'blog' && location.pathname.startsWith('/blog'));
                return (
                <button
                  key={item.id}
                  id={`mobile-nav-${item.id}`}
                  onClick={() => handleNavigation(item.id)}
                  className={`text-2xl font-serif hover:text-[#d9a65a] transition-colors cursor-pointer py-1 ${isActive ? 'text-[#d9a65a]' : ''}`}
                  title={t.nav[item.labelKey]}
                  aria-label={t.nav[item.labelKey]}
                >
                  {t.nav[item.labelKey]}
                </button>
                );
              })}
              <button
                onClick={() => {
                  navigate('/menu');
                  setMobileMenuOpen(false);
                }}
                className={`text-2xl font-serif hover:text-[#d9a65a] transition-colors cursor-pointer py-1 ${location.pathname === '/menu' ? 'text-[#d9a65a]' : ''}`}
                title="Menu"
                aria-label="Menu"
              >
                Menu
              </button>

              <button
                onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}
                className="flex items-center gap-3 px-6 py-2.5 rounded-full border border-white/20 hover:border-[#d9a65a] hover:text-[#d9a65a] transition-all mt-3 cursor-pointer"
                title={language === 'pt' ? 'Mudar para Inglês' : 'Change to Portuguese'}
              >
                {language === 'pt' ? (
                  <img src="https://flagcdn.com/mz.svg" alt="MZ" className="w-6 h-auto drop-shadow-md rounded-sm" />
                ) : (
                  <img src="https://flagcdn.com/us.svg" alt="US" className="w-6 h-auto drop-shadow-md rounded-sm" />
                )}
                <span className="text-lg font-bold uppercase tracking-wider">{language === 'pt' ? 'English' : 'Português'}</span>
              </button>

              {/* Mobile Login/Account Button */}
              <div className="mt-4 w-full flex justify-center">
                {(user || manualUserPhone) ? (
                  <button
                    onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                    className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full border border-white/20 hover:border-[#d9a65a] transition-all cursor-pointer shadow-lg active:scale-95"
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
                    className="flex items-center gap-3 bg-[#d9a65a] hover:bg-white text-[#3b2f2f] px-8 py-3 rounded-full font-bold hover:bg-white transition-all shadow-lg cursor-pointer active:scale-95"
                    title={t.nav.login}
                  >
                    <User className="w-6 h-6" />
                    <span>{t.nav.login}</span>
                  </button>
                )}
              </div>
            </div>
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
