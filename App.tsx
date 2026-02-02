import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Menu } from './pages/Menu';
import { Gallery } from './pages/Gallery';
import { Admin } from './pages/Admin';
import { Cart } from './components/Cart';
import { CartProvider } from './context/CartContext';
import { Language } from './translations';

import { ITSupport } from './pages/ITSupport';
import { Delivery } from './pages/Delivery';
import { Kitchen } from './pages/Kitchen';
import { OrderReceipt } from './pages/OrderReceipt';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('pt');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'pt' ? 'en' : 'pt'));
  };

  return (
    <CartProvider>
      <Router>
        <div className="min-h-screen bg-[#f7f1eb] text-[#3b2f2f] font-sans">
          <Routes>
            {/* Standalone Pages (No Navbar/Footer) */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/it" element={<ITSupport />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/kitchen" element={<Kitchen />} />

            {/* Main Website Pages */}
            <Route path="/*" element={
              <>
                <Navbar language={language} toggleLanguage={toggleLanguage} />
                <Routes>
                  <Route path="/" element={<Home language={language} />} />
                  <Route path="/menu" element={<Menu language={language} />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/order-receipt/:orderId" element={<OrderReceipt />} />
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