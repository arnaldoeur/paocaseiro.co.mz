import React from 'react';
import { Download, FileImage, FileCode, FileText, LayoutGrid, FileSearch } from 'lucide-react';

interface ChartExportProps {
    onExport: (format: 'png' | 'svg' | 'pdf-current' | 'pdf-full') => void;
}

export const ChartExport: React.FC<ChartExportProps> = ({ onExport }) => {
    return (
        <div className="relative group">
            <button className="flex items-center gap-2 bg-[#3b2f2f] text-[#d9a65a] px-5 py-2.5 rounded-2xl shadow-lg hover:bg-black transition-all active:scale-95 font-bold text-xs uppercase tracking-widest leading-none">
                <Download size={16} />
                Exportar
            </button>

            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-50 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                    onClick={() => { onExport('png'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#3b2f2f]"
                >
                    <FileImage size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold">Imagem (PNG)</span>
                </button>
                <button
                    onClick={() => { onExport('svg'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#3b2f2f]"
                >
                    <FileCode size={16} className="text-blue-500" />
                    <span className="text-sm font-bold">Vector (SVG)</span>
                </button>
                <div className="h-[1px] bg-gray-50 mx-2 my-1"></div>

                <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Relatórios PDF</div>

                <button
                    onClick={() => { onExport('pdf-current'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#3b2f2f]"
                >
                    <LayoutGrid size={16} className="text-rose-500" />
                    <div className="text-left">
                        <span className="text-sm font-bold block leading-tight">Métrica Atual</span>
                        <span className="text-[10px] text-gray-400">KPIs + Gráfico Atual</span>
                    </div>
                </button>

                <button
                    onClick={() => { onExport('pdf-full'); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-gray-600 hover:text-[#3b2f2f]"
                >
                    <FileSearch size={16} className="text-rose-600" />
                    <div className="text-left">
                        <span className="text-sm font-bold block leading-tight">Relatório Completo</span>
                        <span className="text-[10px] text-gray-400">Branding + Dados Detalhados</span>
                    </div>
                </button>
            </div>
        </div>
    );
};
