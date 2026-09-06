import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Send, X, User, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveChatId, sendChatMessage, markChatAsRead, formatChatTimestamp } from '../services/chatService';

export default function ChatModal({ orderId, currentUser, onClose, recipientName, receiverId }) {
    const { t } = useTranslation();
    const [resolvedChatId, setResolvedChatId] = useState(null);
    const [loadingChat, setLoadingChat] = useState(true);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // 1. Resolve continuous person-to-person chat ID
    useEffect(() => {
        let isMounted = true;

        async function initChat() {
            setLoadingChat(true);
            try {
                const chatId = await resolveChatId(currentUser?.uid, receiverId, orderId);
                if (isMounted) {
                    setResolvedChatId(chatId);
                    if (chatId && currentUser?.uid) {
                        markChatAsRead(chatId, currentUser.uid);
                    }
                }
            } catch (err) {
                console.error("Failed to resolve chat ID:", err);
                if (isMounted) setResolvedChatId(orderId);
            } finally {
                if (isMounted) setLoadingChat(false);
            }
        }

        if (currentUser?.uid && (receiverId || orderId)) {
            initChat();
        }

        return () => {
            isMounted = false;
        };
    }, [currentUser?.uid, receiverId, orderId]);

    // 2. Real-time message listener
    useEffect(() => {
        if (!resolvedChatId) return;

        const q = query(
            collection(db, 'chats', resolvedChatId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setTimeout(scrollToBottom, 100);
        }, (error) => {
            console.error("Messages listener error:", error);
        });

        return () => unsubscribe();
    }, [resolvedChatId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !resolvedChatId || sending) return;

        setSending(true);
        const textToSend = newMessage;
        setNewMessage('');

        try {
            await sendChatMessage({
                chatId: resolvedChatId,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || currentUser.businessName || t('default_vendor'),
                receiverId,
                receiverName: recipientName || t('default_customer'),
                text: textToSend,
                orderId
            });
            setTimeout(scrollToBottom, 50);
        } catch (error) {
            console.error("Error sending message:", error);
            setNewMessage(textToSend);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg h-[620px] max-h-[90vh] flex flex-col rounded-3xl shadow-xl border border-brand-brown/10 overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-white border-b border-brand-brown/10 px-5 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-base shadow-xs">
                            {recipientName ? recipientName[0]?.toUpperCase() : <User className="w-5 h-5 text-brand-orange" />}
                        </div>
                        <div>
                            <h3 className="font-bold text-brand-black text-base leading-tight">
                                {recipientName || t('chat')}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-xs text-brand-brown/60 font-medium">{t('customer')}</span>
                                {orderId && (
                                    <span className="text-[11px] font-mono text-brand-brown/50 bg-brand-cream/80 px-2 py-0.5 rounded-md border border-brand-brown/10">
                                        #{orderId.slice(0, 6)}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-brand-brown/60 hover:text-brand-black hover:bg-brand-cream/60 rounded-xl transition-colors"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-[#FAF7F2]/50">
                    {loadingChat ? (
                        <div className="flex flex-col items-center justify-center h-full text-brand-brown/50 gap-2">
                            <Loader2 className="w-7 h-7 text-brand-orange animate-spin" />
                            <span className="text-xs font-medium">Connecting conversation...</span>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-brand-brown/50">
                            <div className="w-12 h-12 rounded-2xl bg-brand-brown/5 flex items-center justify-center mb-3">
                                <User className="w-6 h-6 text-brand-brown/40" />
                            </div>
                            <p className="text-sm font-semibold text-brand-brown">{t('no_messages_yet')}</p>
                            <p className="text-xs text-brand-brown/60 mt-1 max-w-xs">
                                {t('start_conversation')} {recipientName || t('default_customer')}.
                            </p>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.senderId === currentUser.uid;
                            return (
                                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                            isMe
                                                ? 'bg-brand-brown text-white rounded-br-xs shadow-xs'
                                                : 'bg-white border border-brand-brown/10 text-brand-black rounded-bl-xs shadow-xs'
                                        }`}
                                    >
                                        <p className="break-words select-text">{msg.text}</p>
                                        <p className={`text-[10px] mt-1 text-right font-medium ${isMe ? 'text-white/70' : 'text-brand-brown/50'}`}>
                                            {formatChatTimestamp(msg.createdAt, { yesterday: t('yesterday') })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-3.5 bg-white border-t border-brand-brown/10 flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`${t('type_message')}...`}
                        disabled={loadingChat}
                        className="flex-1 px-4 py-2.5 bg-brand-cream/30 border border-brand-brown/15 rounded-xl text-sm text-brand-black placeholder:text-brand-brown/40 focus:outline-none focus:border-brand-brown focus:ring-2 focus:ring-brand-brown/10 transition-all disabled:opacity-50"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending || loadingChat}
                        className="p-2.5 bg-brand-brown text-white rounded-xl hover:bg-brand-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center"
                        title="Send"
                    >
                        {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
            </div>
        </div>
    );
}
