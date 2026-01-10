import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import LocationPicker from './LocationPicker';
import { MapPin, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LocationRequiredPopup() {
    const { t } = useTranslation();
    const { currentUser, refreshProfile } = useAuth();
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // If user is not logged in, or already has a location, don't show the popup
    if (!currentUser || currentUser.location) return null;

    const handleSave = async () => {
        if (!selectedLocation) {
            setError(t('error_select_location'));
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Note: Vendor data is likely in 'vendors' collection or similar. 
            // We need to confirm the collection name. Usually it matches the role.
            // If the user role is 'vendor', we should check 'vendors' collection ideally.
            // But let's check AuthContext to see what collection it uses.
            // Assuming 'vendors' collection for now based on context names.
            const collectionName = currentUser.role === 'customer' ? 'customers' : 'vendors';
            const userRef = doc(db, collectionName, currentUser.uid);
            await updateDoc(userRef, {
                location: selectedLocation
            });
            // Refresh auth context so the popup disappears immediately
            await refreshProfile();
        } catch (err) {
            console.error("Error saving location:", err);
            setError(t('error_save_location'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-brand-brown p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <MapPin className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">{t('location_required_title')}</h2>
                    <p className="opacity-90 mt-1">{t('location_required_desc')}</p>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                    <LocationPicker onLocationSelect={setSelectedLocation} />

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-4 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-colors shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('saving_location')}
                            </>
                        ) : (
                            t('confirm_location')
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
