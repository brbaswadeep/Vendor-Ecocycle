import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import {
    MessageCircle,
    Send,
    Search,
    User,
    ChevronLeft,
    ExternalLink,
    Loader2,
    CheckCheck,
    X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    deduplicateAndSortChats,
    markChatAsRead,
    sendChatMessage,
    formatChatTimestamp
} from '../services/chatService';

export default function Messages() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChat, setSelectedChat] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Active conversation state
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // 1. Subscribe to chats where vendor is a participant
    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rawChats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Deduplicate person-to-person
            const uniqueChats = deduplicateAndSortChats(rawChats, currentUser.uid);
            setChats(uniqueChats);
            setLoading(false);

            // Keep selected chat in sync
            setSelectedChat(prev => {
                if (!prev) return null;
                const updated = uniqueChats.find(c => c.id === prev.id);
                return updated || prev;
            });
        }, (err) => {
            console.error("Error fetching chats:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    // 2. Subscribe to messages when a chat is selected
    useEffect(() => {
        if (!selectedChat?.id) {
            setMessages([]);
            return;
        }

        setLoadingMessages(true);

        if (currentUser?.uid) {
            markChatAsRead(selectedChat.id, currentUser.uid);
        }

        const q = query(
            collection(db, 'chats', selectedChat.id, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setLoadingMessages(false);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }, (err) => {
            console.error("Error listening to messages:", err);
            setLoadingMessages(false);
        });

        return () => unsubscribe();
    }, [selectedChat?.id, currentUser?.uid]);

    // Helper to get other participant (customer)
    const getOtherParticipantInfo = (chat) => {
        if (!chat) return { name: t('default_customer'), id: null };
        const otherId = chat.participants?.find(id => id !== currentUser?.uid);
        const name = chat.participantNames?.[otherId] || t('default_customer');
        return { name, id: otherId };
    };

    const handleSelectChat = (chat) => {
        setSelectedChat(chat);
        if (currentUser?.uid) {
            markChatAsRead(chat.id, currentUser.uid);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || sending) return;

        const otherInfo = getOtherParticipantInfo(selectedChat);
        const textToSend = newMessage;
        setNewMessage('');
        setSending(true);

        try {
            await sendChatMessage({
                chatId: selectedChat.id,
                senderId: currentUser.uid,
                senderName: currentUser.displayName || currentUser.businessName || t('default_vendor'),
                receiverId: otherInfo.id,
                receiverName: otherInfo.name,
                text: textToSend,
                orderId: selectedChat.latestOrderId || selectedChat.orderId || null
            });
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        } catch (error) {
            console.error("Failed to send message:", error);
            setNewMessage(textToSend);
        } finally {
            setSending(false);
        }
    };

    const [filterTab, setFilterTab] = useState('all');
    const [isMsgSearchOpen, setIsMsgSearchOpen] = useState(false);
    const [msgSearchQuery, setMsgSearchQuery] = useState('');

    // Total unread messages across all chats
    const totalUnreadCount = chats.reduce((acc, c) => acc + (c.unreadCount?.[currentUser?.uid] || 0), 0);

    // Filter conversations
    const filteredChats = chats.filter(chat => {
        if (filterTab === 'unread') {
            const unread = chat.unreadCount?.[currentUser?.uid] || 0;
            if (unread <= 0) return false;
        }
        if (!searchQuery.trim()) return true;
        const other = getOtherParticipantInfo(chat);
        const queryLower = searchQuery.toLowerCase().trim();
        const matchesName = (other.name || '').toLowerCase().includes(queryLower);
        const matchesMessage = (chat.lastMessage || '').toLowerCase().includes(queryLower);
        const matchesOrder = (chat.latestOrderId || chat.orderId || '').toLowerCase().includes(queryLower);
        return matchesName || matchesMessage || matchesOrder;
    });

    const activeOtherInfo = selectedChat ? getOtherParticipantInfo(selectedChat) : null;
    const activeOrderId = selectedChat?.latestOrderId || selectedChat?.orderId;

    // Filter messages inside active conversation
    const displayedMessages = useMemo(() => {
        if (!msgSearchQuery.trim()) return messages;
        const q = msgSearchQuery.toLowerCase().trim();
        return messages.filter(m => (m.text || '').toLowerCase().includes(q));
    }, [messages, msgSearchQuery]);

    return (
        <div className="h-[calc(100vh-8.5rem)] min-h-[560px] flex flex-col animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-brand-brown/10 rounded-2xl text-brand-brown">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight flex items-center gap-2">
                            {t('messages')}
                            {chats.length > 0 && (
                                <span className="text-xs font-bold px-2.5 py-0.5 bg-brand-cream border border-brand-brown/15 rounded-xl text-brand-brown">
                                    {chats.length}
                                </span>
                            )}
                        </h1>
                        <p className="text-xs sm:text-sm text-brand-brown/60 font-medium">
                            {t('customer_inquiries')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Split Screen Chat Card */}
            <div className="flex-1 bg-white rounded-3xl border border-brand-brown/10 shadow-sm overflow-hidden flex relative">
                
                {/* LEFT PANE: Conversation List */}
                <div className={`w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col border-r border-brand-brown/10 bg-white ${
                    selectedChat ? 'hidden md:flex' : 'flex'
                }`}>
                    {/* Modern Search & Filter Header */}
                    <div className="p-3.5 sm:p-4 border-b border-brand-brown/10 bg-white space-y-2.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-brand-black tracking-tight">{t('conversations') || 'Conversations'}</h2>
                            <span className="text-[11px] font-semibold text-brand-brown/50 bg-brand-cream/60 px-2 py-0.5 rounded-lg border border-brand-brown/10">
                                {filteredChats.length} of {chats.length}
                            </span>
                        </div>

                        {/* Search Input Box */}
                        <div className="group relative flex items-center w-full bg-brand-cream/35 hover:bg-brand-cream/60 focus-within:bg-white focus-within:ring-3 focus-within:ring-brand-brown/10 focus-within:border-brand-brown/40 rounded-2xl border border-brand-brown/15 shadow-2xs transition-all duration-200">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-brown/45 group-focus-within:text-brand-brown transition-colors">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        e.stopPropagation();
                                        setSearchQuery('');
                                    }
                                }}
                                placeholder={t('search_conversations')}
                                className="w-full pl-10 pr-9 py-2.5 bg-transparent text-xs sm:text-sm text-brand-black placeholder:text-brand-brown/40 focus:outline-none font-medium"
                            />
                            {searchQuery ? (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-brown/40 hover:text-brand-black transition-colors"
                                    title="Clear search (Esc)"
                                >
                                    <span className="p-1 rounded-lg hover:bg-brand-brown/10 flex items-center justify-center">
                                        <X className="w-3.5 h-3.5" />
                                    </span>
                                </button>
                            ) : (
                                <span className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-brown/30 bg-white/70 border border-brand-brown/10 rounded px-1.5 py-0.5 pointer-events-none">
                                    Esc
                                </span>
                            )}
                        </div>

                        {/* Search Active Indicator */}
                        {searchQuery && (
                            <div className="flex items-center justify-between px-1 text-[11px] text-brand-brown/60">
                                <span>Found <strong className="text-brand-black">{filteredChats.length}</strong> {filteredChats.length === 1 ? 'chat' : 'chats'}</span>
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-[11px] font-semibold text-brand-orange hover:underline"
                                >
                                    Clear search
                                </button>
                            </div>
                        )}

                        {/* Filter Chips */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                                onClick={() => setFilterTab('all')}
                                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                                    filterTab === 'all'
                                        ? 'bg-brand-brown text-white shadow-2xs'
                                        : 'bg-brand-cream/50 hover:bg-brand-cream text-brand-brown/70 border border-brand-brown/10'
                                }`}
                            >
                                {t('all_chats') || 'All'} ({chats.length})
                            </button>
                            <button
                                onClick={() => setFilterTab('unread')}
                                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    filterTab === 'unread'
                                        ? 'bg-brand-orange text-white shadow-2xs'
                                        : 'bg-brand-cream/50 hover:bg-brand-cream text-brand-brown/70 border border-brand-brown/10'
                                }`}
                            >
                                <span>{t('unread_chats') || 'Unread'}</span>
                                {totalUnreadCount > 0 && (
                                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                        filterTab === 'unread' ? 'bg-white/20 text-white' : 'bg-brand-orange text-white'
                                    }`}>
                                        {totalUnreadCount}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Chat List Body */}
                    <div className="flex-1 overflow-y-auto divide-y divide-brand-brown/5">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-brand-brown/50 gap-2">
                                <Loader2 className="w-7 h-7 text-brand-orange animate-spin" />
                                <span className="text-xs font-medium">Loading conversations...</span>
                            </div>
                        ) : filteredChats.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-brown/5 flex items-center justify-center mx-auto mb-3 text-brand-brown/40">
                                    <MessageCircle className="w-6 h-6" />
                                </div>
                                <h3 className="text-sm font-bold text-brand-brown">
                                    {searchQuery ? t('no_matching_conversations') || 'No conversations found' : t('no_messages_yet')}
                                </h3>
                                <p className="text-xs text-brand-brown/60 mt-1 max-w-xs mx-auto">
                                    {searchQuery
                                        ? `No conversations match "${searchQuery}". Try a different name or keyword.`
                                        : t('chats_appear_here')}
                                </p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-brand-brown text-xs font-semibold hover:bg-brand-cream border border-brand-brown/15 shadow-2xs transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        <span>Reset search</span>
                                    </button>
                                )}
                            </div>
                        ) : (
                            filteredChats.map((chat) => {
                                const { name, id: otherId } = getOtherParticipantInfo(chat);
                                const isSelected = selectedChat?.id === chat.id;
                                const unread = chat.unreadCount?.[currentUser?.uid] || 0;
                                const orderIdSnippet = chat.latestOrderId || chat.orderId;

                                return (
                                    <div
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat)}
                                        className={`p-3.5 sm:p-4 cursor-pointer transition-all flex items-start gap-3 relative ${
                                            isSelected
                                                ? 'bg-[#FAF7F2] border-l-4 border-brand-orange'
                                                : 'hover:bg-brand-cream/30'
                                        }`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative shrink-0">
                                            <div className="w-11 h-11 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-base shadow-xs">
                                                {name ? name[0]?.toUpperCase() : <User className="w-5 h-5 text-brand-orange" />}
                                            </div>
                                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-1 mb-1">
                                                <h4 className={`text-sm truncate ${unread > 0 ? 'font-extrabold text-brand-black' : 'font-semibold text-brand-black'}`}>
                                                    {name}
                                                </h4>
                                                <span className="text-[11px] text-brand-brown/50 font-medium shrink-0">
                                                    {formatChatTimestamp(chat.lastUpdated, { yesterday: t('yesterday') })}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-xs truncate ${unread > 0 ? 'font-semibold text-brand-black' : 'text-brand-brown/70'}`}>
                                                    {chat.lastMessage || 'No messages yet'}
                                                </p>
                                                {unread > 0 && (
                                                    <span className="shrink-0 px-2 py-0.5 bg-brand-orange text-white text-[10px] font-extrabold rounded-lg shadow-xs">
                                                        {unread}
                                                    </span>
                                                )}
                                            </div>

                                            {orderIdSnippet && (
                                                <div className="mt-1 flex items-center gap-1">
                                                    <span className="text-[10px] font-mono text-brand-brown/50 bg-white px-1.5 py-0.5 rounded border border-brand-brown/10">
                                                        {t('order_hash')}{orderIdSnippet.slice(0, 6)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Active Chat Stream */}
                <div className={`flex-1 flex flex-col bg-[#FAF7F2]/40 ${
                    !selectedChat ? 'hidden md:flex' : 'flex'
                }`}>
                    {selectedChat ? (
                        <>
                            {/* Chat Top Header */}
                            <div className="px-4 sm:px-6 py-3.5 bg-white border-b border-brand-brown/10 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-3">
                                    {/* Mobile Back Button */}
                                    <button
                                        onClick={() => setSelectedChat(null)}
                                        className="md:hidden p-2 -ml-2 text-brand-brown/70 hover:text-brand-black hover:bg-brand-cream/60 rounded-xl transition-colors"
                                        title="Back to conversations"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>

                                    <div className="w-10 h-10 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange font-bold text-base shadow-xs">
                                        {activeOtherInfo?.name ? activeOtherInfo.name[0]?.toUpperCase() : <User className="w-5 h-5" />}
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-brand-black text-sm sm:text-base leading-tight">
                                            {activeOtherInfo?.name || t('default_customer')}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                            <span className="text-[11px] text-brand-brown/60 font-medium">{t('direct_conversation')}</span>
                                            {activeOrderId && (
                                                <span className="text-[10px] font-mono text-brand-brown/60 bg-brand-cream/80 px-1.5 py-0.5 rounded border border-brand-brown/10">
                                                    #{activeOrderId.slice(0, 6)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* In-chat Search Toggle */}
                                    <button
                                        onClick={() => {
                                            setIsMsgSearchOpen(prev => !prev);
                                            if (isMsgSearchOpen) setMsgSearchQuery('');
                                        }}
                                        className={`p-2 rounded-xl border transition-colors ${
                                            isMsgSearchOpen 
                                                ? 'bg-brand-brown text-white border-brand-brown' 
                                                : 'border-brand-brown/15 text-brand-brown hover:bg-brand-cream/60'
                                        }`}
                                        title={isMsgSearchOpen ? "Close message search" : "Search in this conversation"}
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                    </button>

                                    {activeOrderId && (
                                        <Link
                                            to={`/requests`}
                                            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-brand-brown/15 text-brand-brown hover:bg-brand-cream/60 text-xs font-semibold transition-colors"
                                        >
                                            <span>{t('view_request')}</span>
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </Link>
                                    )}
                                </div>
                            </div>

                            {/* In-Conversation Message Search Drawer */}
                            {isMsgSearchOpen && (
                                <div className="px-4 py-2.5 bg-brand-cream/40 border-b border-brand-brown/10 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                                    <div className="group relative flex-1 flex items-center bg-white rounded-xl border border-brand-brown/15 focus-within:border-brand-brown/40 focus-within:ring-2 focus-within:ring-brand-brown/10 shadow-2xs transition-all">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-brown/40 group-focus-within:text-brand-brown">
                                            <Search className="w-3.5 h-3.5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={msgSearchQuery}
                                            onChange={(e) => setMsgSearchQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    if (msgSearchQuery) {
                                                        setMsgSearchQuery('');
                                                    } else {
                                                        setIsMsgSearchOpen(false);
                                                    }
                                                }
                                            }}
                                            placeholder="Search messages in this conversation..."
                                            className="w-full pl-8 pr-8 py-1.5 bg-transparent text-xs text-brand-black placeholder:text-brand-brown/40 focus:outline-none font-medium"
                                            autoFocus
                                        />
                                        {msgSearchQuery && (
                                            <button
                                                onClick={() => setMsgSearchQuery('')}
                                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-brand-brown/40 hover:text-brand-black"
                                                title="Clear query"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                    {msgSearchQuery && (
                                        <span className="text-[11px] font-semibold text-brand-brown/70 bg-brand-cream px-2 py-1 rounded-lg border border-brand-brown/10 shrink-0">
                                            {displayedMessages.length} {displayedMessages.length === 1 ? 'match' : 'matches'}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => {
                                            setIsMsgSearchOpen(false);
                                            setMsgSearchQuery('');
                                        }}
                                        className="p-1.5 text-brand-brown/50 hover:text-brand-black hover:bg-brand-cream rounded-lg transition-colors"
                                        title="Close search"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Messages Scroll Area */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
                                {loadingMessages ? (
                                    <div className="flex flex-col items-center justify-center h-full text-brand-brown/50 gap-2">
                                        <Loader2 className="w-7 h-7 text-brand-orange animate-spin" />
                                        <span className="text-xs font-medium">Loading message history...</span>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-brand-brown/50">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-brand-brown/10 flex items-center justify-center mb-3 shadow-xs">
                                            <MessageCircle className="w-6 h-6 text-brand-brown/40" />
                                        </div>
                                        <h4 className="text-sm font-bold text-brand-brown">{t('start_this_conversation')}</h4>
                                        <p className="text-xs text-brand-brown/60 mt-1 max-w-xs">
                                            Send a message to {activeOtherInfo?.name || t('default_customer')}. All messages will continue in this thread.
                                        </p>
                                    </div>
                                ) : displayedMessages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center p-6 text-brand-brown/50">
                                        <p className="text-xs font-semibold">No messages match "{msgSearchQuery}"</p>
                                        <button
                                            onClick={() => setMsgSearchQuery('')}
                                            className="mt-2 text-xs font-bold text-brand-orange hover:underline"
                                        >
                                            Clear message search
                                        </button>
                                    </div>
                                ) : (
                                    displayedMessages.map((msg) => {
                                        const isMe = msg.senderId === currentUser.uid;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div
                                                    className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                                        isMe
                                                            ? 'bg-brand-brown text-white rounded-br-xs shadow-xs'
                                                            : 'bg-white border border-brand-brown/10 text-brand-black rounded-bl-xs shadow-xs'
                                                    }`}
                                                >
                                                    <p className="break-words select-text">{msg.text}</p>
                                                    <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 font-medium ${
                                                        isMe ? 'text-white/70' : 'text-brand-brown/50'
                                                    }`}>
                                                        <span>{formatChatTimestamp(msg.createdAt, { yesterday: t('yesterday') })}</span>
                                                        {isMe && <CheckCheck className="w-3.5 h-3.5 text-white/80" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input Bar */}
                            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white border-t border-brand-brown/10 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`${t('type_message')}...`}
                                    disabled={loadingMessages}
                                    className="flex-1 px-4 py-3 bg-[#FAF7F2] border border-brand-brown/15 rounded-xl text-sm text-brand-black placeholder:text-brand-brown/40 focus:outline-none focus:border-brand-brown focus:ring-2 focus:ring-brand-brown/10 transition-all disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || sending || loadingMessages}
                                    className="p-3 bg-brand-brown text-white rounded-xl hover:bg-brand-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center justify-center shrink-0"
                                    title="Send Message"
                                >
                                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                        </>
                    ) : (
                        /* Empty State: No chat selected */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-brand-brown/50">
                            <div className="w-16 h-16 rounded-3xl bg-white border border-brand-brown/10 flex items-center justify-center mb-4 shadow-sm">
                                <MessageCircle className="w-8 h-8 text-brand-brown/40" />
                            </div>
                            <h3 className="text-lg font-bold text-brand-black">{t('select_conversation')}</h3>
                            <p className="text-xs sm:text-sm text-brand-brown/60 mt-1 max-w-sm">
                                {t('select_conversation_desc')}
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
