import React, { useState, useEffect, useRef } from 'react';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { MapPin, Search, Loader } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce'; // We might need a debounce hook, or just inline it

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (result: { label: string; x: number; y: number }) => void;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, onSelect }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Simple debounce implementation
    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        const search = async () => {
            if (!debouncedQuery || debouncedQuery.length < 3) {
                setResults([]);
                return;
            }

            // Avoid searching if it matches the current value (selection)
            // if (debouncedQuery === value) return; 

            setLoading(true);
            try {
                const provider = new OpenStreetMapProvider();
                // @ts-ignore
                const results = await provider.search({ query: debouncedQuery });
                setResults(results);
                setIsOpen(true);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setLoading(false);
            }
        };

        search();
    }, [debouncedQuery]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (result: any) => {
        setQuery(result.label);
        onChange(result.label);
        onSelect({
            label: result.label,
            x: result.x, // lng
            y: result.y  // lat
        });
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative z-50">
            <div className="relative">
                <MapPin className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                <textarea
                    value={query} // Local state controls input
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value); // Sync up
                    }}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true);
                    }}
                    className="w-full pl-10 p-3 rounded-lg border border-[#d9a65a]/30 focus:border-[#d9a65a] outline-none bg-white h-24 resize-none"
                    placeholder="Pesquisar Bairro, Rua, ou Edifício no Mapa..."
                />
                {loading && (
                    <div className="absolute right-3 top-3">
                        <Loader className="w-5 h-5 text-[#d9a65a] animate-spin" />
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto z-[100]">
                    {results.map((result, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(result)}
                            className="w-full text-left p-3 hover:bg-[#fffbf5] border-b border-gray-50 last:border-0 flex items-start gap-2 transition-colors"
                        >
                            <Search className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                            <span className="text-sm text-[#3b2f2f] line-clamp-2">{result.label}</span>
                        </button>
                    ))}
                    <div className="p-2 text-center bg-gray-50 text-xs text-gray-400">
                        Resultados do OpenStreetMap
                    </div>
                </div>
            )}
        </div>
    );
};
