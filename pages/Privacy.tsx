import React from 'react';
import { motion } from 'framer-motion';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f7f1eb] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="bg-[#3b2f2f] p-10 md:p-16 text-center">
            <h1 className="font-serif text-4xl md:text-5xl text-[#d9a65a] mb-4">Política de Privacidade</h1>
            <div className="w-20 h-1 bg-[#d9a65a] mx-auto mb-6"></div>
            <p className="text-[#f7f1eb]/80 text-sm md:text-base uppercase tracking-widest font-medium">Proteção de Dados e Privacidade</p>
          </div>

          <div className="p-8 md:p-12 space-y-8 text-gray-700 leading-relaxed">
            <p className="text-sm font-bold text-[#d9a65a] uppercase tracking-widest">Última atualização: 04/03/2026</p>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">1. Recolha de Dados Pessoais</h2>
              <p>A <strong>Pão Caseiro</strong> recolhe e armazena os dados pessoais fornecidos (nome, telemóvel, morada e e-mail) apenas com o intuito de facilitar a encomenda e entrega dos nossos produtos, além de notificar os clientes sobre o estado do seu serviço.</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">2. Uso e Partilha de Informação</h2>
              <p>Todas as partes registadas são preservadas internamente na base de dados da Pão Caseiro. Os seus números e meios de contacto são utilizados em exclusivo para comunicações entre a plataforma e o cliente (confirmação de OTP, tracking de encomenda) ou campanhas promocionais de marketing da própria loja.</p>
              <p className="font-bold text-red-600 mt-4 bg-red-50 p-4 rounded-xl border border-red-100">Garantimos que nenhum dado é alugado, partilhado ou vendido a entidades terceiras ou exteriores.</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">3. Proteção e Segurança</h2>
              <p>A gestão da base de dados é estritamente executada por administradores qualificados da Pão Caseiro ou afiliados de IT, onde são implementadas medidas de segurança consistentes segundo as disposições legais aplicadas na República de Moçambique. Sendo nós a única entidade de gestão e acesso às matrizes primárias destes dados.</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">4. Direitos do Cliente</h2>
              <p>A qualquer momento enquanto utilizador livre da plataforma, pode solicitar informações detalhadas sobre as informações registadas a seu respeito ou apagar totalmente o seu rasto do nosso ecossistema, contactando a gerência da nossa equipa através dos Canais de Suporte oficiais.</p>
            </section>

            <section>
              <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">5. Gestão de Cancelamentos (Logs)</h2>
              <p>Quando uma encomenda é ativamente <strong>cancelada</strong> pelo utilizador no Painel de Cliente, a operação é devidamente executada, travando o prosseguimento da mesma. No entanto, por razões associadas a métricas de segurança, prevenção de comportamentos fraudulentos e arquivo fiscal, os metadados de pedidos cancelados transitam para um histórico inativo e seguro (Read-Only) não sendo apagados instantaneamente das tabelas primárias de suporte.</p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
