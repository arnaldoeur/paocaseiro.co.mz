import React from 'react';
import { motion } from 'framer-motion';

export const Terms: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#f7f1eb] pt-24 pb-16 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-xl overflow-hidden"
                >
                    <div className="bg-[#3b2f2f] p-10 md:p-16 text-center">
                        <h1 className="font-serif text-4xl md:text-5xl text-[#d9a65a] mb-4">Termos de Serviço</h1>
                        <div className="w-20 h-1 bg-[#d9a65a] mx-auto mb-6"></div>
                        <p className="text-[#f7f1eb]/80 text-sm md:text-base uppercase tracking-widest font-medium">Padaria e Pastelaria Pão Caseiro (Moçambique)</p>
                    </div>

                    <div className="p-8 md:p-12 space-y-8 text-gray-700 leading-relaxed">
                        <section>
                            <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">1. Aceitação dos Termos</h2>
                            <p>
                                Ao aceder e utilizar o website da Pão Caseiro (paocaseiro.co.mz), o utilizador aceita cumprir e ficar vinculado aos presentes Termos de Serviço e a todas as leis e regulamentos aplicáveis na República de Moçambique.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">2. Encomendas e Pagamentos</h2>
                            <p>
                                Todas as encomendas estão sujeitas a disponibilidade de stock. Os preços são indicados em Meticais (MZN) e incluem o IVA à taxa legal em vigor. O pagamento deve ser efetuado através dos canais de pagamento móvel integrados (M-Pesa, E-Mola, M-Kesh) ou outros métodos explicitamente aceites no checkout.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">3. Encomendas e Pagamentos</h2>
                            <p>
                                A Pão Caseiro compromete-se a entregar os produtos frescos dentro do horário acordado. Caso ocorra algum problema com a qualidade ou integridade do produto no momento da entrega, o cliente deve reportar imediatamente ao estafeta ou através dos nossos canais de apoio ao cliente.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">4. Responsabilidade do Utilizador</h2>
                            <p>
                                O utilizador é responsável por manter a confidencialidade da sua conta e palavra-passe. Qualquer atividade realizada através da sua conta será da sua inteira responsabilidade. A Pão Caseiro reserva-se o direito de recusar serviço ou cancelar contas em caso de uso indevido.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-serif italic text-[#3b2f2f] mb-4 border-b border-[#d9a65a]/20 pb-2">5. Política de Cancelamento de Encomendas</h2>
                            <p>
                                O cliente tem o direito de solicitar o cancelamento da sua encomenda através do seu painel de registo (Dashboard). O cancelamento autónomo só é permitido caso a encomenda ainda se encontre no estado "Pendente". Uma vez transitada para "Em Preparação", o pedido de cancelamento deverá ser encaminhado aos nossos canais de apoio, podendo estar sujeito a retenção do valor por motivos de alocação de ingredientes e labor já incorrido visando garantir a nossa sustentabilidade.
                            </p>
                        </section>

                        <section className="bg-[#f7f1eb] p-6 rounded-2xl border-l-4 border-[#d9a65a]">
                            <h2 className="text-lg font-bold text-[#3b2f2f] mb-2 font-serif italic">Nota Legal</h2>
                            <p className="text-sm">
                                Estes termos podem ser atualizados periodicamente para refletir mudanças nos nossos serviços ou requisitos legais. Recomendamos a consulta frequente desta página.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
