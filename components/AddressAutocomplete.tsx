import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader } from 'lucide-react';
import { hostingerService } from '../services/hostingerService';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (result: { label: string; x: number; y: number }) => void;
}

interface NominatimResult {
    place_id: number;
    licence: string;
    osm_type: string;
    osm_id: number;
    boundingbox: string[];
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, onSelect }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<NominatimResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Keep state in sync with parent prop updates (e.g. if loaded from profile)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 3) {
            setResults([]);
            return;
        }

        const fetchPlaces = async () => {
            setLoading(true);
            try {
                // Call through our secure backend proxy which has a valid static User-Agent and bypasses CORS/rate-limits!
                const data = await hostingerService.fetch('search_places', { q: debouncedQuery });
                if (data && Array.isArray(data)) {
                    setResults(data);
                    setIsOpen(true);
                } else {
                    setResults([]);
                }
            } catch (err) {
                console.error("Nominatim Autocomplete Proxy Error:", err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPlaces();
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

    const handleSelect = (result: NominatimResult) => {
        const label = result.display_name;
        setQuery(label);
        onChange(label);
        setIsOpen(false);

        onSelect({
            label: label,
            y: parseFloat(result.lat), // lat
            x: parseFloat(result.lon)  // lon (lng)
        });
    };

    return (
        <div ref={wrapperRef} className="relative z-[1000]">
            <div className="relative">
                <MapPin className="absolute left-3 top-3 text-[#d9a65a] w-5 h-5" />
                <textarea
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value);
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
                <div className="w-full mt-2 bg-white rounded-xl shadow-md border border-gray-100 max-h-60 overflow-y-auto relative z-10 block">
                    {results.map((result, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(result)}
                            className="w-full text-left p-3 hover:bg-[#fffbf5] border-b border-gray-50 last:border-0 flex items-start gap-2 transition-colors"
                        >
                            <Search className="w-4 h-4 text-gray-400 mt-1 shrink-0" />
                            <div>
                                <span className="block text-sm text-[#3b2f2f]">{result.display_name}</span>
                            </div>
                        </button>
                    ))}
                    <div className="p-2 flex justify-center bg-gray-50 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400">Powered by OpenStreetMap</span>
                    </div>
                </div>
            )}
        </div>
    );
};
