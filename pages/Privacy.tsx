import React from 'react';
import { motion } from 'framer-motion';
import { Language, translations } from '../translations';

interface PrivacyProps {
  language: Language;
}

export const Privacy: React.FC<PrivacyProps> = ({ language }) => {
  const t = translations[language].privacy;

  return (
    <div className="min-h-screen bg-[#f7f1eb] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="bg-[#3b2f2f] p-10 md:p-16 text-center">
            <h1 className="font-serif text-4xl md:text-5xl text-[#d9a65a] mb-4">{t.title}</h1>
            <div className="w-20 h-1 bg-[#d9a65a] mx-auto mb-6"></div>
            <p className="text-[#f7f1eb]/80 text-sm md:text-base uppercase tracking-widest font-medium">{t.subtitle}</p>
          </div>

          <div className="p-8 md:p-12 space-y-8 text-gray-700 leading-relaxed">
            <p className="text-sm font-bold text-[#d9a65a] uppercase tracking-widest">{t.lastUpdate}</p>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">{t.section1Title}</h2>
              <p>{t.section1Content}</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">{t.section2Title}</h2>
              <p>{t.section2Content}</p>
              <p className="font-bold text-red-600 mt-4 bg-red-50 p-4 rounded-xl border border-red-100">{t.guarantee}</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">{t.section3Title}</h2>
              <p>{t.section3Content}</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">{t.section4Title}</h2>
              <p>{t.section4Content}</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">{t.section5Title}</h2>
              <p>{t.section5Content}</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
