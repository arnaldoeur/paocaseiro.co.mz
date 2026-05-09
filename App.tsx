import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { hostingerService } from './services/hostingerService';
import OneSignal from 'react-onesignal';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Cart } from './components/Cart';
import { CartProvider } from './context/CartContext';
import { Language } from './translations';
import ScrollToTop from './components/ScrollToTop';
import { ErrorBoundary } from './components/ErrorBoundary';

const Home = React.lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Menu = React.lazy(() => import('./pages/Menu').then(module => ({ default: module.Menu })));
const Blog = React.lazy(() => import('./pages/Blog').then(module => ({ default: module.Blog })));
const BlogPost = React.lazy(() => import('./pages/BlogPost').then(module => ({ default: module.BlogPost })));
const Gallery = React.lazy(() => import('./pages/Gallery').then(module => ({ default: module.Gallery })));
const Admin = React.lazy(() => import('./pages/Admin').then(module => ({ default: module.Admin })));
const MaintenanceMenu = React.lazy(() => import('./pages/MaintenanceMenu').then(module => ({ default: module.MaintenanceMenu })));
const ClientDashboard = React.lazy(() => import('./pages/ClientDashboard').then(module => ({ default: module.ClientDashboard })));
const ITSupport = React.lazy(() => import('./pages/ITSupport').then(module => ({ default: module.ITSupport })));
const Delivery = React.lazy(() => import('./pages/Delivery').then(module => ({ default: module.Delivery })));
const Kitchen = React.lazy(() => import('./pages/Kitchen').then(module => ({ default: module.Kitchen })));
const OrderReceipt = React.lazy(() => import('./pages/OrderReceipt').then(module => ({ default: module.OrderReceipt })));
const Privacy = React.lazy(() => import('./pages/Privacy').then(module => ({ default: module.Privacy })));
const Terms = React.lazy(() => import('./pages/Terms').then(module => ({ default: module.Terms })));
const TVDisplay = React.lazy(() => import('./pages/TVDisplay').then(module => ({ default: module.TVDisplay })));
const GetTicket = React.lazy(() => import('./pages/GetTicket').then(module => ({ default: module.GetTicket })));
const TVTickets = React.lazy(() => import('./pages/TVTickets').then(module => ({ default: module.TVTickets })));

import { useRole } from './hooks/useRole';

const RouteMetadata: React.FC<{ language: Language }> = ({ language }) => {
  const location = useLocation();

  useEffect(() => {
    const pageTitles: Record<string, string> = {
      '/': language === 'en' ? "Home" : "Início",
      '/menu': language === 'en' ? "Menu & Ordering" : "Menu e Encomendas",
      '/gallery': language === 'en' ? "Bakery Gallery" : "Galeria da Padaria",
      '/blog': language === 'en' ? "Bakery Blog" : "Blog da Padaria",
      '/dashboard': language === 'en' ? "Customer Dashboard" : "Painel do Cliente",
      '/kitchen': "KDS - Cozinha",
      '/admin': "Admin Panel",
      '/delivery': "Logística de Entrega"
    };

    const currentTitle = pageTitles[location.pathname] || "Pão Caseiro";
    const suffix = language === 'en' ? "The taste that warms the heart" : "O sabor que aquece o coração";

    document.title = `${currentTitle} | Pão Caseiro - ${suffix}`;

    if (language === 'en') {
      document.documentElement.lang = "en";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'Discover Pão Caseiro, the best bakery in Lichinga, Niassa. Fresh bread every day, excellent pastry and easy online ordering. The taste that warms the heart!');

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `Pão Caseiro | ${currentTitle}`);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', 'Discover Pão Caseiro, the best bakery in Lichinga, Niassa. Fresh bread every day, excellent pastry and easy online ordering. The taste that warms the heart!');
    } else {
      document.documentElement.lang = "pt-PT";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'Padaria Pão Caseiro em Lichinga, Niassa. Pão fresco, pastelaria e encomendas online. O verdadeiro sabor artesanal que aquece o coração. Peça já!');

      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', `Pão Caseiro | ${currentTitle}`);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', 'Padaria Pão Caseiro em Lichinga, Niassa. Pão fresco, pastelaria e encomendas online. O verdadeiro sabor artesanal que aquece o coração. Peça já!');
    }

    // Update canonical and og:url
    const currentUrl = `https://paocaseiro.co.mz${location.pathname}`;
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', currentUrl);
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', currentUrl);
  }, [language, location.pathname]);

  return null;
};

const MaintenanceGuard: React.FC<{ children: React.ReactNode, language: Language }> = ({ children, language }) => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isPanic, setIsPanic] = useState(false);
  const [isWAOnly, setIsWAOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debugStatus, setDebugStatus] = useState("Inicializando...");
  const location = useLocation();
  const { role, loading: roleLoading } = useRole();

  useEffect(() => {
    // Safety timeout: Never stay in loading state longer than 5 seconds
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("MaintenanceGuard: Safety timeout reached. Proceeding to render.");
        setLoading(false);
      }
    }, 5000);

    const checkStatus = async () => {
      try {
        setDebugStatus("Verificando ligação...");
        if (!navigator.onLine) {
            
            setLoading(false);
            return;
        }

        setDebugStatus("Lendo definições de sistema...");
        const data = await hostingerService.getSystemSettings();

        if (data && Array.isArray(data)) {
          const maint = data.find((d: any) => d.key === 'maintenance_mode');
          const panic = data.find((d: any) => d.key === 'panic_mode');
          const waOnly = data.find((d: any) => d.key === 'whatsapp_menu_mode');
          
          setIsMaintenance(maint?.value?.active === true);
          setIsPanic(panic?.value?.active === true);
          setIsWAOnly(waOnly?.value?.active === true);
        }
      } catch (e) {
        console.error("Maintenance check error:", e);
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 60000); // check every 60s
    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Allow app to render if there's no maintenance/panic active, don't wait for role verification.
  // We only care about roles if we need to bypass a blocked state.
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f1eb] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Dynamic Background Gradient */}
        <motion.div
          className="absolute inset-0 opacity-10 pointer-events-none"
          animate={{
            background: [
              "radial-gradient(circle at 10% 20%, #d9a65a 0%, transparent 40%)",
              "radial-gradient(circle at 90% 80%, #d9a65a 0%, transparent 40%)",
              "radial-gradient(circle at 10% 80%, #d9a65a 0%, transparent 40%)",
              "radial-gradient(circle at 90% 20%, #d9a65a 0%, transparent 40%)",
              "radial-gradient(circle at 10% 20%, #d9a65a 0%, transparent 40%)"
            ].join(', ')
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
          className="relative z-10 flex flex-col items-center max-w-sm w-full"
        >
          {/* Animated Logo */}
          <motion.img 
            src="/images/logo-official.png" 
            alt="Pão Caseiro Logo" 
            className="w-40 md:w-48 h-auto mb-6 drop-shadow-2xl"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center w-full"
          >
            <h2 className="text-[#3b2f2f] text-2xl font-bold font-display mb-1">Bem-vindo</h2>
            <p className="text-[#d9a65a] italic font-medium mb-8">"O sabor que aquece o coração"</p>
          </motion.div>

          {/* Fluid Loader Indicator */}
          <div className="flex items-center gap-2 mb-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2.5 h-2.5 bg-[#d9a65a] rounded-full"
                animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>

          <motion.p 
            className="text-[#3b2f2f]/60 font-medium text-xs tracking-widest uppercase"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            {debugStatus}
          </motion.p>
        </motion.div>
      </div>
    );
  }

  // We are blocked. Now wait for role check if still loading
  const shouldBlockBase = isPanic || isMaintenance;
  if (shouldBlockBase && roleLoading) return <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-4"><div className="w-10 h-10 border-4 border-t-transparent border-[#d9a65a] rounded-full animate-spin"></div></div>;

  // Real Roles (either from app_metadata or local fallback)
  const isIT = role === 'it';
  const isAdmin = role === 'admin' || role === 'it';

  // For people waiting on the path bypass (optional fallback)
  const isITPath = location.pathname === '/it';
  
  // Real check
  const shouldBlock = (isPanic && !isIT && !isITPath) || (isMaintenance && !isIT && !isAdmin && !isITPath);

  if (shouldBlock) {
    return (
      <div className="min-h-screen bg-[#3b2f2f] flex flex-col items-center justify-center p-6 text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[#d9a65a]/10 pattern-dots" />
        <div className="relative z-10 animate-fade-in-up max-w-lg">
          <div className="w-24 h-24 bg-[#d9a65a]/20 rounded-full flex items-center justify-center mx-auto mb-8 relative">
              <div className="w-20 h-20 bg-[#d9a65a]/30 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-10 h-10 text-[#d9a65a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isPanic ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </>
                  )}
                </svg>
              </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 font-display">{isPanic ? 'Sistema Encerrado' : 'Sistema em Manutenção'}</h1>
          <p className="text-gray-300 text-lg mb-8 leading-relaxed">
            {isPanic ? (
              "A Pão Caseiro encerrou todos os serviços temporariamente devido a uma intervenção técnica crítica."
            ) : (
              "A Pão Caseiro está atualmente a realizar uma intervenção técnica programada para melhorar os nossos serviços. Voltaremos dentro de instantes."
            )}
          </p>
          <div className="inline-block bg-[#d9a65a]/20 border border-[#d9a65a]/30 text-[#d9a65a] px-6 py-3 rounded-full font-medium tracking-wide">
            Zyph Tech Protocol Active
          </div>
        </div>
      </div>
    );
  }

  // If WhatsApp Only mode is active, show the Maintenance Menu for public users
  const shouldShowWAMenu = isWAOnly && !isIT && !isAdmin && !isITPath && location.pathname !== '/admin';
  if (shouldShowWAMenu) {
    return <MaintenanceMenu language={language} />;
  }

  return <>{children}</>;
};

const LoadingFallback = () => (
  <div className="min-h-screen bg-[#f7f1eb] flex flex-col items-center justify-center p-4">
    <div className="w-12 h-12 border-4 border-t-transparent border-[#d9a65a] rounded-full animate-spin mb-4" />
    <p className="text-[#3b2f2f]/60 font-medium text-xs tracking-widest uppercase">Carregando...</p>
  </div>
);

const RouteObserver: React.FC<{ language: Language, setLanguage: (l: Language) => void }> = ({ language, setLanguage }) => {
  const location = useLocation();
  useEffect(() => {
    const isEn = location.pathname === '/en' || location.pathname.startsWith('/en/');
    if (isEn && language !== 'en') {
      setLanguage('en');
      localStorage.setItem('app_language', 'en');
    } else if (!isEn && language === 'en' && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/it') && !location.pathname.startsWith('/kitchen')) {
      setLanguage('pt');
      localStorage.setItem('app_language', 'pt');
    }
  }, [location.pathname]);
  return null;
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>(() => {
    // We let RouteObserver handle the actual source of truth for paths, but initialize from localStorage
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'pt';
  });

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        await OneSignal.init({
          appId: "43e27b65-50cf-40b7-8a95-e87f200e742c",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
          } as any,
        });
        OneSignal.Slidedown.promptPush();
      } catch (error) {
        console.warn("OneSignal Init Error:", error);
      }
    };
    initOneSignal();
  }, []);

  const toggleLanguage = () => {
    const current = window.location.pathname;
    let newPath = '';
    
    if (current.startsWith('/en')) {
      // Switch EN -> PT
      newPath = current.replace('/en', '');
      if (newPath === '/privacy') newPath = '/privacidade';
      if (newPath === '/terms') newPath = '/termos';
      if (newPath === '') newPath = '/';
    } else {
      // Switch PT -> EN
      if (current === '/') newPath = '/en';
      else if (current === '/privacidade') newPath = '/en/privacy';
      else if (current === '/termos') newPath = '/en/terms';
      else newPath = '/en' + current;
    }
    
    window.location.href = newPath;
  };

  return (
    <CartProvider>
      <Router>
        <RouteObserver language={language} setLanguage={setLanguage} />
        <RouteMetadata language={language} />
        <ScrollToTop />
        <div className="min-h-screen bg-[#f7f1eb] text-[#3b2f2f] font-sans">
          <MaintenanceGuard language={language}>
            <ErrorBoundary>
              <React.Suspense fallback={<LoadingFallback />}>
                <Routes>
                  {/* Standalone Pages (No Navbar/Footer) */}
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/it" element={<ITSupport />} />
                  <Route path="/delivery" element={<Delivery />} />
                  <Route path="/kitchen" element={<Kitchen />} />
                  <Route path="/tv-display" element={<TVDisplay />} />
                  <Route path="/get-ticket" element={<GetTicket language={language} />} />
                  <Route path="/tv-senhas" element={<TVTickets language={language} />} />

                  {/* Main Website Pages */}
                  <Route path="/*" element={
                    <>
                      <Navbar language={language} toggleLanguage={toggleLanguage} />
                      <Routes>
                        {/* PT Routes */}
                        <Route path="/" element={<Home language={language} />} />
                        <Route path="/menu" element={<Menu language={language} />} />
                        <Route path="/gallery" element={<Gallery language={language} />} />
                        <Route path="/blog" element={<Blog language={language} />} />
                        <Route path="/blog/:slug" element={<BlogPost language={language} />} />
                        <Route path="/order-receipt/:orderId" element={<OrderReceipt />} />
                        <Route path="/dashboard" element={<ClientDashboard language={language} />} />
                        <Route path="/privacidade" element={<Privacy language={language} />} />
                        <Route path="/termos" element={<Terms language={language} />} />
                        
                        {/* EN Routes */}
                        <Route path="/en" element={<Home language="en" />} />
                        <Route path="/en/menu" element={<Menu language="en" />} />
                        <Route path="/en/gallery" element={<Gallery language="en" />} />
                        <Route path="/en/blog" element={<Blog language="en" />} />
                        <Route path="/en/blog/:slug" element={<BlogPost language="en" />} />
                        <Route path="/en/order-receipt/:orderId" element={<OrderReceipt />} />
                        <Route path="/en/dashboard" element={<ClientDashboard language="en" />} />
                        <Route path="/en/privacy" element={<Privacy language="en" />} />
                        <Route path="/en/terms" element={<Terms language="en" />} />
                      </Routes>
                      <Footer language={language} />
                      <Cart language={language} />
                    </>
                  } />
                </Routes>
              </React.Suspense>
            </ErrorBoundary>
          </MaintenanceGuard>
        </div>
      </Router>
    </CartProvider>
  );
};

export default App;
