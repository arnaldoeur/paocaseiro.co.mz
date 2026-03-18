import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
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

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('pt');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'pt' ? 'en' : 'pt'));
  };

  return (
    <CartProvider>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-[#f7f1eb] text-[#3b2f2f] font-sans">
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
        </div>
      </Router>
    </CartProvider>
  );
};

export default App;