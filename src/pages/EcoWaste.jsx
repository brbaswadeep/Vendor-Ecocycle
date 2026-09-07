import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { 
    collection, query, where, onSnapshot, doc, 
    updateDoc, arrayUnion, increment, serverTimestamp 
} from 'firebase/firestore';
import { 
    Scale, Calendar, Clock, MapPin, Phone, 
    CheckCircle, AlertCircle, Plus, 
    ShieldCheck, X, Loader2, Pause, Play, Trash2
} from 'lucide-react';

const DEFAULT_RATE = 0.5; // ₹0.50 per kg

export default function EcoWaste() {
    const { currentUser, refreshProfile } = useAuth();

    const [acceptsWetWaste, setAcceptsWetWaste] = useState(false);
    const [togglingStatus, setTogglingStatus] = useState(false);
    const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'active'

    const [incomingRequests, setIncomingRequests] = useState([]);
    const [activeSubscriptions, setActiveSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for recording daily pickup
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [pickupWeight, setPickupWeight] = useState('');
    const [loggingPickup, setLoggingPickup] = useState(false);
    const [logError, setLogError] = useState('');
    const [logSuccess, setLogSuccess] = useState('');

    useEffect(() => {
        if (!currentUser) return;
        setAcceptsWetWaste(Boolean(currentUser.acceptsWetWaste));

        const unsubVendor = onSnapshot(doc(db, 'vendors', currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                setAcceptsWetWaste(Boolean(docSnap.data().acceptsWetWaste));
            }
        });

        return () => unsubVendor();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser) return;

        const pendingQ = query(
            collection(db, 'wet_waste_subscriptions'),
            where('status', '==', 'pending')
        );

        const unsubPending = onSnapshot(pendingQ, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setIncomingRequests(list);
        });

        const activeQ = query(
            collection(db, 'wet_waste_subscriptions'),
            where('acceptedBy', '==', currentUser.uid)
        );

        const unsubActive = onSnapshot(activeQ, (snapshot) => {
            const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const currentActive = list.filter(s => s.status === 'active' || s.status === 'paused');
            currentActive.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setActiveSubscriptions(currentActive);
            setLoading(false);
        });

        return () => {
            unsubPending();
            unsubActive();
        };
    }, [currentUser]);

    const handleToggleWetWasteAcceptance = async () => {
        if (!currentUser) return;
        setTogglingStatus(true);
        try {
            const newStatus = !acceptsWetWaste;
            await updateDoc(doc(db, 'vendors', currentUser.uid), {
                acceptsWetWaste: newStatus
            });
            setAcceptsWetWaste(newStatus);
            if (refreshProfile) await refreshProfile();
        } catch (err) {
            console.error("Update preference err:", err);
        } finally {
            setTogglingStatus(false);
        }
    };

    const handleAcceptSubscription = async (sub) => {
        if (!currentUser) return;
        try {
            await updateDoc(doc(db, 'wet_waste_subscriptions', sub.id), {
                status: 'active',
                acceptedBy: currentUser.uid,
                vendorName: currentUser.businessName || currentUser.contactPerson || 'Facility Partner',
                vendorPhone: currentUser.phone || '',
                acceptedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            setActiveTab('active');
        } catch (err) {
            console.error("Accept subscription err:", err);
        }
    };

    const handleToggleRoutePause = async (sub) => {
        const newStatus = sub.status === 'paused' ? 'active' : 'paused';
        try {
            await updateDoc(doc(db, 'wet_waste_subscriptions', sub.id), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error toggling pause:", err);
        }
    };

    const handleCancelRoute = async (sub) => {
        if (!window.confirm(`Are you sure you want to cancel the daily pickup route for ${sub.customerName}?`)) return;
        try {
            await updateDoc(doc(db, 'wet_waste_subscriptions', sub.id), {
                status: 'cancelled',
                cancelledBy: 'vendor',
                cancelledAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        } catch (err) {
            console.error("Error cancelling route:", err);
        }
    };

    const handleRecordPickup = async (e) => {
        e.preventDefault();
        setLogError('');
        setLogSuccess('');

        const weight = Number(pickupWeight);
        if (isNaN(weight) || weight <= 0) {
            setLogError("Enter a valid weight in kg.");
            return;
        }

        const rate = subRate(selectedSubscription);
        const payout = Number((weight * rate).toFixed(2));
        const todayStr = new Date().toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });

        setLoggingPickup(true);
        try {
            const newLogEntry = {
                date: todayStr,
                kgCollected: weight,
                amountPaid: payout,
                ratePerKg: rate,
                vendorName: currentUser.businessName || 'Facility Partner',
                loggedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'wet_waste_subscriptions', selectedSubscription.id), {
                totalKgCollected: increment(weight),
                totalEarnings: increment(payout),
                pickupCount: increment(1),
                pickupLogs: arrayUnion(newLogEntry),
                lastPickupDate: todayStr,
                updatedAt: serverTimestamp()
            });

            setLogSuccess(`Recorded ${weight} kg (+₹${payout})`);
            setPickupWeight('');
            setTimeout(() => {
                setSelectedSubscription(null);
                setLogSuccess('');
            }, 1000);
        } catch (err) {
            console.error("Log pickup err:", err);
            setLogError("Failed to record pickup.");
        } finally {
            setLoggingPickup(false);
        }
    };

    const subRate = (sub) => {
        if (!sub) return DEFAULT_RATE;
        return typeof sub.pricePerKg === 'number' ? sub.pricePerKg : DEFAULT_RATE;
    };

    const totalSourcedKg = activeSubscriptions.reduce((sum, s) => sum + (s.totalKgCollected || 0), 0);
    const totalPayouts = activeSubscriptions.reduce((sum, s) => sum + (s.totalEarnings || 0), 0);

    return (
        <div className="space-y-5 pb-10 font-sans animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-brand-brown/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <img 
                        src="/ecowaste.png" 
                        alt="EcoWaste" 
                        className="h-16 w-auto sm:h-20 object-contain flex-shrink-0"
                    />
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-brand-black">Vendor Hub</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                acceptsWetWaste 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                    : 'bg-stone-100 text-stone-600 border-stone-200'
                            }`}>
                                {acceptsWetWaste ? '● Active' : '○ Paused'}
                            </span>
                        </div>
                        <p className="text-xs text-brand-brown/70 font-medium">
                            Daily household wet waste pickup • ₹{DEFAULT_RATE.toFixed(2)}/kg payout
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleToggleWetWasteAcceptance}
                    disabled={togglingStatus}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto ${
                        acceptsWetWaste
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-brand-red hover:bg-brand-brown text-white shadow-xs'
                    }`}
                >
                    {togglingStatus ? (
                        <Loader2 size={15} className="animate-spin" />
                    ) : (
                        <>
                            <ShieldCheck size={15} />
                            <span>{acceptsWetWaste ? 'Wet Waste Enabled' : 'Enable Wet Waste'}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Inactive Notice */}
            {!acceptsWetWaste && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <AlertCircle size={16} className="text-amber-700 flex-shrink-0" />
                        <span>Wet waste collection is currently disabled. Enable to receive daily requests.</span>
                    </div>
                    <button
                        onClick={handleToggleWetWasteAcceptance}
                        className="px-3 py-1 bg-brand-brown text-white rounded-lg text-xs font-bold hover:bg-black"
                    >
                        Enable
                    </button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white rounded-xl p-3.5 border border-brand-brown/10 shadow-xs">
                    <div className="text-[10px] font-bold text-brand-brown/50 uppercase">Requests</div>
                    <div className="text-2xl font-black text-brand-orange mt-0.5">{incomingRequests.length}</div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-brand-brown/10 shadow-xs">
                    <div className="text-[10px] font-bold text-brand-brown/50 uppercase">Households</div>
                    <div className="text-2xl font-black text-brand-black mt-0.5">{activeSubscriptions.length}</div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-brand-brown/10 shadow-xs">
                    <div className="text-[10px] font-bold text-brand-brown/50 uppercase">Sourced</div>
                    <div className="text-2xl font-black text-brand-green mt-0.5">{totalSourcedKg} kg</div>
                </div>
                <div className="bg-white rounded-xl p-3.5 border border-brand-brown/10 shadow-xs">
                    <div className="text-[10px] font-bold text-brand-brown/50 uppercase">Total Paid</div>
                    <div className="text-2xl font-black text-brand-black mt-0.5">₹{totalPayouts}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-xl border border-brand-brown/10 w-fit">
                <button
                    onClick={() => setActiveTab('incoming')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                        activeTab === 'incoming'
                            ? 'bg-brand-brown text-white'
                            : 'text-brand-brown/70 hover:text-brand-brown'
                    }`}
                >
                    Incoming ({incomingRequests.length})
                </button>
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                        activeTab === 'active'
                            ? 'bg-brand-brown text-white'
                            : 'text-brand-brown/70 hover:text-brand-brown'
                    }`}
                >
                    Active Routes ({activeSubscriptions.length})
                </button>
            </div>

            {/* Tab 1: Incoming */}
            {activeTab === 'incoming' && (
                <div>
                    {incomingRequests.length === 0 ? (
                        <div className="bg-white border border-brand-brown/10 rounded-2xl p-10 text-center shadow-xs text-brand-brown/50 text-xs">
                            <Scale size={28} className="mx-auto text-brand-brown/30 mb-2" />
                            <div className="font-bold text-brand-black">No pending requests</div>
                            <div>New household pickup requests will appear here.</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {incomingRequests.map((sub) => (
                                <div key={sub.id} className="bg-white p-4 rounded-xl border border-brand-brown/10 shadow-xs flex flex-col justify-between gap-3">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-sm text-brand-black">{sub.customerName}</span>
                                            <span className="text-xs font-black text-brand-green">
                                                ₹{subRate(sub).toFixed(2)}/kg
                                            </span>
                                        </div>

                                        <div className="text-xs text-brand-brown/70 flex items-center gap-1.5">
                                            <MapPin size={13} className="text-brand-brown/40 flex-shrink-0" />
                                            <span className="truncate">{sub.address}</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-brown/70">
                                            <span className="bg-brand-cream/50 px-2 py-0.5 rounded border border-brand-brown/10">
                                                {sub.preferredSlot}
                                            </span>
                                            <span className="bg-brand-cream/50 px-2 py-0.5 rounded border border-brand-brown/10">
                                                Min {sub.thresholdKg || 2} kg
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleAcceptSubscription(sub)}
                                        className="w-full py-2.5 bg-brand-red hover:bg-brand-brown text-white font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center justify-center gap-1.5"
                                    >
                                        <CheckCircle size={14} />
                                        <span>Accept Route</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Active */}
            {activeTab === 'active' && (
                <div>
                    {activeSubscriptions.length === 0 ? (
                        <div className="bg-white border border-brand-brown/10 rounded-2xl p-10 text-center shadow-xs text-brand-brown/50 text-xs">
                            <CheckCircle size={28} className="mx-auto text-brand-brown/30 mb-2" />
                            <div className="font-bold text-brand-black">No active routes</div>
                            <div>Accept requests from the Incoming tab to begin.</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {activeSubscriptions.map((sub) => (
                                <div key={sub.id} className="bg-white p-4 rounded-xl border border-brand-brown/10 shadow-xs flex flex-col justify-between gap-3">
                                    <div className="space-y-2.5">
                                        {/* Card Header with Status & Pause/Cancel Controls */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-sm text-brand-black">{sub.customerName}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                                    sub.status === 'active' 
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                                }`}>
                                                    {sub.status === 'active' ? '● Active' : '❚❚ Paused'}
                                                </span>
                                            </div>

                                            {/* Vendor Pause and Cancel Actions */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleToggleRoutePause(sub)}
                                                    title={sub.status === 'active' ? 'Pause Route' : 'Resume Route'}
                                                    className="px-2 py-1 rounded-lg border border-brand-brown/15 bg-brand-cream/40 text-brand-brown hover:bg-brand-brown hover:text-white transition-colors text-[11px] font-bold flex items-center gap-1"
                                                >
                                                    {sub.status === 'active' ? <Pause size={11} /> : <Play size={11} />}
                                                    <span>{sub.status === 'active' ? 'Pause' : 'Resume'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleCancelRoute(sub)}
                                                    title="Cancel Route Anytime"
                                                    className="px-2 py-1 rounded-lg border border-red-200 bg-red-50 text-brand-red hover:bg-brand-red hover:text-white transition-colors text-[11px] font-bold flex items-center gap-1"
                                                >
                                                    <Trash2 size={11} />
                                                    <span>Cancel</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-xs text-brand-brown/70 flex items-center gap-1.5">
                                            <MapPin size={13} className="text-brand-brown/40 flex-shrink-0" />
                                            <span className="truncate">{sub.address}</span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs text-brand-brown/70">
                                            <span className="flex items-center gap-1">
                                                <Phone size={13} className="text-brand-brown/40 flex-shrink-0" />
                                                <span>{sub.phone}</span>
                                            </span>
                                            <span className="text-[11px] font-bold text-brand-brown/60">
                                                Slot: {sub.preferredSlot?.split(' ')[0]} (Min {sub.thresholdKg || 2} kg)
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1.5 text-center text-xs bg-brand-cream/30 p-2 rounded-lg border border-brand-brown/10">
                                            <div>
                                                <span className="text-[9px] text-brand-brown/50 uppercase font-bold block">Pickups</span>
                                                <span className="font-bold">{sub.pickupCount || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-brand-brown/50 uppercase font-bold block">Total kg</span>
                                                <span className="font-bold text-brand-green">{sub.totalKgCollected || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-brand-brown/50 uppercase font-bold block">Total Paid</span>
                                                <span className="font-bold">₹{sub.totalEarnings || 0}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setSelectedSubscription(sub);
                                            setLogError('');
                                            setLogSuccess('');
                                        }}
                                        disabled={sub.status === 'paused'}
                                        className="w-full py-2.5 bg-brand-brown hover:bg-brand-black text-white font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                                    >
                                        <Scale size={14} />
                                        <span>{sub.status === 'paused' ? 'Route Paused' : 'Log Pickup Weight'}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            {selectedSubscription && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-brand-brown/15 shadow-xl space-y-4 relative">
                        <div className="flex items-center justify-between pb-2 border-b border-brand-brown/10">
                            <div className="flex items-center gap-2">
                                <Scale size={18} className="text-brand-brown" />
                                <h3 className="font-bold text-sm text-brand-black">Log Pickup Weight</h3>
                            </div>
                            <button
                                onClick={() => setSelectedSubscription(null)}
                                className="text-brand-brown/40 hover:text-brand-brown"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="text-xs bg-brand-cream/30 p-2.5 rounded-lg border border-brand-brown/10 space-y-0.5">
                            <div className="font-bold text-brand-black">{selectedSubscription.customerName}</div>
                            <div className="text-brand-brown/70 truncate">{selectedSubscription.address}</div>
                            <div className="text-[11px] text-brand-brown/60">
                                Threshold: {selectedSubscription.thresholdKg || 2} kg • Rate: ₹{subRate(selectedSubscription).toFixed(2)}/kg
                            </div>
                        </div>

                        {logError && (
                            <div className="p-2 rounded-lg bg-red-50 text-red-800 text-xs font-semibold">
                                {logError}
                            </div>
                        )}
                        {logSuccess && (
                            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold">
                                {logSuccess}
                            </div>
                        )}

                        <form onSubmit={handleRecordPickup} className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-brand-black uppercase tracking-wider mb-1">
                                    Measured Weight (kg)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0.1"
                                        required
                                        autoFocus
                                        value={pickupWeight}
                                        onChange={(e) => setPickupWeight(e.target.value)}
                                        placeholder="2.0"
                                        className="w-full px-3 py-2.5 bg-brand-cream/20 border border-brand-brown/15 rounded-xl text-brand-black text-sm font-bold focus:outline-none focus:border-brand-red"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-brown/50">
                                        kg
                                    </span>
                                </div>
                            </div>

                            {Number(pickupWeight) > 0 && (
                                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs font-bold">
                                    <span className="text-emerald-900">Payout Credit:</span>
                                    <span className="text-sm font-black text-emerald-800">
                                        ₹{(Number(pickupWeight) * subRate(selectedSubscription)).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setSelectedSubscription(null)}
                                    className="flex-1 py-2.5 bg-brand-cream border border-brand-brown/15 text-brand-brown font-bold text-xs rounded-xl hover:bg-brand-brown/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loggingPickup}
                                    className="flex-1 py-2.5 bg-brand-red hover:bg-brand-brown text-white font-bold text-xs rounded-xl transition-colors shadow-xs disabled:opacity-60 flex items-center justify-center gap-1"
                                >
                                    {loggingPickup ? <Loader2 size={14} className="animate-spin" /> : <span>Confirm</span>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
