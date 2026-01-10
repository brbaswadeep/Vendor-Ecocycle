import React, { useEffect, useRef, useState } from 'react';
import { APILoader } from '@googlemaps/extended-component-library/react';
// Import the place picker web component which is a valid export
import '@googlemaps/extended-component-library/place_picker.js';
import { useTranslation } from 'react-i18next';

const GOOGLE_MAPS_API_KEY = "AIzaSyAK8sTrmDW4atGdZIW91qi-ZNfkm-PD6cc"; // Provided by user

export default function LocationPicker({
    initialLocation,
    onLocationSelect,
    readOnly = false
}) {
    const { t } = useTranslation();
    const mapRef = useRef(null);
    const pickerRef = useRef(null);
    const [mapInstance, setMapInstance] = useState(null);
    const [markerInstance, setMarkerInstance] = useState(null);
    const [geocoderInstance, setGeocoderInstance] = useState(null);

    // Default to India Center if no location provided
    const defaultCenter = { lat: 20.5937, lng: 78.9629 };
    const center = initialLocation && initialLocation.lat ? initialLocation : defaultCenter;

    // Helper to geocode and notify
    const geocodeAndNotify = async (location, geocoder) => {
        if (!geocoder || !onLocationSelect || readOnly) return;

        try {
            const response = await geocoder.geocode({ location: location });
            if (response.results[0]) {
                const address = response.results[0].formatted_address;
                onLocationSelect({
                    address: address,
                    coordinates: {
                        lat: typeof location.lat === 'function' ? location.lat() : location.lat,
                        lng: typeof location.lng === 'function' ? location.lng() : location.lng
                    }
                });
            }
        } catch (error) {
            console.error("Geocoding failed", error);
        }
    };

    useEffect(() => {
        const initMap = async () => {
            if (window.google && window.google.maps && mapRef.current && !mapInstance) {
                const { Map } = await google.maps.importLibrary("maps");
                const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
                const { Geocoder } = await google.maps.importLibrary("geocoding");

                const geocoder = new Geocoder();
                setGeocoderInstance(geocoder);

                const map = new Map(mapRef.current, {
                    center: center,
                    zoom: initialLocation ? 17 : 5,
                    mapId: "DEMO_MAP_ID",
                    disableDefaultUI: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    gestureHandling: readOnly ? "cooperative" : "auto",
                });

                const marker = new AdvancedMarkerElement({
                    map: map,
                    position: center,
                    gmpDraggable: !readOnly,
                    title: readOnly ? t('pickup_location_title') : t('drag_hint')
                });

                if (!readOnly) {
                    marker.addListener('dragend', async () => {
                        const newPos = marker.position;
                        if (newPos) {
                            await geocodeAndNotify(newPos, geocoder);
                        }
                    });
                }

                setMapInstance(map);
                setMarkerInstance(marker);
            }
        };

        const intervalId = setInterval(() => {
            if (window.google && window.google.maps) {
                initMap();
                clearInterval(intervalId);
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, [mapRef, t, readOnly]); // Added t dependency

    // Handle Place Picker changes
    useEffect(() => {
        const picker = pickerRef.current;
        if (!picker || !mapInstance || !markerInstance) return;

        const handlePlaceChange = () => {
            const place = picker.value;
            if (!place || !place.location) return;

            const location = place.location;

            // Update Map
            mapInstance.setCenter(location);
            mapInstance.setZoom(17);
            markerInstance.position = location;

            // Use the address from the picker directly if available
            // otherwise reverse geocode
            if (place.formattedAddress) {
                if (onLocationSelect) {
                    onLocationSelect({
                        address: place.formattedAddress,
                        coordinates: {
                            lat: location.lat(),
                            lng: location.lng()
                        }
                    });
                }
            } else {
                geocodeAndNotify(location, geocoderInstance);
            }
        };

        if (!readOnly) {
            picker.addEventListener('gmpx-placechange', handlePlaceChange);
        }
        return () => {
            if (!readOnly) picker.removeEventListener('gmpx-placechange', handlePlaceChange);
        };
    }, [mapInstance, markerInstance, geocoderInstance, onLocationSelect, readOnly]);

    return (
        <div className="w-full space-y-4">
            <APILoader apiKey={GOOGLE_MAPS_API_KEY} solutionChannel="GMP_GE_mapsandplacesautocomplete_v2" />

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
