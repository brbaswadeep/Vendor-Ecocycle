import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import LocationRequiredPopup from './LocationRequiredPopup';
import logo from '../assets/logo.png';
import { Store, User, LogOut, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Layout() {
    const { t, i18n } = useTranslation();
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

    // Track synced language to prevent overriding preview
    const [syncedLang, setSyncedLang] = React.useState(null);

    // Sync language from user profile ONLY when it changes
    React.useEffect(() => {
        if (currentUser?.language && currentUser.language !== syncedLang) {
            i18n.changeLanguage(currentUser.language);
            setSyncedLang(currentUser.language);
        }
    }, [currentUser?.language, syncedLang, i18n]);

    async function handleLogout() {
        try {
            await logout();
            navigate('/');
        } catch {
            console.error("Failed to log out");
        }
    }

    if (!currentUser) return <Outlet />;

    return (
        <div className="min-h-screen bg-brand-cream font-sans">
            <LocationRequiredPopup />

            <nav className="bg-white/90 backdrop-blur-md border-b border-brand-brown/10 shadow-sm fixed top-0 left-0 right-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-20 items-center">
                        <Link to="/dashboard" className="flex gap-3 items-center group">
                            <img src={logo} alt={t('vendor_portal')} className="h-16 w-auto object-contain flex-shrink-0 group-hover:scale-105 transition-transform" />
                            <span className="font-bold text-xl text-brand-brown hidden md:block">{t('vendor_portal')}</span>
                        </Link>

                        {/* Navigation Links Removed per new design request */}

                        <div className="flex items-center gap-1">
                            <Link to="/products" className="flex items-center gap-2 bg-brand-green/10 text-brand-green hover:bg-brand-green/20 px-3 py-2 rounded-xl text-sm font-bold transition">
                                <Store className="w-4 h-4" />
                                <span className="hidden sm:inline">My Shop</span>
                            </Link>
                        </div>

                        {/* Language Selector */}
                        <LanguageSelector t={t} i18n={i18n} currentUser={currentUser} />

                        {/* Profile Link */}
                        <Link
                            to="/profile"
                            className="flex items-center gap-2 text-brand-brown hover:text-brand-orange transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-brand-brown text-white flex items-center justify-center font-bold text-sm">
                                {currentUser?.businessName?.[0]?.toUpperCase() || <Store className="w-4 h-4" />}
                            </div>
                            <span className="hidden sm:block font-medium truncate max-w-[150px]">
                                {currentUser?.businessName || currentUser?.email}
                            </span>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto pt-24 pb-10 px-4 sm:px-6 lg:px-8">
                <Outlet />
            </main>
        </div >
    );
}

function LanguageSelector({ t, i18n, currentUser }) {
    const [isOpen, setIsOpen] = React.useState(false);

    // Languages List
    const languages = [
        { code: 'en', name: 'English', native: 'English' },
        { code: 'hi', name: 'Hindi', native: 'हिंदी' },
        { code: 'mr', name: 'Marathi', native: 'मराठी' },
        { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
        { code: 'te', name: 'Telugu', native: 'తెలుగు' },
        { code: 'kn', name: 'Kannada', native: 'कन्नड़' },
        { code: 'bn', name: 'Bengali', native: 'বাংলা' },
        { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
        { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
    ];

    const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

    // Close dropdown on click outside
    React.useEffect(() => {
        const close = () => setIsOpen(false);
        if (isOpen) window.addEventListener('click', close);
        return () => window.removeEventListener('click', close);
    }, [isOpen]);

    const changeLanguage = async (langCode) => {
        i18n.changeLanguage(langCode);

        if (currentUser) {
            try {
                const userRef = doc(db, 'vendors', currentUser.uid);
                await updateDoc(userRef, {
                    language: langCode
                });
            } catch (err) {
                console.error("Error updating language preference:", err);
            }
        }
    };

    return (
        <div className="relative group" onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-brand-brown/5 hover:bg-brand-brown/10 px-3 py-2 rounded-xl transition-colors text-brand-brown font-medium text-sm"
            >
                <Store className="w-4 h-4" />
                <span className="hidden sm:inline">{currentLang.native}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-brand-brown/10 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-60 overflow-y-auto">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className={`w-full text-left px-4 py-3 text-sm font-medium hover:bg-brand-orange/5 hover:text-brand-orange transition-colors flex justify-between items-center ${i18n.language === lang.code ? 'bg-brand-orange/10 text-brand-orange' : 'text-brand-brown'}`}
                            >
                                <span>{lang.native}</span>
                                {i18n.language === lang.code && <div className="w-2 h-2 rounded-full bg-brand-orange"></div>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
