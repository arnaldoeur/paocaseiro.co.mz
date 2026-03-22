import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { supabase } from './services/supabase';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Gallery } from './pages/Gallery';
import { Admin } from './pages/Admin';
import { Cart } from './components/Cart';
import { CartProvider } from './context/CartContext';
import { Language } from './translations';
import { ClientDashboard } from './pages/ClientDashboard';
import ScrollToTop from './components/ScrollToTop';

import { ITSupport } from './pages/ITSupport';
import { Delivery } from './pages/Delivery';
import { Kitchen } from './pages/Kitchen';
import { OrderReceipt } from './pages/OrderReceipt';
import { Seeder } from './Seeder';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';

const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isPanic, setIsPanic] = useState(false);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await supabase.from('system_settings').select('key, value').in('key', ['maintenance_mode', 'panic_mode']);
        if (data) {
          const maint = data.find(d => d.key === 'maintenance_mode');
          const panic = data.find(d => d.key === 'panic_mode');
          setIsMaintenance(maint?.value?.active === true);
          setIsPanic(panic?.value?.active === true);
        }
      } catch (e) {
        // Assume not in maintenance if query fails
      }
      setLoading(false);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // check every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="min-h-screen bg-[#f7f1eb] flex items-center justify-center p-4"><div className="w-10 h-10 border-4 border-t-transparent border-[#d9a65a] rounded-full animate-spin"></div></div>;

  const isIT = location.pathname === '/it';
  const isAdmin = location.pathname.startsWith('/admin');
  
  const shouldBlock = (isPanic && !isIT) || (isMaintenance && !isIT && !isAdmin);

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

  return <>{children}</>;
};

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('pt');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'pt' ? 'en' : 'pt'));
  };

  // Dynamic SEO Tags based on Language
  useEffect(() => {
    if (language === 'en') {
      document.title = "Pão Caseiro | The taste that warms the heart";
      document.documentElement.lang = "en";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'Discover Pão Caseiro, the best bakery in Lichinga, Niassa. Fresh bread every day, excellent pastry and easy online ordering. The taste that warms the heart!');
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', 'Pão Caseiro | The taste that warms the heart');
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', 'Discover Pão Caseiro, the best bakery in Lichinga, Niassa. Fresh bread every day, excellent pastry and easy online ordering.');
    } else {
      document.title = "Pão Caseiro | O sabor que aquece o coração";
      document.documentElement.lang = "pt-PT";
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute('content', 'Descubra a Pão Caseiro, a melhor padaria em Lichinga, no Niassa. Pão fresco todos os dias, pastelaria de excelência e facilidade em encomendas online. O sabor que aquece o coração!');
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', 'Pão Caseiro | O sabor que aquece o coração');
      
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', 'Descubra a Pão Caseiro, a melhor padaria em Lichinga, no Niassa. Pão fresco todos os dias, pastelaria de excelência e facilidade em encomendas online.');
    }
  }, [language]);

  return (
    <CartProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-[#f7f1eb] text-[#3b2f2f] font-sans">
          <MaintenanceGuard>
            <Routes>
              {/* Standalone Pages (No Navbar/Footer) */}
              <Route path="/admin" element={<Admin />} />
              <Route path="/it" element={<ITSupport />} />
              <Route path="/delivery" element={<Delivery />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/seed" element={<Seeder />} />

              {/* Main Website Pages */}
              <Route path="/*" element={
                <>
                  <Navbar language={language} toggleLanguage={toggleLanguage} />
                  <Routes>
                    <Route path="/" element={<Home language={language} />} />
                    <Route path="/menu" element={<Menu language={language} />} />
                    <Route path="/gallery" element={<Gallery language={language} />} />
                    <Route path="/blog" element={<Blog language={language} />} />
                    <Route path="/blog/:slug" element={<BlogPost language={language} />} />
                    <Route path="/order-receipt/:orderId" element={<OrderReceipt />} />
                    <Route path="/dashboard" element={<ClientDashboard language={language} />} />
                    <Route path="/privacidade" element={<Privacy />} />
                    <Route path="/termos" element={<Terms />} />
                    {/* Add other main routes here */}
                  </Routes>
                  <Footer language={language} />
                  <Cart language={language} />
                </>
              } />
            </Routes>
          </MaintenanceGuard>
        </div>
      </Router>
    </CartProvider>
  );
};

export default App;