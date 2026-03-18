import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { Check, MapPin, Navigation } from 'lucide-react';
import L from 'leaflet';
// We removed internal GeoSearchControl to avoid conflict/redundancy with external search

// Fix for default Leaflet marker icons not rendering correctly in React
// Using CDN URLs to avoid "Module not found" errors with bundlers
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
    onConfirm: (location: { lat: number; lng: number; confirmed: boolean }) => void;
    overridePosition?: { lat: number; lng: number } | null;
}

const MapEvents = ({ setPosition, overridePosition }: { setPosition: (pos: [number, number]) => void, overridePosition?: { lat: number; lng: number } | null }) => {
    const map = useMap();

    useMapEvents({
        click(e) {
            setPosition([e.latlng.lat, e.latlng.lng]);
        },
    });

    useEffect(() => {
        if (overridePosition) {
            map.flyTo([overridePosition.lat, overridePosition.lng], 16);
            setPosition([overridePosition.lat, overridePosition.lng]);
        }
    }, [overridePosition, map, setPosition]);

    return null;
};

export const LocationPicker: React.FC<LocationPickerProps> = ({ onConfirm, overridePosition }) => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    // Initial load: Try to get user location
    useEffect(() => {
        if (!confirmed && !position && !overridePosition) {
            // Default to Lichinga center
            setPosition([-13.3139, 35.2409]);
            handleLocateMe();
        }
    }, []);

    // Sync if parent passes a new location (e.g. from Autocomplete)
    useEffect(() => {
        if (overridePosition) {
            setPosition([overridePosition.lat, overridePosition.lng]);
        }
    }, [overridePosition]);

    const handleLocateMe = () => {
        setLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                    setLoading(false);
                },
                (err) => {
                    console.error("Location error:", err);
                    // Default fallback: Lichinga Center approx
                    setPosition([-13.3139, 35.2409]);
                    setLoading(false);
                }
            );
        } else {
            // Default fallback
            setPosition([-13.3139, 35.2409]);
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (position) {
            setConfirmed(true);
            onConfirm({ lat: position[0], lng: position[1], confirmed: true });
        }
    };

    const handleReedit = () => {
        setConfirmed(false);
        onConfirm({ lat: position![0], lng: position![1], confirmed: false });
    };

    return (
        <div className="space-y-4">
            <h4 className="font-bold text-[#3b2f2f] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#d9a65a]" />
                Localização de Entrega
                {confirmed && <Check className="w-4 h-4 text-green-500" />}
            </h4>

            {!confirmed ? (
                <div className="border-2 border-[#d9a65a] rounded-xl overflow-hidden shadow-md">
                    <div className="h-64 relative bg-gray-100 z-0">
                        {position && (
                            <MapContainer
                                center={position}
                                zoom={15}
                                scrollWheelZoom={true}
                                style={{ height: '100%', width: '100%', zIndex: 0 }}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={position}>
                                    <Popup>
                                        Ponto de Entrega
                                    </Popup>
                                </Marker>
                                <MapEvents setPosition={setPosition} overridePosition={overridePosition} />
                            </MapContainer>
                        )}

                        {loading && (
                            <div className="absolute inset-0 bg-white/80 z-[1000] flex items-center justify-center">
                                <span className="text-[#d9a65a] font-bold animate-pulse">A obter localização...</span>
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-white flex gap-2">
                        <button
                            onClick={handleLocateMe}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-[#3b2f2f] py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Navigation className="w-4 h-4" /> Atual
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleConfirm();
                            }}
                            disabled={!position}
                            className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors ${position ? 'bg-[#d9a65a] text-[#3b2f2f] hover:bg-[#c49248] shadow-sm' : 'bg-gray-200 text-gray-400'}`}
                        >
                            Confirmar Localização
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="font-bold text-[#3b2f2f] text-sm">Localização Confirmada</p>
                            <p className="text-xs text-gray-500">Coordenadas capturadas (Lat: {position![0].toFixed(4)}, Lng: {position![1].toFixed(4)})</p>
                        </div>
                    </div>
                    <button
                        onClick={handleReedit}
                        className="text-[#d9a65a] text-sm font-bold hover:underline"
                    >
                        Alterar
                    </button>
                </div>
            )
            }
        </div >
    );
};
