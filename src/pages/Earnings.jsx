import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Loader2, DollarSign, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Earnings() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        totalCommissionOwed: 0,
        pendingCommission: 0,
        paidCommission: 0
    });

    useEffect(() => {
        if (currentUser) fetchEarnings();
    }, [currentUser]);

    const fetchEarnings = async () => {
        try {
            // Fetch accepted/completed orders
            const q = query(
                collection(db, 'requests'),
                where('acceptedBy', '==', currentUser.uid),
                // We should ideally filter by status, but for earnings, we include all accepted
                // orderBy('createdAt', 'desc') // Requires index
            );

            const querySnapshot = await getDocs(q);
            const fetchedOrders = [];
            let totalEarn = 0;
            let totalComm = 0;

            querySnapshot.forEach(doc => {
                const data = doc.data();
                // Only consider valid accepted/completed orders with quotes
                if (data.status === 'accepted' || data.status === 'completed') {
                    fetchedOrders.push({ id: doc.id, ...data });

                    const earnings = data.finalQuote?.vendorEarnings || 0;
                    const comm = data.finalQuote?.platformFee || 0;

                    totalEarn += earnings;
                    totalComm += comm;
                }
            });

            // Sort manually if index missing
            fetchedOrders.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

            setOrders(fetchedOrders);
            setStats({
                totalEarnings: totalEarn,
                totalCommissionOwed: totalComm,
                pendingCommission: totalComm, // Assuming all unseen is pending for now
                paidCommission: 0 // Placeholder logic for now
            });
        } catch (error) {
            console.error("Error fetching earnings:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-brown" /></div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-3xl font-extrabold text-brand-brown">{t('financial_overview')}</h1>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-brown/10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className="text-brand-brown/60 font-bold text-sm uppercase">{t('total_earnings_stat')}</span>
                    </div>
                    <div className="text-3xl font-extrabold text-brand-brown">₹{Math.round(stats.totalEarnings)}</div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-brown/10 ring-2 ring-red-500/10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-red-100 text-red-700 rounded-xl">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <span className="text-brand-brown/60 font-bold text-sm uppercase">{t('commission_owed')}</span>
                    </div>
                    <div className="text-3xl font-extrabold text-red-600">₹{Math.round(stats.totalCommissionOwed)}</div>
                    <p className="text-xs text-red-400 mt-1 font-medium">{t('to_be_paid_platform')}</p>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-brand-brown/10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-brand-cream text-brand-brown rounded-xl">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-brand-brown/60 font-bold text-sm uppercase">{t('orders_processed')}</span>
                    </div>
                    <div className="text-3xl font-extrabold text-brand-brown">{orders.length}</div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-brand-brown/10 overflow-hidden">
                <div className="p-6 border-b border-brand-brown/5">
                    <h2 className="text-xl font-bold text-brand-brown">{t('commission_breakdown')}</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-brand-cream/30 text-xs uppercase text-brand-brown/60 font-bold">
                            <tr>
                                <th className="px-6 py-4">{t('date')}</th>
                                <th className="px-6 py-4">{t('request_id')}</th>
                                <th className="px-6 py-4">{t('order_value')}</th>
                                <th className="px-6 py-4">{t('your_share')}</th>
                                <th className="px-6 py-4 text-right">{t('commission_table')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-brown/5">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-brand-cream/10 transition-colors">
                                    <td className="px-6 py-4 font-medium text-brand-brown">
                                        {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-brand-brown/70 font-mono">
                                        {order.id.slice(0, 8)}...
                                    </td>
                                    <td className="px-6 py-4 font-bold text-brand-brown">
                                        ₹{Math.round(order.finalQuote?.totalCustomerPrice || 0)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-green-600">
                                        ₹{Math.round(order.finalQuote?.vendorEarnings || 0)}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-red-500 text-right">
                                        ₹{Math.round(order.finalQuote?.platformFee || 0)}
                                    </td>
                                </tr>
                            ))}
                            {orders.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-brand-brown/40 font-medium">
                                        {t('no_financial_data')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
