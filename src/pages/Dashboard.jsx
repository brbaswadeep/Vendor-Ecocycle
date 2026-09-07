import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    Package, CheckCircle, XCircle, MessageCircle, Clock, 
    Calendar, ArrowRight, TrendingUp, AlertCircle, 
    ChevronRight, Store, ArrowUpRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        pending: 0,
        accepted: 0,
        declined: 0,
        unreadMessages: 0,
        totalEarnings: 0
    });
    const [deadlines, setDeadlines] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!currentUser) return;
            try {
                // 1. Fetch Requests Stats
                const q = query(
                    collection(db, "requests"),
                    where("vendorIds", "array-contains", currentUser.uid)
                );
                const snapshot = await getDocs(q);

                let pending = 0;
                let accepted = 0;
                let declined = 0;
                let totalEarnings = 0;
                const activeOrders = [];

                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'pending') pending++;
                    else if (data.status === 'accepted' && data.acceptedBy === currentUser.uid) {
                        accepted++;
                        const earnings = data.finalQuote?.finalVendorEarnings || 0;
                        if (earnings > 0) {
                            totalEarnings += earnings;
                        }

                        if (data.projectMeta?.estimatedCompletion) {
                            activeOrders.push({
                                id: doc.id,
                                ...data
                            });
                        }
                    }
                    else if (data.status === 'declined') declined++;
                });

                // 2. Fetch Shop Orders (Sales)
                const shopQ = query(
                    collection(db, "orders"),
                    where("vendorId", "==", currentUser.uid)
                );
                const shopSnapshot = await getDocs(shopQ);

                shopSnapshot.forEach(doc => {
                    const data = doc.data();
                    const shopEarnings = data.priceBreakdown?.vendorEarnings || 0;
                    if (shopEarnings > 0) {
                        totalEarnings += shopEarnings;
                    }
                });

                setStats({
                    pending,
                    accepted,
                    declined,
                    unreadMessages: 0,
                    totalEarnings
                });

                // 3. Process Deadlines
                const now = new Date();
                const processedDeadlines = activeOrders.map(order => {
                    const deadline = order.projectMeta.estimatedCompletion.toDate 
                        ? order.projectMeta.estimatedCompletion.toDate() 
                        : new Date(order.projectMeta.estimatedCompletion);
                    const diffTime = deadline - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return {
                        ...order,
                        daysRemaining: diffDays,
                        deadlineDate: deadline
                    };
                });

                processedDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);
                setDeadlines(processedDeadlines);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [currentUser]);

    const formattedEarnings = `₹${Math.round(stats.totalEarnings).toLocaleString('en-IN')}`;

    return (
        <div className="space-y-6 animate-in fade-in duration-300 pb-10">
            {/* Header Banner */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-brown/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight">
                        Hi, <span className="text-brand-brown">{currentUser?.businessName || currentUser?.contactPerson || 'Partner'}</span>! 👋
                    </h1>
                    <p className="text-sm text-brand-brown/70 font-medium mt-1">
                        Track your requests, deliveries, and earnings.
                    </p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => navigate('/products')}
                        className="flex-1 md:flex-none px-5 py-3 bg-brand-red hover:bg-brand-brown text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Store className="w-4 h-4" />
                        My Shop
                    </button>
                    <button
                        onClick={() => navigate('/requests?filter=pending')}
                        className="flex-1 md:flex-none px-5 py-3 bg-brand-cream hover:bg-brand-brown hover:text-white text-brand-brown font-bold rounded-xl text-sm transition-all border border-brand-brown/10 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Package className="w-4 h-4" />
                        Requests {stats.pending > 0 && `(${stats.pending})`}
                    </button>
                </div>
            </div>

            {/* 3 Status Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Pending */}
                <div 
                    onClick={() => navigate('/requests?filter=pending')}
                    className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-orange/15 text-brand-orange flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Package className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-brand-orange px-2.5 py-0.5 rounded-full bg-brand-orange/10">
                            Pending
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {stats.pending}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        {t('pending_requests', 'New Requests')}
                    </div>
                </div>

                {/* Approved / Active */}
                <div 
                    onClick={() => navigate('/requests?filter=accepted')}
                    className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-green/15 text-brand-green flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-brand-green px-2.5 py-0.5 rounded-full bg-brand-green/10">
                            Active
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {stats.accepted}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        {t('approved_work', 'Active Work')}
                    </div>
                </div>

                {/* Completed / Declined */}
                <div 
                    onClick={() => navigate('/requests?filter=declined')}
                    className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-brand-red/15 text-brand-red flex items-center justify-center group-hover:scale-105 transition-transform">
                            <XCircle className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-brand-red px-2.5 py-0.5 rounded-full bg-brand-red/10">
                            History
                        </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-brand-black tracking-tight mb-1">
                        {stats.declined}
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-brand-brown/70">
                        {t('denied_completed', 'Completed & History')}
                    </div>
                </div>
            </div>

            {/* Financial & Messages Hubs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Earnings */}
                <div 
                    onClick={() => navigate('/earnings')}
                    className="bg-white rounded-2xl p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-green/15 text-brand-green flex items-center justify-center group-hover:scale-105 transition-transform">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-brand-brown/60 uppercase tracking-wide">
                                Total Earnings
                            </div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-brand-black mt-0.5">
                                {formattedEarnings}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-brand-brown group-hover:text-brand-red transition-colors">
                        <span>Ledger</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>

                {/* Messages */}
                <div 
                    onClick={() => navigate('/messages')}
                    className="bg-white rounded-2xl p-6 border border-brand-brown/10 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-center justify-between"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-brand-brown/10 text-brand-brown flex items-center justify-center group-hover:scale-105 transition-transform">
                            <MessageCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-brand-brown/60 uppercase tracking-wide">
                                Messages
                            </div>
                            <div className="text-2xl sm:text-3xl font-extrabold text-brand-black mt-0.5">
                                {stats.unreadMessages} <span className="text-sm font-normal text-brand-brown/60">unread</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-brand-brown group-hover:text-brand-red transition-colors">
                        <span>Inbox</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-brand-brown/10 rounded-lg text-brand-brown">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h3 className="text-lg font-bold text-brand-black">
                            {t('upcoming_deadlines', 'Upcoming Deadlines')}
                        </h3>
                    </div>
                    {deadlines.length > 0 && (
                        <button
                            onClick={() => navigate('/requests?filter=accepted')}
                            className="text-xs font-bold text-brand-brown hover:text-brand-red flex items-center gap-1 transition-colors"
                        >
                            View All ({deadlines.length}) →
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white h-36 rounded-2xl border border-brand-brown/10"></div>
                        ))}
                    </div>
                ) : deadlines.length === 0 ? (
                    <div className="bg-white border border-brand-brown/10 rounded-2xl py-12 px-6 text-center shadow-sm">
                        <div className="w-12 h-12 bg-brand-cream text-brand-brown/40 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-bold text-brand-black mb-1">
                            {t('no_active_orders', 'No active order deadlines')}
                        </h4>
                        <p className="text-xs text-brand-brown/60 max-w-sm mx-auto">
                            {t('no_orders_subtitle', 'Accepted orders with completion dates will appear here.')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {deadlines.map(order => (
                            <DeadlineCard key={order.id} order={order} t={t} navigate={navigate} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function DeadlineCard({ order, t, navigate }) {
    const isUrgent = order.daysRemaining <= 2 && order.daysRemaining >= 0;
    const isOverdue = order.daysRemaining < 0;

    let badgeStyle = "bg-brand-green/10 text-brand-green";
    let badgeLabel = `${order.daysRemaining} days`;

    if (isOverdue) {
        badgeStyle = "bg-brand-red/10 text-brand-red";
        badgeLabel = `Overdue (${Math.abs(order.daysRemaining)}d)`;
    } else if (order.daysRemaining === 0) {
        badgeStyle = "bg-brand-orange/15 text-brand-orange";
        badgeLabel = "Due Today";
    } else if (isUrgent) {
        badgeStyle = "bg-brand-orange/15 text-brand-orange";
        badgeLabel = `${order.daysRemaining}d left`;
    }

    const earnings = Math.round((order.finalQuote?.finalVendorEarnings || 0) + (order.finalQuote?.platformFee || 0));

    return (
        <div
            onClick={() => navigate('/requests?filter=accepted')}
            className="bg-white p-5 rounded-2xl border border-brand-brown/10 hover:border-brand-brown/25 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-brown/60">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{order.deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badgeStyle}`}>
                    {badgeLabel}
                </span>
            </div>

            <div className="flex items-center gap-3 my-2">
                <div className="w-12 h-12 rounded-xl bg-brand-cream border border-brand-brown/10 overflow-hidden flex-shrink-0 flex items-center justify-center text-brand-brown/40">
                    {order.itemImage ? (
                        <img src={order.itemImage} alt="Item" className="w-full h-full object-cover" />
                    ) : (
                        <Package className="w-5 h-5 text-brand-brown/30" />
                    )}
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-brand-black truncate group-hover:text-brand-red transition-colors">
                        {order.itemName || "Item"}
                    </h4>
                    <p className="text-[11px] text-brand-brown/50 font-mono mt-0.5">
                        #{order.id.slice(0, 6)}
                    </p>
                </div>
            </div>

            <div className="pt-3 border-t border-brand-brown/5 flex items-center justify-between mt-2">
                <div>
                    <span className="text-[10px] uppercase font-bold text-brand-brown/50">
                        {t('your_earnings', 'Earnings')}
                    </span>
                    <div className="text-base font-extrabold text-brand-black">
                        ₹{earnings.toLocaleString('en-IN')}
                    </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-brand-cream group-hover:bg-brand-brown group-hover:text-white text-brand-brown flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
