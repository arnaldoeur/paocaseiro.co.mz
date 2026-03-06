import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { Download, Share2, Printer, CheckCircle, MapPin, Phone, User, Store } from 'lucide-react';
import { CartItem } from '../context/CartContext';
import { formatProductName } from '../services/stringUtils';

interface ReceiptProps {
    orderId: string;
    paymentRef?: string; // Added Payment Reference
    transactionId?: string; // PaySuite Transaction ID
    date: string;
    details: {
        name: string;
        phone: string;
        type: 'delivery' | 'pickup' | 'dine_in';
        address?: string;
    };
    cart: CartItem[];
    subtotal: number;
    deliveryFee: number;
    total: number;
    amountPaid: number;
    balance: number;
    onClose: () => void;
}

export const Receipt: React.FC<ReceiptProps> = ({
    orderId, paymentRef, transactionId, date, details, cart, subtotal, deliveryFee, total, amountPaid, balance, onClose
}) => {
    const receiptRef = useRef<HTMLDivElement>(null);

    const getReceiptElement = () => {
        const element = receiptRef.current;
        if (!element) return null;

        const clone = element.cloneNode(true) as HTMLElement;
        clone.style.overflow = 'visible';
        clone.style.height = 'auto';
        clone.style.minHeight = 'auto';
        clone.style.maxHeight = 'none';
        clone.style.width = '480px';
        clone.style.background = '#fffbf5';
        clone.style.padding = '20px';

        // Ensure footer is visible
        const footer = clone.querySelector('.mt-8');
        if (footer) (footer as HTMLElement).style.display = 'block';

        return clone;
    };

    const generatePDF = async () => {
        const clone = getReceiptElement();
        if (!clone) return null;

        const container = document.createElement('div');
        // Mobile-safe off-screen rendering
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.style.zIndex = '-9999';
        container.style.width = '480px';
        container.style.visibility = 'visible'; // Important for rendering
        container.appendChild(clone);
        document.body.appendChild(container);

        try {
            // Force layout calculation
            // We wait a tick to ensure DOM update
            await new Promise(resolve => setTimeout(resolve, 0));

            // Determine natural scrolling height
            const height = clone.scrollHeight + 40; // Add padding buffer

            // Do not restrict the container height absolutely so it can grow
            clone.style.height = 'max-content';
            container.style.height = 'max-content';

            const canvas = await html2canvas(clone, {
                scale: 2,
                useCORS: true,
                logging: false,
                width: 480, // Explicitly fix the capture width
                windowWidth: 480,
                // Do not specify fixed document height flags, let it read from DOM dynamically
                backgroundColor: '#fffbf5',
                scrollY: 0,
                x: 0,
                y: 0
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            return pdf;
        } finally {
            document.body.removeChild(container);
        }
    };

    const handleDownloadPDF = async () => {
        const pdf = await generatePDF();
        if (pdf) pdf.save(`Recibo_PaoCaseiro_${orderId}.pdf`);
    };

    const handlePrint = () => {
        if (!receiptRef.current) return;

        // Create a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const content = receiptRef.current.innerHTML;

        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`
                <html>
                <head>
                    <title>Recibo</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { background-color: white; padding: 20px; font-family: sans-serif; }
                        /* Ensure Tailwind CDN loads or use inline styles for critical parts */
                        .text-center { text-align: center; }
                        .font-bold { font-weight: bold; }
                        .flex { display: flex; }
                        .justify-between { justify-content: space-between; }
                        /* Hide things that shouldn't print if any */
                    </style>
                </head>
                <body>
                    <div style="max-width: 400px; margin: 0 auto;">
                        ${content}
                    </div>
                </body>
                </html>
            `);
            doc.close();

            // Wait for styles/images (if any) then print
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();

                // Cleanup
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 1000);
            }, 1000);
        }
    };

    const handleShare = async () => {
        try {
            if (navigator.share) {
                const pdf = await generatePDF();
                if (pdf) {
                    const blob = pdf.output('blob');
                    const file = new File([blob], `Recibo_${orderId}.pdf`, { type: 'application/pdf' });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: 'Recibo Pão Caseiro',
                            text: `Pedido #${orderId}`
                        });
                        return;
                    }
                }
            }
            const text = `Recibo Pão Caseiro - Pedido #${orderId}\nTotal: ${total} MT`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        } catch (error) {
            console.error('Share error:', error);
            const text = `Recibo Pão Caseiro - Pedido #${orderId}\nTotal: ${total} MT`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header Actions */}
                <div className="p-4 bg-[#3b2f2f] text-[#f7f1eb] flex justify-between items-center rounded-t-2xl">
                    <h3 className="font-bold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        Pagamento Confirmado
                    </h3>
                    <button onClick={onClose} className="text-sm font-bold hover:text-[#d9a65a]">FECHAR</button>
                </div>

                {/* Receipt Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#fffbf5]" ref={receiptRef}>
                    <div className="border-b-2 border-[#d9a65a] pb-6 mb-6 text-center space-y-2 flex flex-col items-center">
                        <div className="w-32 h-auto mb-2">
                            <img src="/images/logo_receipt.png" alt="Pão Caseiro" className="w-full h-full object-contain" />
                        </div>
                        {/* <h1 className="font-serif text-3xl text-[#3b2f2f] font-bold">Pão Caseiro</h1> REMOVED FOR LOGO */}
                        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold">Padaria, Pastelaria e Café</p>
                    </div>

                    <div className="flex justify-between items-start mb-8 text-sm">
                        <div className="space-y-1">
                            <p className="text-gray-500">CLIENTE</p>
                            <p className="font-bold text-[#3b2f2f]">{details.name}</p>
                            <p className="text-gray-600">{details.phone}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-gray-500">PEDIDO</p>
                            <p className="font-bold text-[#3b2f2f] text-lg">#{orderId}</p>

                            {paymentRef && (
                                <div className="text-xs text-gray-500 mt-1">
                                    <p>ID Pagamento:</p>
                                    <p className="font-mono text-[#3b2f2f]">{paymentRef}</p>
                                </div>
                            )}

                            <p className="text-gray-600 pt-1">{date}</p>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-gray-100 mb-6 space-y-3 shadow-sm">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#3b2f2f] border-b pb-2">
                            {details.type === 'delivery' ? <MapPin className="w-4 h-4" /> : details.type === 'pickup' ? <Store className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                            {details.type === 'delivery' ? 'Entrega ao Domicílio' : details.type === 'pickup' ? 'Levantamento na Loja' : 'Consumo no Local'}
                        </div>
                        {details.type === 'delivery' && details.address && (
                            <p className="text-xs text-gray-600 italic">"{details.address}"</p>
                        )}
                    </div>

                    <table className="w-full text-sm mb-6">
                        <thead className="text-gray-500 border-b">
                            <tr>
                                <th className="text-left py-2 font-normal">Item</th>
                                <th className="text-center py-2 font-normal">Qtd</th>
                                <th className="text-right py-2 font-normal">Total</th>
                            </tr>
                        </thead>
                        <tbody className="text-[#3b2f2f]">
                            {cart.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-100">
                                    <td className="py-3">{formatProductName(item.name)}</td>
                                    <td className="py-3 text-center">{item.quantity}</td>
                                    <td className="py-3 text-right font-bold">{item.price * item.quantity} MT</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="space-y-2 text-right text-sm">
                        <div className="flex justify-between text-gray-500">
                            <span>Subtotal</span>
                            <span>{subtotal} MT</span>
                        </div>
                        {deliveryFee > 0 && (
                            <div className="flex justify-between text-gray-500">
                                <span>Taxa de Entrega</span>
                                <span>{deliveryFee} MT</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-[#3b2f2f] pt-4 border-t border-[#d9a65a]">
                            <span>TOTAL</span>
                            <span>{total} MT</span>
                        </div>
                        <div className="flex justify-between text-green-600 pt-2 font-bold">
                            <span>Pago</span>
                            <span>{amountPaid} MT</span>
                        </div>
                        {balance > 0 && (
                            <div className="flex justify-between text-red-500 pt-1 font-bold">
                                <span>Falta Pagar</span>
                                <span>{balance} MT</span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t-2 border-dotted border-gray-300 text-center text-xs text-gray-400 space-y-1">
                        <p>Obrigado pela preferência!</p>
                        <p className="font-serif italic text-[#d9a65a] text-sm py-2">"O sabor que aquece o coração"</p>
                        <p className="font-bold text-gray-500">Pão Caseiro</p>
                        <p>Lichinga, Av. Acordo de Lusaka</p>
                        <p>+258 87 9146 662</p>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t space-y-3 rounded-b-2xl">
                    <button onClick={handleDownloadPDF} className="w-full bg-[#3b2f2f] text-[#d9a65a] py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors">
                        <Download className="w-5 h-5" /> Baixar PDF
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={handleShare} className="bg-green-100 text-green-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-200 transition-colors">
                            <Share2 className="w-5 h-5" /> Partilhar
                        </button>
                        <button onClick={handlePrint} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors">
                            <Printer className="w-5 h-5" /> Imprimir
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
