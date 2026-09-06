import { db } from '../firebase';
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    setDoc,
    addDoc,
    updateDoc,
    serverTimestamp,
    increment
} from 'firebase/firestore';

/**
 * Returns a canonical deterministic chat ID for two users.
 * Example: "uidA_uidB" (sorted alphabetically)
 */
export const getDeterministicChatId = (uid1, uid2) => {
    if (!uid1 || !uid2) return null;
    return [uid1, uid2].sort().join('_');
};

/**
 * Resolves the continuous person-to-person chatId.
 * 1. Checks if the canonical ID document exists.
 * 2. Checks if there is an existing legacy chat with both participants.
 * 3. Otherwise returns the canonical ID.
 */
export const resolveChatId = async (uid1, uid2, fallbackOrderId = null) => {
    if (!uid1 || !uid2) return fallbackOrderId;

    const canonicalId = getDeterministicChatId(uid1, uid2);

    try {
        // 1. Check if canonical doc exists
        const canonicalSnap = await getDoc(doc(db, 'chats', canonicalId));
        if (canonicalSnap.exists()) {
            return canonicalId;
        }

        // 2. Check if a chat between these two participants already exists
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', uid1)
        );
        const snapshot = await getDocs(q);
        const existingDoc = snapshot.docs.find(d => {
            const participants = d.data()?.participants || [];
            return participants.includes(uid2);
        });

        if (existingDoc) {
            return existingDoc.id;
        }
    } catch (err) {
        console.error("Error resolving chatId:", err);
    }

    // 3. Fallback to canonical deterministic ID
    return canonicalId;
};

/**
 * Deduplicates chat documents so each person has exactly ONE thread in the list.
 * Keeps the most recently updated chat if multiple legacy chats exist for the same participant.
 */
export const deduplicateAndSortChats = (loadedChats, currentUserId) => {
    if (!currentUserId || !Array.isArray(loadedChats)) return [];

    const map = new Map();

    for (const chat of loadedChats) {
        const otherId = chat.participants?.find(id => id !== currentUserId);
        if (!otherId) continue;

        const getChatMillis = (c) => {
            if (!c?.lastUpdated) return 0;
            if (typeof c.lastUpdated.toMillis === 'function') return c.lastUpdated.toMillis();
            if (c.lastUpdated.seconds) return c.lastUpdated.seconds * 1000;
            return 0;
        };

        if (!map.has(otherId)) {
            map.set(otherId, chat);
        } else {
            const existing = map.get(otherId);
            if (getChatMillis(chat) > getChatMillis(existing)) {
                map.set(otherId, chat);
            }
        }
    }

    const uniqueChats = Array.from(map.values());

    // Sort descending by last update
    uniqueChats.sort((a, b) => {
        const aTime = a.lastUpdated?.seconds || (a.lastUpdated?.toMillis ? a.lastUpdated.toMillis() / 1000 : 0);
        const bTime = b.lastUpdated?.seconds || (b.lastUpdated?.toMillis ? b.lastUpdated.toMillis() / 1000 : 0);
        return bTime - aTime;
    });

    return uniqueChats;
};

/**
 * Marks unread count as zero for current user on the given chat document.
 */
export const markChatAsRead = async (chatId, currentUserId) => {
    if (!chatId || !currentUserId) return;
    try {
        await updateDoc(doc(db, 'chats', chatId), {
            [`unreadCount.${currentUserId}`]: 0
        });
    } catch (err) {
        console.debug("markChatAsRead status:", err.message);
    }
};

/**
 * Sends a message in the person-to-person chat, updating parent chat metadata.
 */
export const sendChatMessage = async ({
    chatId,
    senderId,
    senderName,
    receiverId,
    receiverName,
    text,
    orderId = null
}) => {
    if (!chatId || !senderId || !text?.trim()) return null;

    const trimmedText = text.trim();
    const timestamp = serverTimestamp();

    // 1. Update/create parent chat doc first so rules can verify participants
    const chatDocRef = doc(db, 'chats', chatId);
    const updatePayload = {
        participants: receiverId ? [senderId, receiverId] : [senderId],
        lastMessage: trimmedText,
        lastUpdated: timestamp
    };

    if (orderId) {
        updatePayload.latestOrderId = orderId;
        updatePayload.orderId = orderId;
    }

    if (receiverId) {
        updatePayload[`unreadCount.${receiverId}`] = increment(1);
        updatePayload.participantNames = {
            [senderId]: senderName || 'Vendor',
            [receiverId]: receiverName || 'Customer'
        };
    }

    await setDoc(chatDocRef, updatePayload, { merge: true });

    // 2. Add message to subcollection
    const msgRef = await addDoc(collection(db, 'chats', chatId, 'messages'), {
        text: trimmedText,
        senderId,
        senderName: senderName || 'Vendor',
        createdAt: timestamp
    });

    return msgRef;
};

/**
 * Formats a Firestore timestamp into a friendly human-readable string.
 */
export const formatChatTimestamp = (timestamp, i18nTexts = {}) => {
    if (!timestamp) return '';

    let date;
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else {
        return '';
    }

    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (isYesterday) {
        return i18nTexts.yesterday || 'Yesterday';
    }

    if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};
