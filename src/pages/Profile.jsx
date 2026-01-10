import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import LocationPicker from '../components/LocationPicker';
import { MapPin, Loader2, Store, User, Phone, CheckCircle, Edit3, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Profile() {
    const { t, i18n } = useTranslation();
    const { currentUser, refreshProfile, logout } = useAuth();

    // State for toggle editing
    const [isEditing, setIsEditing] = useState(false);

    const [businessName, setBusinessName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState(null);
    const [language, setLanguage] = useState('en');

    // UI States
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if (currentUser && !isEditing) {
            setBusinessName(currentUser.businessName || '');
            setContactPerson(currentUser.contactPerson || '');
            setPhone(currentUser.phone || '');
            setLocation(currentUser.location || null);
            setLanguage(currentUser.language || 'en');


        }
    }, [currentUser, isEditing, i18n]);

    const handleSaveProfile = async () => {
        // Basic Validation
        if (!businessName.trim()) {
            setStatusMsg({ type: 'error', text: t('error_business_name') });
            return;
        }

        setLoading(true);
        setStatusMsg({ type: '', text: '' });

        try {
            const userRef = doc(db, 'vendors', currentUser.uid);
            await updateDoc(userRef, {
                businessName,
                contactPerson,
                phone,
                location,
                language // Save language preference
            });
            await refreshProfile();

            // Ensure app language updates immediately if it hasn't already
            if (language !== i18n.language) {
                i18n.changeLanguage(language);
            }

            setStatusMsg({ type: 'success', text: t('success_profile_update') });
            setIsEditing(false);

            setTimeout(() => setStatusMsg({ type: '', text: '' }), 3000);
        } catch (err) {
            console.error("Error updating profile:", err);
            setStatusMsg({ type: 'error', text: t('error_profile_update') });
        } finally {
            setLoading(false);
        }
    };

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        i18n.changeLanguage(newLang); // Update immediately for preview
    };

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'Hindi' },
        { code: 'mr', name: 'Marathi' },
        { code: 'ta', name: 'Tamil' },
        { code: 'te', name: 'Telugu' },
        { code: 'kn', name: 'Kannada' },
        { code: 'bn', name: 'Bengali' },
        { code: 'pa', name: 'Punjabi' },
        { code: 'gu', name: 'Gujarati' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-sm border border-brand-brown/5">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-brand-orange rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-brand-cream">
                        {currentUser?.businessName?.[0]?.toUpperCase() || <Store />}
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-brand-brown">
                            {currentUser?.businessName || t('business_profile')}
                        </h1>
                        <p className="text-brand-brown/60 text-sm font-medium">
                            {currentUser?.email}
                        </p>
                        <span className="inline-block mt-2 px-3 py-1 bg-brand-cream text-brand-brown text-xs font-bold rounded-full uppercase tracking-wider">
                            {currentUser?.businessType || t('vendor_type')}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all text-sm ${isEditing
                        ? 'bg-brand-brown/10 text-brand-brown hover:bg-brand-brown/20'
                        : 'bg-brand-brown text-white hover:bg-brand-black shadow-lg hover:shadow-xl active:scale-95'
                        }`}
                >
                    {isEditing ? t('cancel_edit') : (
                        <>
                            <Edit3 className="w-4 h-4" />
                            {t('edit_profile')}
                        </>
                    )}
                </button>
            </div>

            {/* Status Message */}
            {statusMsg.text && (
                <div className={`p-4 rounded-xl text-center font-bold animate-in fade-in slide-in-from-top-4 ${statusMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                    }`}>
                    {statusMsg.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Business Info Card */}
                <div className={`bg-white p-8 rounded-3xl shadow-sm border border-brand-brown/10 transition-all duration-300 ${isEditing ? 'ring-2 ring-brand-orange/10' : ''}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-cream rounded-xl text-brand-orange">
                            <Store className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-brand-brown">{t('business_details')}</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-brand-black/60 mb-2 uppercase tracking-wide">{t('business_name')}</label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                disabled={!isEditing}
                                className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${isEditing
                                    ? 'bg-brand-cream/30 border-2 border-brand-brown/10 focus:border-brand-brown focus:outline-none text-brand-brown'
                                    : 'bg-transparent border-transparent px-0 text-lg text-brand-brown'
                                    }`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-black/60 mb-2 uppercase tracking-wide">{t('contact_person')}</label>
                            <input
                                type="text"
                                value={contactPerson}
                                onChange={(e) => setContactPerson(e.target.value)}
                                disabled={!isEditing}
                                className={`w-full px-4 py-3 rounded-xl font-medium transition-all ${isEditing
                                    ? 'bg-brand-cream/30 border-2 border-brand-brown/10 focus:border-brand-brown focus:outline-none text-brand-brown'
                                    : 'bg-transparent border-transparent px-0 text-lg text-brand-brown'
                                    }`}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-brand-black/60 mb-2 uppercase tracking-wide">{t('contact_number')}</label>
                            <div className="relative">
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    disabled={!isEditing}
                                    className={`w-full rounded-xl font-medium transition-all ${isEditing
                                        ? 'pl-10 pr-4 py-3 bg-brand-cream/30 border-2 border-brand-brown/10 focus:border-brand-brown focus:outline-none text-brand-brown'
                                        : 'pl-0 bg-transparent border-transparent text-lg text-brand-brown'
                                        }`}
                                    placeholder={t('add_phone_placeholder')}
                                />
                                {isEditing && <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brown/40" />}
                            </div>
                        </div>

                        {/* Language Selector */}
                        <div>
                            <label className="block text-xs font-bold text-brand-black/60 mb-2 uppercase tracking-wide">{t('select_language')}</label>
                            <div className="relative">
                                <select
                                    value={language}
                                    onChange={handleLanguageChange}
                                    disabled={!isEditing}
                                    className={`w-full rounded-xl font-medium transition-all cursor-pointer ${isEditing
                                        ? 'pl-10 pr-4 py-3 bg-brand-cream/30 border-2 border-brand-brown/10 focus:border-brand-brown focus:outline-none text-brand-brown'
                                        : 'pl-0 bg-transparent border-transparent text-lg text-brand-brown/60 cursor-not-allowed'
                                        }`}
                                >
                                    {languages.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                                {isEditing && <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-brown/40 pointer-events-none" />}
                            </div>
                            {!isEditing && <p className="text-xs text-brand-brown/40 mt-1 italic">{t('click_edit_hint')}</p>}
                        </div>
                    </div>
                </div>

                {/* Location Card */}
                <div className={`bg-white p-8 rounded-3xl shadow-sm border border-brand-brown/10 transition-all duration-300 ${isEditing ? 'ring-2 ring-brand-orange/10' : ''}`}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-brand-cream rounded-xl text-brand-orange">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-brand-brown">{t('location')}</h2>
                    </div>

                    {/* View Mode */}
                    {!isEditing && location && (
                        <div className="space-y-4">
                            <div className="p-4 bg-brand-cream/50 rounded-2xl border border-brand-brown/5">
                                <p className="text-brand-brown font-medium leading-relaxed">
                                    {location.address}
                                </p>
                            </div>
                            <div className="relative group">
                                <LocationPicker
                                    initialLocation={location.coordinates}
                                    readOnly={true}
                                />
                                <div
                                    onClick={() => setIsEditing(true)}
                                    className="absolute inset-0 bg-brand-brown/0 hover:bg-brand-brown/10 transition-colors cursor-pointer flex items-center justify-center group-hover:opacity-100 opacity-0"
                                >
                                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg text-xs font-bold text-brand-brown flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                        <Edit3 className="w-3 h-3" />
                                        {t('update_location')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!isEditing && !location && (
                        <div className="text-center py-12 bg-brand-cream/30 rounded-2xl border-2 border-dashed border-brand-brown/10">
                            <MapPin className="w-10 h-10 text-brand-brown/20 mx-auto mb-3" />
                            <p className="text-brand-brown/50 font-medium">{t('no_location')}</p>
                            <button onClick={() => setIsEditing(true)} className="mt-4 text-brand-orange font-bold text-sm hover:underline">
                                {t('add_location')}
                            </button>
                        </div>
                    )}

                    {/* Edit Mode */}
                    {isEditing && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <LocationPicker
                                initialLocation={location?.coordinates}
                                onLocationSelect={(newLoc) => setLocation(newLoc)}
                            />
                            <div className="p-3 mt-4 bg-brand-cream/50 rounded-lg text-sm text-brand-brown/70 text-center">
                                {t('selected_label')} <span className="font-bold text-brand-brown">{location?.address || t('none')}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Button */}
            <div className="pt-8 border-t border-brand-brown/10">
                <button
                    onClick={logout}
                    className="w-full sm:w-auto px-6 py-3 text-brand-red font-bold hover:bg-brand-red/5 rounded-xl transition-colors border border-brand-red/20 flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                    {t('logout_business')}
                </button>
            </div>

            {/* Save Button (Only in Edit Mode) */}
            {
                isEditing && (
                    <div className="flex justify-end pt-4 animate-in slide-in-from-bottom-4">
                        <button
                            onClick={handleSaveProfile}
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-4 bg-brand-orange text-white font-bold rounded-xl hover:bg-brand-brown transition-all shadow-xl hover:shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                        >
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                            ) : (
                                <CheckCircle className="w-6 h-6" />
                            )}
                            {loading ? t('saving') : t('save_business_profile')}
                        </button>
                    </div>
                )
            }
        </div >
    );
}
