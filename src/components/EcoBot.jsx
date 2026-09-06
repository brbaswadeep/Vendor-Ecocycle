import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, Users, ChevronRight, Loader2 } from 'lucide-react';
import { chatWithEcoBot } from '../services/gemini';
import { useAuth } from '../context/AuthContext';

export default function EcoBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('menu'); // 'menu' | 'bot'
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi! I'm EcoBot. Need help with your orders or pricing?", isUser: false }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const { currentUser } = useAuth();

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (mode === 'bot') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, mode, isOpen]);

    // Helper to thoroughly hide Tawk widget and launcher bubble
    const hideTawk = () => {
        if (window.Tawk_API) {
            try {
                if (typeof window.Tawk_API.minimize === 'function') {
                    window.Tawk_API.minimize();
                }
                if (typeof window.Tawk_API.hideWidget === 'function') {
                    window.Tawk_API.hideWidget();
                }
            } catch (e) {
                console.error("Error hiding Tawk:", e);
            }
            // Fallback intervals to prevent Tawk's post-minimize animation from re-displaying its bubble
            setTimeout(() => {
                try {
                    if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
                        window.Tawk_API.hideWidget();
                    }
                } catch (_) {}
            }, 120);
            setTimeout(() => {
                try {
                    if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
                        window.Tawk_API.hideWidget();
                    }
                } catch (_) {}
            }, 350);
        }
    };

    const toggleOpen = () => {
        if (isOpen) {
            hideTawk();
            setIsOpen(false);
            setMode('menu');
        } else {
            hideTawk();
            setIsOpen(true);
            setMode('menu');
        }
    };

    const [isTawkReady, setIsTawkReady] = useState(false);

    useEffect(() => {
        const checkTawk = setInterval(() => {
            if (window.Tawk_API && typeof window.Tawk_API.hideWidget === 'function') {
                setIsTawkReady(true);
                clearInterval(checkTawk);

                // Ensure Tawk launcher is hidden initially
                hideTawk();

                window.Tawk_API.onChatMaximized = function () {
                    // Chat is opened
                };

                window.Tawk_API.onChatMinimized = function () {
                    hideTawk();
                    setIsOpen(true);
                    setMode('menu');
                };

                window.Tawk_API.onChatHidden = function () {
                    hideTawk();
                    setIsOpen(true);
                    setMode('menu');
                };

                window.Tawk_API.onChatEnded = function () {
                    hideTawk();
                    setIsOpen(true);
                    setMode('menu');
                };
            }
        }, 500);

        return () => clearInterval(checkTawk);
    }, []);

    const handleOpenTawk = () => {
        if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
            try {
                window.Tawk_API.showWidget();
                window.Tawk_API.maximize();
                // Close EcoBot modal while chatting with team so they never overlap
                setIsOpen(false);
            } catch (err) {
                console.error("Error opening Tawk:", err);
            }
        } else {
            alert("Support chat is initializing. Please try again in a moment.");
        }
    };

    const handleBackToMenu = () => {
        hideTawk();
        setMode('menu');
        setIsOpen(true);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), text: input, isUser: true };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            // Get AI response
            const replyText = await chatWithEcoBot(input, messages);
            const botMsg = { id: Date.now() + 1, text: replyText, isUser: false };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now() + 1, text: "Sorry, I'm having trouble right now.", isUser: false }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (!currentUser) return null; // Only show for logged in vendors

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 font-sans">

            {/* Widget Container */}
            {isOpen && (
                <div className="bg-white w-80 sm:w-96 rounded-3xl shadow-2xl border border-brand-brown/10 overflow-hidden animate-in slide-in-from-bottom-5 duration-300 origin-bottom-right">

                    {/* Header */}
                    <div className="bg-brand-brown p-4 flex justify-between items-center text-white relative">
                        {mode === 'bot' && (
                            <button
                                onClick={() => setMode('menu')}
                                className="absolute left-4 p-1 hover:bg-white/20 rounded-full transition-colors"
                                title="Back to Menu"
                            >
                                <ChevronRight className="w-6 h-6 rotate-180" />
                            </button>
                        )}

                        <div className="flex items-center gap-2 mx-auto">
                            <div className="p-2 bg-white/10 rounded-full">
                                {mode === 'bot' ? <Bot className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                            </div>
                            <div className="text-center">
                                <h3 className="font-bold text-sm">
                                    {mode === 'bot' ? 'Vendor Assistant' :
                                        mode === 'support' ? 'Support Status' : 'Vendor Support'}
                                </h3>
                                <p className="text-[10px] opacity-70">Always here to help</p>
                            </div>
                        </div>

                        <button onClick={toggleOpen} className="absolute right-4 p-2 hover:bg-white/10 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content: Mode Selection */}
                    {mode === 'menu' && (
                        <div className="p-6 space-y-4 bg-gray-50/50">
                            <p className="text-brand-brown/80 text-sm font-medium mb-2">Who would you like to talk to?</p>

                            <button
                                onClick={() => setMode('bot')}
                                className="w-full bg-white p-4 rounded-xl border border-brand-brown/10 shadow-sm hover:shadow-md hover:border-brand-orange/30 transition-all flex items-center gap-4 group"
                            >
                                <div className="w-10 h-10 bg-brand-cream rounded-full flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
                                    <Bot className="w-6 h-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="font-bold text-brand-brown">EcoBot AI</h4>
                                    <p className="text-xs text-brand-brown/60">Instant answers 24/7</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-orange" />
                            </button>

                            <button
                                onClick={handleOpenTawk}
                                className="w-full bg-white p-4 rounded-xl border border-brand-brown/10 shadow-sm hover:shadow-md hover:border-brand-brown/30 transition-all flex items-center gap-4 group"
                            >
                                <div className="w-10 h-10 bg-brand-brown/5 rounded-full flex items-center justify-center text-brand-brown group-hover:scale-110 transition-transform">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="font-bold text-brand-brown">Support Team</h4>
                                    <p className="text-xs text-brand-brown/60">Talk to a human</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-brand-brown" />
                            </button>
                        </div>
                    )}

                    {/* Content: Bot Chat */}
                    {mode === 'bot' && (
                        <div className="flex flex-col h-[400px]">
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 scroll-smooth">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.isUser
                                                ? 'bg-brand-orange text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex justify-start">
                                        <div className="bg-white p-3 rounded-2xl rounded-bl-sm border border-gray-100 shadow-sm flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask about orders, rates..."
                                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:bg-white transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="p-2 bg-brand-orange text-white rounded-full hover:bg-brand-red disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 pl-0.5" />}
                                </button>
                            </form>
                        </div>
                    )}
                    {/* Content: Support Mode */}
                    {mode === 'support' && (
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-brand-brown/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                <Users className="w-8 h-8 text-brand-brown" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-brand-brown">Support Chat Active</h3>
                                <p className="text-sm text-brand-brown/60">
                                    The support window is open. You can chat with our team there.
                                </p>
                            </div>
                            <button
                                onClick={handleBackToMenu}
                                className="px-6 py-2 bg-brand-brown text-white rounded-xl font-bold hover:bg-brand-black transition-colors shadow-lg flex items-center justify-center gap-2 mx-auto"
                            >
                                <ChevronRight className="w-4 h-4 rotate-180" />
                                Back to Menu
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={toggleOpen}
                    className="w-14 h-14 bg-brand-brown text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-full" />
                    <MessageCircle className="w-7 h-7 relative z-10" />

                    {/* Notification Dot (optional) */}
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-red border-2 border-brand-brown rounded-full z-20 animate-pulse"></span>
                </button>
            )}
        </div>
    );
}
