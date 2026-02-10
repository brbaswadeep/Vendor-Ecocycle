import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, setDoc, doc, increment } from 'firebase/firestore';
import { Send, X, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ChatModal({ orderId, currentUser, onClose, recipientName, receiverId }) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!orderId) return;

        const q = query(
            collection(db, 'chats', orderId, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [orderId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const timestamp = serverTimestamp();

            // 1. Add message to subcollection
            await addDoc(collection(db, 'chats', orderId, 'messages'), {
                text: newMessage,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || currentUser.email || t('default_vendor'),
                createdAt: timestamp
            });

            // 2. Update parent chat metadata for listing
            if (receiverId) {
                await setDoc(doc(db, 'chats', orderId), {
                    participants: [currentUser.uid, receiverId],
                    lastMessage: newMessage,
                    lastUpdated: timestamp,
                    orderId: orderId,
                    [`unreadCount.${receiverId}`]: increment(1),
                    // Store names for easier display
                    participantNames: {
                        [currentUser.uid]: currentUser.displayName || currentUser.businessName || t('default_vendor'),
                        [receiverId]: recipientName || t('default_customer')
                    }
                }, { merge: true });
            }

            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md h-[600px] flex flex-col rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">

                {/* Header */}
                <div className="bg-brand-brown p-4 flex justify-between items-center text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-full">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold">{t('chat_with')} {recipientName}</h3>
                            <p className="text-xs opacity-70">{t('order_id')}: {orderId ? orderId.slice(0, 6) : '...'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 && (
                        <div className="text-center text-gray-400 mt-10">
                            <p className="text-sm">{t('start_conversation')} {recipientName}</p>
                        </div>
                    )}

                    {messages.map((msg) => {
                        const isMe = msg.senderId === currentUser.uid;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                        ? 'bg-brand-brown text-white rounded-br-none'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    <p>{msg.text}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={t('type_message')}
                        className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-brand-brown focus:ring-2 focus:ring-brand-brown/10"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="p-3 bg-brand-brown text-white rounded-xl hover:bg-brand-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
}
