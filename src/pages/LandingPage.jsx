import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Mail, Lock, Eye, EyeOff, Building2, User, Briefcase, 
    ArrowRight, AlertCircle, Loader2 
} from 'lucide-react';
import logo from '../assets/logo.png';

export default function LandingPage() {
    const { t } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetSuccess, setResetSuccess] = useState('');

    const { login, signup, resetPassword } = useAuth();
    const navigate = useNavigate();

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [acceptsWetWaste, setAcceptsWetWaste] = useState(false);
    const [terms, setTerms] = useState(false);
    const [keepLogged, setKeepLogged] = useState(true);

    // Password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const executeRecaptcha = (action) => {
        return new Promise((resolve) => {
            if (!window.grecaptcha) {
                resolve(null);
                return;
            }
            window.grecaptcha.enterprise.ready(async () => {
                try {
                    const token = await window.grecaptcha.enterprise.execute('6Lf4N2UsAAAAANhe_R1rRUZ22M-giKsMGAYom4R6', { action });
                    resolve(token);
                } catch {
                    resolve(null);
                }
            });
        });
    };

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await executeRecaptcha('VENDOR_LOGIN');
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message?.replace("Firebase: ", "") || "Sign in failed. Check your credentials.");
        } finally {
            setLoading(false);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (!terms) {
            setError("Please agree to the terms to proceed.");
            return;
        }

        setLoading(true);
        try {
            await executeRecaptcha('VENDOR_REGISTER');
            await signup(email, password, businessName, contactPerson, businessType, acceptsWetWaste);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message?.replace("Firebase: ", "") || "Registration failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleForgotPassword(e) {
        e.preventDefault();
        setError('');
        setResetSuccess('');
        if (!email) {
            setError("Please enter your email.");
            return;
        }

        setLoading(true);
        try {
            await resetPassword(email);
            setResetSuccess("Reset link sent to your email.");
        } catch (err) {
            setError(err.message?.replace("Firebase: ", "") || "Failed to send reset link.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-white overflow-y-auto">
            {/* ============================================================ */}
            {/* LEFT PANEL: ON-THEME GEOMETRIC ART (CREAM + BRAND COLORS) */}
            {/* ============================================================ */}
            <div className="hidden lg:block w-1/2 bg-brand-cream relative overflow-hidden h-screen sticky top-0 order-2 lg:order-1">
                {/* Abstract Circular / Industrial Geometric Composition */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 h-full w-full">

                    {/* Top Left: Concentric Arcs & Gear Motif */}
                    <div className="bg-brand-red/95 relative overflow-hidden flex items-center justify-center p-8">
                        <div className="absolute -left-16 -top-16 w-80 h-80 rounded-full border-[36px] border-brand-orange/80"></div>
                        <div className="absolute -left-4 -top-4 w-48 h-48 rounded-full border-[24px] border-brand-brown/60"></div>
                        <div className="relative z-10 text-white/90 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-brand-black flex items-center justify-center mx-auto mb-3 shadow-xl">
                                <div className="w-6 h-6 border-4 border-brand-orange rotate-45"></div>
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-brand-cream/80">
                                Sourcing & Dispatch
                            </span>
                        </div>
                    </div>

                    {/* Top Right: High Contrast Bauhaus Cycle */}
                    <div className="bg-brand-black relative overflow-hidden flex flex-col justify-center items-center p-8">
                        <div className="w-44 h-44 rounded-full border-8 border-brand-orange/40 flex items-center justify-center relative">
                            <div className="w-28 h-28 rounded-full bg-brand-red flex items-center justify-center shadow-2xl">
                                <div className="w-10 h-10 rounded-full bg-brand-cream"></div>
                            </div>
                            <div className="absolute top-0 right-4 w-6 h-6 rounded-full bg-brand-green"></div>
                        </div>
                        <div className="mt-6 flex gap-2">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="w-2 h-2 rounded-full bg-brand-cream/30"></div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom Left: Geometric Diagonal Curves */}
                    <div className="bg-brand-brown relative overflow-hidden flex items-end p-8">
                        <div className="absolute top-0 right-0 w-60 h-60 bg-brand-orange/30 rounded-bl-full"></div>
                        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-red/60 rounded-bl-full"></div>
                        <div className="relative z-10">
                            <div className="text-3xl font-black text-brand-cream tracking-tight mb-1">
                                98.5%
                            </div>
                            <div className="text-xs font-bold text-brand-orange uppercase tracking-wider">
                                Route & Volume Efficiency
                            </div>
                        </div>
                    </div>

                    {/* Bottom Right: Clean Brand Palette Harmony */}
                    <div className="bg-brand-cream relative overflow-hidden flex items-center justify-center p-8 border-l border-t border-brand-brown/10">
                        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-brand-orange/30"></div>
                        <div className="relative z-10 w-full text-center">
                            <div className="inline-block p-6 rounded-3xl bg-white border border-brand-brown/15 shadow-xl">
                                <div className="w-12 h-12 rounded-xl bg-brand-red/10 text-brand-red flex items-center justify-center mx-auto mb-2 font-black text-xl">
                                    ♻
                                </div>
                                <div className="text-sm font-black text-brand-black">
                                    EcoCycle Partner
                                </div>
                                <div className="text-[10px] font-bold text-brand-brown/60 uppercase tracking-widest mt-0.5">
                                    Verified Facility
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Central Interlocking Floating Emblem */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/90 backdrop-blur-md border-4 border-brand-brown/15 shadow-2xl flex flex-col items-center justify-center z-20 pointer-events-none">
                    <div className="w-24 h-24 rounded-full bg-brand-black flex items-center justify-center text-white">
                        <div className="w-12 h-12 rounded-full border-4 border-brand-orange flex items-center justify-center">
                            <div className="w-4 h-4 rounded-full bg-brand-red"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT PANEL: AUTH FORM (SIGN IN & REGISTER) */}
            {/* ============================================================ */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12 bg-white relative order-1 lg:order-2">
                <div className="w-full max-w-md mx-auto">
                    
                    {/* Header */}
                    <div className="text-center mb-8">
                        <img 
                            src={logo} 
                            alt="EcoCycle Logo" 
                            className="h-20 w-auto object-contain mx-auto mb-4 hover:scale-105 transition-transform duration-300 drop-shadow-sm cursor-pointer"
                            onClick={() => navigate('/')}
                        />
                        <h1 className="text-3xl font-extrabold text-brand-black mb-1">
                            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Vendor Portal' : 'Register Facility')}
                        </h1>
                        <p className="text-sm text-brand-brown/70">
                            {isForgotPassword 
                                ? 'Enter your email to receive a password reset link' 
                                : (isLogin ? 'Sign in to manage incoming orders & payouts' : 'Join the verified partner network')}
                        </p>
                    </div>

                    {/* Simple Switcher */}
                    {!isForgotPassword && (
                        <div className="flex bg-brand-cream/70 p-1 rounded-xl mb-6 border border-brand-brown/10">
                            <button
                                type="button"
                                onClick={() => { setIsLogin(true); setError(''); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                    isLogin 
                                        ? 'bg-white text-brand-black shadow-sm' 
                                        : 'text-brand-brown/60 hover:text-brand-brown'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => { setIsLogin(false); setError(''); }}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                                    !isLogin 
                                        ? 'bg-white text-brand-black shadow-sm' 
                                        : 'text-brand-brown/60 hover:text-brand-brown'
                                }`}
                            >
                                Register Facility
                            </button>
                        </div>
                    )}

                    {/* Alerts */}
                    {error && (
                        <div className="mb-4 bg-red-50 border-l-4 border-brand-red p-3 text-sm text-brand-red font-medium rounded-r flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                    {resetSuccess && (
                        <div className="mb-4 bg-emerald-50 border-l-4 border-brand-green p-3 text-sm text-brand-green font-medium rounded-r">
                            {resetSuccess}
                        </div>
                    )}

                    {/* FORGOT PASSWORD */}
                    {isForgotPassword ? (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">
                                    Work Email <span className="text-brand-red">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                        placeholder="vendor@ecocycle.com"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-all shadow-lg shadow-brand-red/20 active:scale-95 disabled:opacity-70 text-sm"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Reset Link'}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setIsForgotPassword(false); setError(''); setResetSuccess(''); }}
                                className="w-full text-center text-sm font-bold text-brand-black hover:text-brand-red transition-colors pt-2"
                            >
                                ← Back to Sign In
                            </button>
                        </form>
                    ) : isLogin ? (
                        /* LOGIN FORM */
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-black mb-1.5 uppercase tracking-wide">
                                    Work Email <span className="text-brand-red">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                        placeholder="vendor@ecocycle.com"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="block text-xs font-bold text-brand-black uppercase tracking-wide">
                                        Password <span className="text-brand-red">*</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotPassword(true); setError(''); }}
                                        className="text-xs font-bold text-brand-red hover:underline"
                                    >
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                        placeholder="••••••••"
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <label className="flex items-center cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={keepLogged}
                                        onChange={(e) => setKeepLogged(e.target.checked)}
                                        className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                                    />
                                    <span className="ml-2 text-xs font-bold text-brand-black">Keep me signed in</span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-all shadow-lg shadow-brand-red/20 active:scale-95 disabled:opacity-70 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <span>Sign In to Dashboard</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="pt-4 text-center text-xs font-bold text-brand-black">
                                New facility?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(false); setError(''); }}
                                    className="text-brand-red hover:underline ml-1"
                                >
                                    Register here
                                </button>
                            </p>
                        </form>
                    ) : (
                        /* REGISTER FORM */
                        <form onSubmit={handleRegister} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-brand-black mb-1 uppercase tracking-wide">
                                    Facility Name <span className="text-brand-red">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                        placeholder="Green Recovery Ltd."
                                    />
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-brand-black mb-1 uppercase tracking-wide">
                                        Contact Person <span className="text-brand-red">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                            placeholder="Jane Doe"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-black mb-1 uppercase tracking-wide">
                                        Category <span className="text-brand-red">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={businessType}
                                            onChange={(e) => setBusinessType(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black text-sm transition-colors appearance-none"
                                        >
                                            <option value="" disabled>Select</option>
                                            <option value="recycling_center">Recycling Facility</option>
                                            <option value="waste_logistics">Scrap & Logistics</option>
                                            <option value="manufacturing">Manufacturing</option>
                                            <option value="other">Materials Other</option>
                                        </select>
                                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-black mb-1 uppercase tracking-wide">
                                    Work Email <span className="text-brand-red">*</span>
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                        placeholder="contact@greenrecovery.com"
                                    />
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-brand-black mb-1 uppercase tracking-wide">
                                        Password <span className="text-brand-red">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                            placeholder="Min. 6 chars"
                                        />
                                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown"
                                        >
                                            {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-black mb-1 uppercase tracking-wide">
                                        Confirm <span className="text-brand-red">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pl-9 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red text-brand-black placeholder-gray-400 text-sm transition-colors"
                                            placeholder="Repeat"
                                        />
                                        <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-brown"
                                        >
                                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-brand-cream/60 border border-brand-brown/15 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={acceptsWetWaste}
                                    onChange={(e) => setAcceptsWetWaste(e.target.checked)}
                                    className="w-4 h-4 mt-0.5 text-brand-green rounded border-gray-300 focus:ring-brand-green"
                                />
                                <div>
                                    <span className="text-xs font-bold text-brand-black flex items-center gap-1.5">
                                        <img src="/ecowaste.png" alt="EcoWaste" className="w-4 h-4 object-contain" />
                                        Accept Wet Waste Subscriptions (EcoWaste)
                                    </span>
                                    <p className="text-[11px] text-brand-brown/70 mt-0.5">
                                        Enable to receive recurring daily wet & organic scrap pickup requests from local households.
                                    </p>
                                </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                                <input
                                    type="checkbox"
                                    checked={terms}
                                    onChange={(e) => setTerms(e.target.checked)}
                                    className="w-4 h-4 text-brand-red rounded border-gray-300 focus:ring-brand-red"
                                />
                                <span className="text-xs font-medium text-brand-brown/80">
                                    I accept the EcoCycle Partner Terms
                                </span>
                            </label>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-brand-red text-white font-bold rounded-xl hover:bg-brand-brown transition-all shadow-lg shadow-brand-red/20 active:scale-95 disabled:opacity-70 text-sm flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                    <>
                                        <span>Create Partner Account</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>

                            <p className="pt-2 text-center text-xs font-bold text-brand-black">
                                Already registered?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setIsLogin(true); setError(''); }}
                                    className="text-brand-red hover:underline ml-1"
                                >
                                    Sign In
                                </button>
                            </p>
                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
