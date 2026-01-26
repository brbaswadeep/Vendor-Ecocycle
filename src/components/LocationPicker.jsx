import React, { useEffect, useRef, useState } from 'react';
// Import the place picker web component which is a valid export
import '@googlemaps/extended-component-library/place_picker.js';
import { useTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("LocationPicker Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                    <p className="text-red-600 font-medium">Something went wrong loading the map.</p>
                    <p className="text-xs text-red-400 mt-1">{this.state.error?.message}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

function LocationPickerContent({
    initialLocation,
    onLocationSelect,
    readOnly = false
}) {
    const { t } = useTranslation();
    const mapRef = useRef(null);
    const pickerRef = useRef(null);
    const [map, setMap] = useState(null);
    const markerRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const initMap = async () => {
            // Check if google maps is loaded
            if (!window.google || !window.google.maps) {
                console.warn("Google Maps API not loaded");
                return;
            }

            try {
                const { Map } = await window.google.maps.importLibrary("maps");
                const { AdvancedMarkerElement } = await window.google.maps.importLibrary("marker");
                const { Geocoder } = await window.google.maps.importLibrary("geocoding");

                const geocoder = new Geocoder();

                const defaultLocation = { lat: 20.5937, lng: 78.9629 }; // India center
                const startLocation = initialLocation || defaultLocation;

                const initializedMap = new Map(mapRef.current, {
                    center: startLocation,
                    zoom: initialLocation ? 17 : 5,
                    mapId: "DEMO_MAP_ID", // Required for AdvancedMarkerElement
                    disableDefaultUI: true,
                    zoomControl: true,
                });

                setMap(initializedMap);

                // Initialize marker
                const marker = new AdvancedMarkerElement({
                    map: initializedMap,
                    position: startLocation,
                    gmpDraggable: !readOnly,
                    title: readOnly ? t('pickup_location_title') : t('drag_hint')
                });
                markerRef.current = marker;

                // Function to handle location update
                const handleLocationUpdate = async (latLng) => {
                    if (!latLng) return;

                    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
                    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;

                    // Geocode to get address
                    try {
                        const response = await geocoder.geocode({ location: { lat, lng } });
                        if (response.results[0]) {
                            if (onLocationSelect) {
                                onLocationSelect({
                                    address: response.results[0].formatted_address,
                                    coordinates: { lat, lng },
                                    // keep flat properties for compatibility if needed
                                    lat,
                                    lng
                                });
                            }
                        } else {
                            // Fallback if no address found
                            if (onLocationSelect) {
                                onLocationSelect({
                                    address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                                    coordinates: { lat, lng },
                                    lat,
                                    lng
                                });
                            }
                        }
                    } catch (e) {
                        console.error("Geocoding failed:", e);
                        // Fallback on error
                        if (onLocationSelect) {
                            onLocationSelect({
                                address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
                                coordinates: { lat, lng },
                                lat,
                                lng
                            });
                        }
                    }
                };

                // Handle marker drag
                if (!readOnly) {
                    // Use addEventListener for AdvancedMarkerElement
                    marker.addEventListener('dragend', async () => {
                        await handleLocationUpdate(marker.position);
                    });

                    initializedMap.addListener('click', async (e) => {
                        if (e.latLng) {
                            marker.position = e.latLng;
                            await handleLocationUpdate(e.latLng);
                        }
                    });
                }

                // Setup Place Picker
                if (pickerRef.current) {
                    const setupPicker = () => {
                        pickerRef.current.addEventListener('gmpx-placechange', () => {
                            const place = pickerRef.current.place;
                            if (place && place.location) {
                                const location = place.location;
                                initializedMap.setCenter(location);
                                initializedMap.setZoom(17);
                                marker.position = location;

                                if (onLocationSelect) {
                                    onLocationSelect({
                                        address: place.formattedAddress,
                                        coordinates: {
                                            lat: location.lat(),
                                            lng: location.lng()
                                        },
                                        lat: location.lat(),
                                        lng: location.lng(),
                                        name: place.displayName
                                    });
                                }
                            }
                        });
                    };

                    // Try to setup immediately, and safe check
                    setupPicker();
                }

            } catch (error) {
                console.error("Error loading Google Maps libraries:", error);
            }
        };

        if (window.google && window.google.maps) {
            initMap();
        } else {
            // Check periodically
            const interval = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(interval);
                    initMap();
                }
            }, 100);
            return () => clearInterval(interval);
        }

        return () => {
            // Cleanup listeners if needed
        };
    }, []); // Run once on mount

    // Update marker if initialLocation changes (e.g. from prop update)
    useEffect(() => {
        if (map && initialLocation && markerRef.current) {
            const newPos = { lat: initialLocation.lat, lng: initialLocation.lng };
            markerRef.current.position = newPos;
            map.setCenter(newPos);
            map.setZoom(17);
        }
    }, [initialLocation, map]);

    return (
        <div className="w-full space-y-4">
            {!readOnly && (
                <div className="bg-white p-2 rounded-xl border border-brand-brown/10 shadow-sm z-10 relative">
                    <gmpx-place-picker
                        ref={pickerRef}
                        placeholder={t('search_address_placeholder')}
                        style={{ width: '100%' }}
                    ></gmpx-place-picker>
                </div>
            )}

            <div className={`w-full rounded-2xl overflow-hidden shadow-md border border-brand-brown/10 relative z-0 ${readOnly ? 'h-[250px]' : 'h-[400px]'}`}>
                <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
            </div>

            {!readOnly && (
                <p className="text-xs text-brand-brown/60 text-center">
                    {t('location_instruction')}
                </p>
            )}
        </div>
    );
}

export default function LocationPicker(props) {
    return (
        <ErrorBoundary>
            <LocationPickerContent {...props} />
        </ErrorBoundary>
    );
}
