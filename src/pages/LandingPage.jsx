import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next'; // Import useTranslation

import logo from '../assets/logo.png'; // Make sure to import logo

export default function LandingPage() {
    const { t } = useTranslation(); // Hook
    const [isLogin, setIsLogin] = useState(false); // Default to Register based on Image 0, or Login? Let's default to Register as "Partner Registration" is Image 0.
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login, signup } = useAuth();
    const navigate = useNavigate();

    // Form Stats
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [terms, setTerms] = useState(false);
    const [keepLogged, setKeepLogged] = useState(false);

    const executeRecaptcha = (action) => {
        return new Promise((resolve) => {
            if (!window.grecaptcha) {
                console.error("reCAPTCHA not loaded");
                resolve(null);
                return;
            }
            window.grecaptcha.enterprise.ready(async () => {
                try {
                    const token = await window.grecaptcha.enterprise.execute('6Lf4N2UsAAAAANhe_R1rRUZ22M-giKsMGAYom4R6', { action });
                    console.log(`Recaptcha Token Generated (${action}):`, token);
                    resolve(token);
                } catch (error) {
                    console.error("reCAPTCHA execution failed:", error);
                    resolve(null);
                }
            });
        });
    };

    async function handleRegister(e) {
        e.preventDefault();
        setError('');

        if (!terms) {
            setError("You must agree to the Terms of Service.");
            return;
        }

        setLoading(true);
        try {
            // Generate reCAPTCHA Token
            await executeRecaptcha('VENDOR_REGISTER');

            await signup(email, password, businessName, contactPerson, businessType);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.message.replace("Firebase: ", ""));
        }
        setLoading(false);
    }

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Generate reCAPTCHA Token
            await executeRecaptcha('VENDOR_LOGIN');

            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            setError(err.message.replace("Firebase: ", ""));
        }
        setLoading(false);
    }

    if (isLogin) {
        // LOGIN VIEW (Image 1: Vendor Portal)
        return (
            <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4 lg:p-0 font-sans relative overflow-hidden">
                {/* Background decorative elements if needed */}

                <div className="max-w-7xl w-full flex flex-row items-center justify-between mx-auto lg:px-20">

                    {/* Left: Text Content */}
                    <div className="hidden lg:flex flex-col w-1/2 space-y-6 pr-10">
                        {/* Logo */}
                        <div className="flex items-center gap-2 mb-4">
                            <img src={logo} alt="EcoCycle Logo" className="w-16 h-16 object-contain" />
                        </div>

                        <h1 className="text-6xl font-extrabold text-brand-brown leading-tight">
                            {t('hero_title').split('Vendors')[0]} <span className="text-brand-orange">Vendors</span> <br />
                            {t('hero_title').split('Vendors')[1] || t('hero_title').split(' ').slice(2).join(' ')}
                        </h1>
                        <p className="text-brand-brown/80 text-lg max-w-lg leading-relaxed">
                            {t('hero_subtitle')}
                        </p>

                        <div className="flex gap-6 mt-8">
                            <div className="bg-brand-cream border border-brand-brown/10 p-6 rounded-2xl w-48 bg-white/50">
                                <div className="text-brand-red font-bold flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                    {t('efficiency_stat')}
                                </div>
                                <div className="text-3xl font-extrabold text-brand-brown">98.5%</div>
                                <div className="text-xs text-brand-brown/60 mt-1">{t('route_opt_score')}</div>
                            </div>
                            <div className="bg-brand-cream border border-brand-brown/10 p-6 rounded-2xl w-48 bg-white/50">
                                <div className="text-brand-orange font-bold flex items-center gap-2 mb-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    {t('impact_stat')}
                                </div>
                                <div className="text-3xl font-extrabold text-brand-brown">12.4k</div>
                                <div className="text-xs text-brand-brown/60 mt-1">{t('co2_saved')}</div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Login Card */}
                    <div className="w-full lg:w-[480px] bg-white rounded-3xl shadow-2xl p-8 lg:p-12 relative z-10 border-t-8 border-brand-red/80">
                        <h2 className="text-3xl font-bold text-brand-brown mb-2">{t('login_title')}</h2>
                        <p className="text-brand-brown/60 mb-8">{t('login_subtitle')}</p>

                        {error && <div className="mb-4 text-sm text-brand-red bg-red-50 p-3 rounded-lg border border-brand-red/20">{error}</div>}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-brand-brown mb-2">{t('email_label')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-3 border border-brand-brown/20 rounded-lg leading-5 bg-brand-cream/20 text-brand-black placeholder-brand-brown/30 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red sm:text-sm"
                                        placeholder="vendor@ecocycle.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-brand-brown">{t('password_label')}</label>
                                    <a href="#" className="text-xs font-bold text-brand-red hover:underline">{t('forgot_password')}</a>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="current-password"
                                        className="block w-full pl-10 pr-3 py-3 border border-brand-brown/20 rounded-lg leading-5 bg-brand-cream/20 text-brand-black placeholder-brand-brown/30 focus:outline-none focus:ring-1 focus:ring-brand-red focus:border-brand-red sm:text-sm"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    id="keep-logged"
                                    name="keep-logged"
                                    type="checkbox"
                                    checked={keepLogged}
                                    onChange={(e) => setKeepLogged(e.target.checked)}
                                    className="h-4 w-4 text-brand-red focus:ring-brand-red border-gray-300 rounded"
                                />
                                <label htmlFor="keep-logged" className="ml-2 block text-sm text-brand-brown/70">
                                    {t('keep_logged')}
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-red hover:bg-[#c4442b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-all duration-200 transform hover:-translate-y-0.5"
                            >
                                {loading ? t('accessing') : (
                                    <span className="flex items-center gap-2">{t('access_dashboard')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></span>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center text-xs font-medium text-brand-brown/60">
                            {t('not_registered')} <button onClick={() => setIsLogin(false)} className="text-brand-orange hover:text-brand-red hover:underline font-bold">{t('apply_partnership')}</button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // REGISTRATION VIEW (Image 0: Partner Registration)
    return (
        <div className="min-h-screen font-sans flex flex-col lg:flex-row bg-brand-cream">
            {/* Left Panel - Red/Orange Gradient */}
            <div className="hidden lg:flex w-5/12 bg-gradient-to-br from-[#e35336] to-[#f4a460] p-12 flex-col justify-between relative overflow-hidden">
                {/* Decorative Leaves */}
                <div className="absolute top-1/4 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl translate-x-1/2"></div>

                <div>
                    <div className="flex items-center gap-3 text-white mb-16">
                        <img src={logo} alt="EcoCycle Logo" className="h-32 w-auto object-contain" />
                    </div>

                    <h1 className="text-5xl font-bold text-white leading-tight mb-8">
                        {t('hero_reg_title')}
                    </h1>

                    <p className="text-white/80 text-lg leading-relaxed max-w-md">
                        {t('hero_reg_subtitle')}
                    </p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-10 h-10 rounded-full bg-gray-300 border-2 border-[#e35336]"></div>
                            ))}
                            <div className="w-10 h-10 rounded-full bg-brand-orange border-2 border-[#e35336] flex items-center justify-center text-xs font-bold text-white">+2k</div>
                        </div>
                        <div>
                            <div className="text-white font-bold text-sm">{t('trusted_vendors')}</div>
                            <div className="text-white/60 text-xs">Across 15 countries</div>
                        </div>
                    </div>
                    <div className="mt-4 h-1 w-full bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-cream w-11/12 rounded-full"></div>
                    </div>
                    <div className="flex justify-end mt-1">
                        <span className="text-white/60 text-[10px]">{t('satisfaction_rate')}</span>
                    </div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col justify-center px-4 py-12 lg:px-24 bg-brand-cream">
                <div className="w-full max-w-xl mx-auto">
                    <div className="flex justify-end mb-8 lg:absolute lg:top-8 lg:right-12">
                        {/* Optional Theme Toggle can go here */}
                        <div className="w-8 h-8 rounded-full bg-brand-brown/10 flex items-center justify-center text-brand-brown">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold text-brand-brown mb-2">{t('partner_reg_title')}</h2>
                    <p className="text-brand-brown/60 mb-10">{t('partner_reg_subtitle')}</p>

                    {error && <div className="mb-6 text-sm text-brand-red bg-red-50 p-4 rounded-lg border border-brand-red/20 font-bold">{error}</div>}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-brand-brown uppercase tracking-wide mb-2">{t('business_name_label')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                </div>
                                <input
                                    type="text"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="block w-full pl-10 px-4 py-3 border border-white bg-white rounded-lg shadow-sm placeholder-gray-300 text-brand-black focus:ring-2 focus:ring-brand-red focus:border-transparent transition-shadow"
                                    placeholder="e.g. Green Earth Solutions Ltd."
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-brand-brown uppercase tracking-wide mb-2">{t('contact_person_label')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={contactPerson}
                                        onChange={(e) => setContactPerson(e.target.value)}
                                        className="block w-full pl-10 px-4 py-3 border border-white bg-white rounded-lg shadow-sm placeholder-gray-300 text-brand-black focus:ring-2 focus:ring-brand-red focus:border-transparent transition-shadow"
                                        placeholder="Jane Doe"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-brown uppercase tracking-wide mb-2">{t('work_email_label')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-10 px-4 py-3 border border-white bg-white rounded-lg shadow-sm placeholder-gray-300 text-brand-black focus:ring-2 focus:ring-brand-red focus:border-transparent transition-shadow"
                                        placeholder="jane@company.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-xs font-bold text-brand-brown uppercase tracking-wide mb-2">{t('business_type_label')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        {/* Icon for Business Type */}
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    <select
                                        value={businessType}
                                        onChange={(e) => setBusinessType(e.target.value)}
                                        className="block w-full pl-10 px-4 py-3 border border-white bg-white rounded-lg shadow-sm text-brand-black focus:ring-2 focus:ring-brand-red focus:border-transparent transition-shadow appearance-none"
                                        required
                                        style={{ color: businessType ? 'inherit' : '#d1d5db' }}
                                    >
                                        <option value="" disabled>{t('select_type')}</option>
                                        <option value="recycling_center" className="text-black">{t('type_recycling')}</option>
                                        <option value="waste_logistics" className="text-black">{t('type_logistics')}</option>
                                        <option value="manufacturing" className="text-black">{t('type_manufacturing')}</option>
                                        <option value="other" className="text-black">{t('type_other')}</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-brand-brown uppercase tracking-wide mb-2">{t('password_label')}</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete="new-password"
                                        className="block w-full pl-10 px-4 py-3 border border-white bg-white rounded-lg shadow-sm placeholder-gray-300 text-brand-black focus:ring-2 focus:ring-brand-red focus:border-transparent transition-shadow"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start pt-2">
                            <input
                                id="terms"
                                name="terms"
                                type="checkbox"
                                checked={terms}
                                onChange={(e) => setTerms(e.target.checked)}
                                className="h-5 w-5 mt-0.5 text-brand-red border-gray-300 rounded focus:ring-brand-red"
                            />
                            <label htmlFor="terms" className="ml-3 block text-sm text-brand-brown/70">
                                {t('agree_terms')}
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-red hover:bg-[#c4442b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-red transition-all duration-200 transform hover:-translate-y-0.5 uppercase tracking-wider"
                        >
                            {loading ? t('registering') : (
                                <span className="flex items-center gap-2">{t('register_button')} <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg></span>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm font-medium text-brand-brown/60">
                        {t('already_registered')} <button onClick={() => setIsLogin(true)} className="text-brand-orange hover:text-brand-red hover:underline font-bold">{t('login_here')}</button>
                    </div>

                </div>
            </div>
        </div>
    );
}
