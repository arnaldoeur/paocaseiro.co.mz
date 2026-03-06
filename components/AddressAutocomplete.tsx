/// <reference types="@types/google.maps" />
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader } from 'lucide-react';

interface AddressAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    onSelect: (result: { label: string; x: number; y: number }) => void;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, onSelect }) => {
    const [query, setQuery] = useState(value);
    const [results, setResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
    const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

    // Initialize services
    useEffect(() => {
        if (window.google && window.google.maps && window.google.maps.places) {
            setAutocompleteService(new window.google.maps.places.AutocompleteService());
            setGeocoder(new window.google.maps.Geocoder());
        } else {
            // Wait for script to load
            const checkGoogleMaps = setInterval(() => {
                if (window.google && window.google.maps && window.google.maps.places) {
                    setAutocompleteService(new window.google.maps.places.AutocompleteService());
                    setGeocoder(new window.google.maps.Geocoder());
                    clearInterval(checkGoogleMaps);
                }
            }, 500);
            return () => clearInterval(checkGoogleMaps);
        }
    }, []);

    const [debouncedQuery, setDebouncedQuery] = useState(query);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(handler);
    }, [query]);

    useEffect(() => {
        if (!autocompleteService || !debouncedQuery || debouncedQuery.length < 3) {
            setResults([]);
            return;
        }

        setLoading(true);
        autocompleteService.getPlacePredictions({
            input: debouncedQuery,
            componentRestrictions: { country: 'mz' } // Limit to Mozambique
        }, (predictions, status) => {
            setLoading(false);
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
                setResults(predictions);
                setIsOpen(true);
            } else {
                setResults([]);
            }
        });
    }, [debouncedQuery, autocompleteService]);

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

    const handleSelect = (result: google.maps.places.AutocompletePrediction) => {
        setQuery(result.description);
        onChange(result.description);
        setIsOpen(false);
        setLoading(true);

        if (geocoder && result.place_id) {
            geocoder.geocode({ placeId: result.place_id }, (geocodeResults, status) => {
                setLoading(false);
                if (status === window.google.maps.GeocoderStatus.OK && geocodeResults && geocodeResults.length > 0) {
                    const location = geocodeResults[0].geometry.location;
                    onSelect({
                        label: result.description,
                        y: location.lat(), // lat
                        x: location.lng()  // lng
                    });
                }
            });
        }
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
                            <div>
                                <span className="block text-sm text-[#3b2f2f]">{result.structured_formatting?.main_text || result.description}</span>
                                {result.structured_formatting?.secondary_text && (
                                    <span className="block text-xs text-gray-500">{result.structured_formatting.secondary_text}</span>
                                )}
                            </div>
                        </button>
                    ))}
                    <div className="p-2 flex justify-center bg-gray-50 border-t border-gray-100">
                        <img src="https://developers.google.com/maps/documentation/images/powered_by_google_on_non_white.png" alt="Powered by Google" className="h-4 opacity-50" />
                    </div>
                </div>
            )}
        </div>
    );
};
