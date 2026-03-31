import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f7f1eb] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-[#d9a65a]/20 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#d9a65a]/5 rounded-full -mr-16 -mt-16" />
            
            <div className="mb-8 inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full text-red-500">
              <AlertTriangle size={40} />
            </div>
            
            <h1 className="text-3xl font-black text-[#3b2f2f] mb-4 font-serif">Oops! Algo correu mal.</h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Encontrámos um erro inesperado. Por favor, tente recarregar a página ou voltar ao início.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-8 p-4 bg-gray-50 rounded-xl text-left overflow-auto max-h-40">
                <code className="text-xs text-red-600 font-mono">
                  {this.state.error.toString()}
                </code>
              </div>
            )}
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-[#3b2f2f] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#2a2121] transition-all shadow-lg"
              >
                <RefreshCw size={18} /> Recarregar Página
              </button>
              
              <a
                href="/"
                className="w-full bg-white text-[#d9a65a] border-2 border-[#d9a65a] py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-50 transition-all"
              >
                <Home size={18} /> Voltar ao Início
              </a>
            </div>
          </div>
          
          <p className="mt-8 text-xs text-gray-400 uppercase tracking-widest font-bold">
            Protocolo de Estabilização Zyph Tech
          </p>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
