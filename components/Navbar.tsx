import React, { useState } from 'react';
import { Menu, X, Phone, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, Language } from '../translations';

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
  const t = translations[language];
  const location = useLocation();
  const navigate = useNavigate();

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

          {/* Center: Nav Items */}
          <div className="hidden lg:flex items-center justify-center gap-8 text-sm font-bold tracking-wide uppercase text-[#4b3a2f]">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className="hover:text-[#d9a65a] transition-colors relative group"
              >
                {t.nav[item.labelKey]}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d9a65a] transition-all group-hover:w-full" />
              </button>
            ))}
            {/* Link to Menu Page explicitly in Nav? User didn't ask, but good UX. User asked for buttons. */}
            <button
              onClick={() => navigate('/menu')}
              className="hover:text-[#d9a65a] transition-colors relative group text-[#d9a65a]"
            >
              Menu
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#d9a65a] transition-all group-hover:w-full" />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="hidden lg:flex items-center justify-end gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#3b2f2f]/10 hover:border-[#d9a65a] hover:text-[#d9a65a] transition-all"
              aria-label="Toggle Language"
            >
              <Languages className="w-4 h-4" />
              <span className="text-xs font-bold uppercase">{language}</span>
            </button>

            <a
              href="tel:846930960"
              className="flex items-center gap-2 bg-[#3b2f2f] text-white px-6 py-2 rounded-full font-bold hover:bg-[#d9a65a] transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>846 930 960</span>
            </a>
          </div>

          {/* Mobile Toggle (Absolute Right) */}
          <div className="lg:hidden col-span-2 flex justify-end">
            <button
              className="text-[#3b2f2f]"
              onClick={() => setMobileMenuOpen(true)}
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
              className="absolute top-6 right-6 p-2 bg-white/10 rounded-full"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X className="w-8 h-8" />
            </button>

            <Logo className="h-24 mb-8 brightness-0 invert" />

            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className="text-3xl font-serif hover:text-[#d9a65a] transition-colors"
              >
                {t.nav[item.labelKey]}
              </button>
            ))}
            <button
              onClick={() => { navigate('/menu'); setMobileMenuOpen(false); }}
              className="text-3xl font-serif hover:text-[#d9a65a] transition-colors text-[#d9a65a]"
            >
              Ver Menu
            </button>

            <button
              onClick={() => { toggleLanguage(); setMobileMenuOpen(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/20 hover:border-[#d9a65a] hover:text-[#d9a65a] transition-all mt-4"
            >
              <Languages className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">{language === 'pt' ? 'English' : 'Português'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
