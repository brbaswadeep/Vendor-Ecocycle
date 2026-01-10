import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, CheckCircle, XCircle, MessageCircle, DollarSign, Clock, Calendar, ArrowRight, TrendingUp, AlertCircle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import logo from '../assets/logo.png';

export default function Dashboard() {
    const { t } = useTranslation();
    const { currentUser, logout } = useAuth();
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
                        totalEarnings += data.finalQuote?.vendorEarnings || 0;

                        // Check for projectMeta deadline
                        if (data.projectMeta?.estimatedCompletion) {
                            activeOrders.push({
                                id: doc.id,
                                ...data
                            });
                        }
                    }
                    else if (data.status === 'declined') declined++;
                });

                setStats({
                    pending,
                    accepted,
                    declined,
                    unreadMessages: 0,
                    totalEarnings
                });

                // 2. Process Deadlines
                const now = new Date();
                const processedDeadlines = activeOrders.map(order => {
                    const deadline = order.projectMeta.estimatedCompletion.toDate ? order.projectMeta.estimatedCompletion.toDate() : new Date(order.projectMeta.estimatedCompletion);
                    const diffTime = deadline - now;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return {
                        ...order,
                        daysRemaining: diffDays,
                        deadlineDate: deadline
                    };
                });

                // Sort by urgency (ascending days remaining)
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

    return (
        <div className="min-h-screen bg-brand-cream font-sans">
            <main className="max-w-7xl mx-auto pt-10 pb-10 px-4 sm:px-6 lg:px-8">

                {/* Welcome Header */}
                <div className="mb-8 flex items-end justify-between px-2">
                    <div>
                        <h2 className="text-3xl font-bold text-brand-brown">{t('dashboard_overview')}</h2>
                        <p className="text-brand-brown/60 mt-1 font-medium">{t('dashboard_subtitle')}</p>
                    </div>
                </div>

                {/* Top Row: Status Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatusCard
                        title={t('pending_requests')}
                        count={stats.pending}
                        icon={<Package className="w-8 h-8" />}
                        gradient="from-orange-400 to-orange-600"
                        bgIcon="text-white/20"
                        onClick={() => navigate('/requests?filter=pending')}
                    />
                    <StatusCard
                        title={t('approved_work')}
                        count={stats.accepted}
                        icon={<CheckCircle className="w-8 h-8" />}
                        gradient="from-green-500 to-green-700"
                        bgIcon="text-white/20"
                        onClick={() => navigate('/requests?filter=accepted')}
                    />
                    <StatusCard
                        title={t('denied_completed')}
                        count={stats.declined}
                        icon={<XCircle className="w-8 h-8" />}
                        gradient="from-red-500 to-red-700"
                        bgIcon="text-white/20"
                        onClick={() => navigate('/requests?filter=declined')}
                    />
                </div>

                {/* Middle Row: Tools & Revenue */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <ToolCard
                        title={t('messages')}
                        subtitle={t('view_messages')}
                        count={`${stats.unreadMessages} ${t('unread_messages')}`}
                        icon={<MessageCircle className="w-6 h-6 text-brand-brown" />}
                        onClick={() => navigate('/messages')}
                    />
                    <ToolCard
                        title={t('financials')}
                        subtitle={t('view_financials')}
                        count={`₹${Math.round(stats.totalEarnings)}`}
                        icon={<TrendingUp className="w-6 h-6 text-brand-green" />}
                        onClick={() => navigate('/earnings')}
                    />
                </div>

                {/* Upcoming Deadlines Section */}
                <div className="mt-10">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="p-2 bg-brand-brown/10 rounded-lg">
                            <Clock className="w-5 h-5 text-brand-brown" />
                        </div>
                        <h3 className="text-xl font-bold text-brand-brown">{t('upcoming_deadlines')}</h3>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white h-40 rounded-3xl"></div>
                            ))}
                        </div>
                    ) : deadlines.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-brand-brown/10 rounded-3xl py-16 px-6 text-center">
                            <div className="w-20 h-20 bg-brand-cream rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-10 h-10 text-brand-brown/40" />
                            </div>
                            <h3 className="text-xl font-bold text-brand-brown mb-2">{t('no_active_orders')}</h3>
                            <p className="text-brand-brown/50 max-w-sm mx-auto">{t('no_orders_subtitle')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {deadlines.map(order => (
                                <DeadlineCard key={order.id} order={order} t={t} navigate={navigate} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function StatusCard({ title, count, icon, gradient, bgIcon, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`bg-gradient-to-br ${gradient} p-6 rounded-3xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden text-left group w-full`}
        >
            <div className={`absolute -right-4 -top-4 ${bgIcon} opacity-20 transform rotate-12 group-hover:scale-125 transition-transform duration-500`}>
                <div className="w-32 h-32">{icon}</div>
            </div>

            <div className="relative z-10 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl w-fit">
                        {icon}
                    </div>
                    <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                    </div>
                </div>

                <h3 className="text-lg font-medium opacity-90 mb-1">{title}</h3>
                <div className="text-4xl font-extrabold tracking-tight">{count}</div>
            </div>
        </button>
    );
}

function ToolCard({ title, subtitle, count, icon, onClick }) {
    return (
        <button
            onClick={onClick}
            className="bg-white p-6 rounded-3xl border border-brand-brown/5 shadow-sm hover:shadow-lg transition-all duration-300 text-left w-full group flex items-center justify-between"
        >
            <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-brand-cream rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <div>
                    <h3 className="text-xl font-bold text-brand-brown">{title}</h3>
                    <p className="text-brand-brown/50 text-sm font-medium">{subtitle}</p>
                </div>
            </div>
            <div className="text-right">
                <div className="text-2xl font-bold text-brand-brown">{count}</div>
                <div className="bg-brand-brown/5 p-2 rounded-full mt-2 inline-flex group-hover:bg-brand-brown/10 transition-colors">
                    <ChevronRight className="w-5 h-5 text-brand-brown/40 group-hover:text-brand-brown" />
                </div>
            </div>
        </button>
    );
}

function DeadlineCard({ order, t, navigate }) {
    const isUrgent = order.daysRemaining <= 2;
    const isOverdue = order.daysRemaining < 0;

    let statusColor = "bg-green-100 text-green-700";
    let statusText = `${order.daysRemaining} ${t('days_remaining')}`;
    let borderClass = "border-brand-brown/5";

    if (isOverdue) {
        statusColor = "bg-red-100 text-red-700";
        statusText = t('overdue');
        borderClass = "border-red-200 ring-2 ring-red-50";
    } else if (isUrgent) {
        statusColor = "bg-orange-100 text-orange-700";
        statusText = order.daysRemaining === 0 ? t('due_today') : `${order.daysRemaining} ${t('days_remaining')}`;
        borderClass = "border-orange-200 ring-2 ring-orange-50";
    }

    return (
        <div
            onClick={() => navigate('/requests?filter=accepted')}
            className={`bg-white p-5 rounded-3xl border ${borderClass} shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group`}
        >
            {/* Top Row: Date & Status */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-brown/50 uppercase tracking-wide">
                    <Calendar className="w-3 h-3" />
                    {order.deadlineDate.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-extrabold ${statusColor} flex items-center gap-1.5`}>
                    {(isUrgent || isOverdue) && <AlertCircle className="w-3 h-3" />}
                    {statusText}
                </div>
            </div>

            {/* Middle: Item Info */}
            <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 shadow-inner">
                    {order.itemImage ? (
                        <img src={order.itemImage} alt="Item" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Package className="w-6 h-6" />
                        </div>
                    )}
                </div>
                <div>
                    <h4 className="font-bold text-lg text-brand-brown line-clamp-1 group-hover:text-brand-orange transition-colors">
                        {order.itemName}
                    </h4>
                    <p className="text-xs text-brand-brown/60 font-medium mt-0.5">
                        ID: <span className="font-mono">{order.id.slice(0, 6)}</span>
                    </p>
                </div>
            </div>

            {/* Bottom: Earnings & Action */}
            <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-200">
                <div>
                    <div className="text-xs text-brand-brown/40 font-bold uppercase">{t('your_earnings')}</div>
                    <div className="font-bold text-xl text-brand-brown">
                        ₹{Math.round(order.finalQuote?.vendorEarnings || 0)}
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-brand-cream flex items-center justify-center group-hover:bg-brand-brown group-hover:text-white transition-all duration-300">
                    <ArrowRight className="w-5 h-5" />
                </div>
            </div>
        </div>
    );
}
