import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy, getDoc } from 'firebase/firestore';
import { Loader2, MapPin, CheckCircle, XCircle, Clock, Package, Calendar, Truck, PlayCircle, Hourglass, CheckSquare, User, Phone, MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import ChatModal from '../components/ChatModal';
import { useTranslation } from 'react-i18next';

// Keys for translation
const TRACKING_STAGES = [
    { id: 'accepted', labelKey: 'order_active', icon: CheckCircle },
    { id: 'arrived', labelKey: 'tracking_arrived', icon: Truck },
    { id: 'initiated', labelKey: 'tracking_initiated', icon: PlayCircle },
    { id: 'processing', labelKey: 'tracking_processing', icon: Hourglass },
    { id: 'finishing', labelKey: 'tracking_finishing', icon: Clock },
    { id: 'completed', labelKey: 'stat_completed', icon: CheckSquare }
];

export default function Requests() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();
    const location = useLocation();

    // Core Data
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter State
    const [filter, setFilter] = useState('pending'); // pending | accepted | declined

    // Modal States
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [customerDetails, setCustomerDetails] = useState(null); // Local customer details state
    const [showChat, setShowChat] = useState(false);
    const [isAccepting, setIsAccepting] = useState(false); // To show acceptance popup

    // Acceptance Form State
    const [discount, setDiscount] = useState(0);
    const [estimatedDate, setEstimatedDate] = useState('');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const filterParam = queryParams.get('filter');
        if (filterParam) setFilter(filterParam);
    }, [location]);

    useEffect(() => {
        if (currentUser) {
            fetchRequests();
        }
    }, [currentUser, filter]); // Re-fetch or re-filter when filter changes

    // Fetch Customer Details when request is selected
    useEffect(() => {
        const fetchCustomer = async () => {
            if (selectedRequest?.userId) {
                try {
                    const userSnap = await getDoc(doc(db, 'customers', selectedRequest.userId));
                    if (userSnap.exists()) {
                        setCustomerDetails(userSnap.data());
                    } else {
                        setCustomerDetails(null);
                    }
                } catch (err) {
                    console.error("Error fetching customer:", err);
                }
            } else {
                setCustomerDetails(null);
            }
        };
        fetchCustomer();
    }, [selectedRequest]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, "requests"),
                where("vendorIds", "array-contains", currentUser.uid)
            );

            const querySnapshot = await getDocs(q);
            const loadedRequests = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Filter Logic:
                // 1. Pending: status === 'pending'
                // 2. Accepted: status === 'accepted' AND acceptedBy === currentUser.uid
                // 3. Declined: status === 'declined' (simplified) OR (future: vendor specific decline)

                if (filter === 'pending' && data.status === 'pending') {
                    loadedRequests.push({ id: doc.id, ...data });
                } else if (filter === 'accepted' && data.status === 'accepted' && data.acceptedBy === currentUser.uid) {
                    loadedRequests.push({ id: doc.id, ...data });
                } else if (filter === 'declined' && data.status === 'declined') {
                    loadedRequests.push({ id: doc.id, ...data });
                }
            });

            // Sort by date
            loadedRequests.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            setRequests(loadedRequests);
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId, newStatus) => {
        try {
            await updateDoc(doc(db, "requests", requestId), {
                status: newStatus,
                acceptedBy: newStatus === 'accepted' ? currentUser.uid : null
            });
            // Update local state
            setRequests(prev => prev.map(req =>
                req.id === requestId ? { ...req, status: newStatus } : req
            ));
        } catch (error) {
            console.error("Error updating request:", error);
        }
    };





    // Reset discount when opening a new request
    useEffect(() => {
        if (selectedRequest) {
            setDiscount(0);
        }
    }, [selectedRequest]);

    const calculateFinalCosts = (request) => {
        if (!request?.itemDetails?.conversionDetails?.cost_breakdown) return null;

        const originalBaseMfg = Math.round(request.itemDetails.conversionDetails.cost_breakdown.base_manufacturing_cost);

        // 1. Calculate Discount (Max 10% on Mfg Price)
        const discountAmount = Math.round(originalBaseMfg * (discount / 100));
        const discountedMfgPrice = originalBaseMfg - discountAmount;

        // 2. Calculate Commission on DISCOUNTED Price based on Rating
        // Default: 2.0%
        // Rating >= 4.0: 1.5%
        // Rating >= 4.5: 1.0%
        let commissionRate = 0.02;
        const rating = parseFloat(currentUser.rating || 0);
        if (rating >= 4.5) commissionRate = 0.01;
        else if (rating >= 4.0) commissionRate = 0.015;

        const commission = Math.round(discountedMfgPrice * commissionRate);

        // 3. Logistics (Direct pass-through or 0)
        let logistics = 0;
        if (request.itemDetails.conversionDetails.includeLogistics) {
            logistics = Math.round(request.itemDetails.conversionDetails.cost_breakdown.logistics_cost);
        }

        // 4. Final Totals
        // Customer Pays: Discounted Mfg + Commission + Logistics
        const finalCustomerTotal = discountedMfgPrice + commission + logistics;

        // Vendor Earns: Discounted Mfg (plus logistics if they handle it, usually logistics goes to platform then back, but let's assume Vendor gets Mfg + Logistics for simplicity logic or just Mfg)
        // Usually Vendor gets (Mfg + Logistics). Commission goes to Platform.
        const finalVendorEarnings = discountedMfgPrice;

        return {
            originalBaseMfg,
            discountAmount,
            discountedMfgPrice,
            commission,
            commissionRate,
            logistics,
            finalVendorEarnings,
            finalCustomerTotal
        };

        return {
            originalBaseMfg,
            discountAmount,
            discountedMfgPrice,
            commission,
            logistics,
            finalVendorEarnings,
            finalCustomerTotal
        };
    };

    // Triggered when clicking "Accept" in the Details Modal
    const initiateAccept = () => {
        setIsAccepting(true);
    };

    // Finalize Acceptance with Date & Discount
    const confirmAcceptance = async () => {
        if (!selectedRequest || !estimatedDate) {
            alert(t('alert_select_date'));
            return;
        }

        const costs = calculateFinalCosts(selectedRequest);

        try {
            await updateDoc(doc(db, "requests", selectedRequest.id), {
                status: 'accepted',
                acceptedBy: currentUser.uid,
                finalQuote: {
                    originalBasePrice: costs.originalBaseMfg,
                    discountAppliedPercent: discount,
                    discountAmount: costs.discountAmount,
                    finalVendorEarnings: costs.finalVendorEarnings,
                    platformFee: costs.commission,
                    logisticsCost: costs.logistics,
                    totalCustomerPrice: costs.finalCustomerTotal
                },
                projectMeta: {
                    estimatedCompletion: new Date(estimatedDate),
                    trackingStage: 'accepted', // Initial stage changed to 'accepted' as per user
                    trackingHistory: [
                        { stage: 'accepted', timestamp: new Date(), label: 'Order Accepted' }
                    ]
                }
            });

            // Refresh functionality (simple way: clear list or re-fetch)
            setRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
            setIsAccepting(false);
            setSelectedRequest(null);
            setDiscount(0);
            setEstimatedDate('');
        } catch (error) {
            console.error("Error accepting request:", error);
        }
    };

    const handleUpdateTracking = async (stageId, label) => {
        if (!selectedRequest) return;
        try {
            // If marking as completed, verify first
            if (stageId === 'completed' && !window.confirm(t('confirm_mark_complete'))) return;

            await updateDoc(doc(db, "requests", selectedRequest.id), {
                'projectMeta.trackingStage': stageId,
                'projectMeta.trackingHistory': [
                    ...(selectedRequest.projectMeta?.trackingHistory || []),
                    { stage: stageId, timestamp: new Date(), label }
                ],
            });

            // Update local state deeply
            setSelectedRequest(prev => ({
                ...prev,
                projectMeta: {
                    ...prev.projectMeta,
                    trackingStage: stageId
                }
            }));
            setRequests(prev => prev.map(req =>
                req.id === selectedRequest.id ? {
                    ...req,
                    projectMeta: { ...req.projectMeta, trackingStage: stageId }
                } : req
            ));

        } catch (error) {
            console.error("Error updating tracking:", error);
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return t('filter_pending');
            case 'accepted': return t('filter_approved');
            case 'declined': return t('filter_declined');
            default: return status;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-brand-brown">{t('incoming_requests')}</h1>

                {/* Filter Tabs */}
                <div className="flex gap-2 bg-white/50 p-1 rounded-xl border border-brand-brown/10">
                    {['pending', 'accepted', 'declined'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${filter === f
                                ? 'bg-brand-brown text-white shadow-md'
                                : 'text-brand-brown/60 hover:bg-brand-brown/5'
                                }`}
                        >
                            {f === 'accepted' ? t('filter_approved') : f === 'pending' ? t('filter_pending') : t('filter_declined')}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-brand-orange animate-spin" />
                </div>
            ) : requests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-brand-brown/10">
                    <Package className="w-16 h-16 text-brand-brown/20 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-brand-brown">{t('no_requests_yet')}</h3>
                    <p className="text-brand-brown/60">{t('nearby_requests_hint')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {requests.map(request => (
                        <div key={request.id} className="bg-white rounded-2xl p-6 shadow-sm border border-brand-brown/10 hover:shadow-md transition-shadow">

                            {/* Header / Status */}
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${request.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    request.status === 'accepted' ? 'bg-green-100 text-green-700' :
                                        'bg-red-100 text-red-700'
                                    }`}>
                                    {getStatusLabel(request.status)}
                                </span>
                                <div className="text-xs text-brand-brown/40 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {request.createdAt?.toDate ? request.createdAt.toDate().toLocaleDateString() : t('just_now')}
                                </div>
                            </div>

                            {/* Item Info */}
                            <div className="flex gap-4 mb-4">
                                {request.itemImage && (
                                    <img src={request.itemImage} alt="Item" className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
                                )}
                                <div>
                                    <h3 className="font-bold text-brand-brown line-clamp-1">{request.itemName}</h3>
                                    <div className="text-xs text-brand-brown/60">{request.itemDetails?.material || t('material_unknown')}</div>
                                    {request.itemDetails?.goal && (
                                        <div className="mt-1 text-xs font-bold text-brand-orange bg-brand-orange/5 px-2 py-1 rounded-md inline-block">
                                            {request.itemDetails.goal}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Budget/Cost Section */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                    <div className="text-xs font-bold text-green-700 uppercase">{t('you_earn')}</div>
                                    <div className="font-bold text-2xl text-green-800">
                                        ₹{Math.round(request.itemDetails.conversionDetails?.cost_breakdown?.base_manufacturing_cost || 0)}
                                    </div>
                                    <div className="text-[10px] text-green-600 mt-1">{t('excludes_fees')}</div>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <div className="text-xs font-bold text-gray-500 uppercase">{t('logistics_status')}</div>
                                    <div className="font-bold text-brand-brown">
                                        {request.itemDetails.conversionDetails?.includeLogistics ? t('vendor_managed') : t('customer_managed')}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        {request.itemDetails.conversionDetails?.includeLogistics ? t('extra_payout') : t('no_delivery')}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 space-y-3">
                                <button
                                    onClick={() => setSelectedRequest(request)}
                                    className="w-full py-2 bg-brand-brown/5 text-brand-brown rounded-lg font-bold text-sm hover:bg-brand-brown/10 transition-colors"
                                >
                                    {t('view_full')}
                                </button>

                                {request.status === 'pending' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => handleAction(request.id, 'declined')}
                                            className="py-2 border border-brand-brown/20 rounded-lg text-brand-brown hover:bg-red-50 hover:text-red-600 hover:border-red-200 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            {t('decline')}
                                        </button>
                                        <button
                                            onClick={() => setSelectedRequest(request)}
                                            className="py-2 bg-brand-brown text-white rounded-lg hover:bg-brand-green transition-colors font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-brown/20 hover:shadow-brand-green/20"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            {t('accept')}
                                        </button>
                                    </div>
                                )}

                                {request.status === 'accepted' && (
                                    <div className="p-3 bg-green-50 text-green-800 rounded-lg text-sm text-center font-bold">
                                        {t('accepted_panel')}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Detailed Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-brand-brown">{t('project_details')}</h2>
                                    <p className="text-brand-brown/60">{t('request_id')}: {selectedRequest.id.slice(0, 8)}...</p>
                                </div>
                                <button
                                    onClick={() => setSelectedRequest(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <XCircle className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-6">

                                {/* Customer Details Section */}
                                {customerDetails && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center gap-4">
                                        <div className="w-12 h-12 bg-brand-brown/10 rounded-full flex items-center justify-center">
                                            <User className="w-6 h-6 text-brand-brown" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-brand-brown">{customerDetails.name || 'Customer'}</h3>
                                            <div className="flex items-center gap-2 text-xs text-brand-brown/60">
                                                <Phone className="w-3 h-3" /> {customerDetails.mobile || t('no_phone')}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-brand-brown/60 mt-1">
                                                <MapPin className="w-3 h-3" /> {customerDetails.address || t('no_address')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setShowChat(true)}
                                            className="ml-auto px-4 py-2 bg-brand-brown text-white text-sm font-bold rounded-lg hover:bg-brand-brown/90 flex items-center gap-2"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            {t('chat')}
                                        </button>
                                    </div>
                                )}

                                {/* Use Case */}
                                <div className="bg-brand-brown/5 p-4 rounded-xl border border-brand-brown/10">
                                    <div className="text-xs font-bold text-brand-brown/60 uppercase mb-2">{t('daily_use_case')}</div>
                                    <p className="text-brand-brown italic">"{selectedRequest.itemDetails.conversionDetails?.daily_use_case}"</p>
                                </div>

                                {/* Analysis Factors */}
                                {selectedRequest.itemDetails.conversionDetails?.analysis_factors && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="border p-3 rounded-xl text-center bg-gray-50">
                                            <div className="text-xs font-bold text-gray-400 uppercase">{t('yield')}</div>
                                            <div className="text-lg font-bold text-brand-brown">{selectedRequest.itemDetails.conversionDetails.analysis_factors.yield_factor}</div>
                                        </div>
                                        <div className="border p-3 rounded-xl text-center bg-gray-50">
                                            <div className="text-xs font-bold text-gray-400 uppercase">{t('quality')}</div>
                                            <div className="text-lg font-bold text-brand-brown">{selectedRequest.itemDetails.conversionDetails.analysis_factors.quality_grade}</div>
                                        </div>
                                        <div className="border p-3 rounded-xl text-center bg-gray-50">
                                            <div className="text-xs font-bold text-gray-400 uppercase">{t('weight')}</div>
                                            <div className="text-lg font-bold text-brand-brown">{selectedRequest.itemDetails.conversionDetails.analysis_factors.usable_weight_kg} kg</div>
                                        </div>
                                    </div>
                                )}

                                {/* Material Lists */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                        <div className="text-xs font-bold text-orange-700 uppercase mb-3">{t('cust_provides')}</div>
                                        <ul className="space-y-2">
                                            {selectedRequest.itemDetails.conversionDetails?.materials_needed?.customer_can_provide?.map((m, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-brand-brown">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                                    {m}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                        <div className="text-xs font-bold text-green-700 uppercase mb-3">{t('you_provide')}</div>
                                        <ul className="space-y-2">
                                            {selectedRequest.itemDetails.conversionDetails?.materials_needed?.vendor_can_provide?.map((m, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-brand-brown">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                                                    {m}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {/* Processing Instructions */}
                                <div>
                                    <div className="text-xs font-bold text-brand-brown/60 uppercase mb-2">{t('processing_steps')}</div>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm text-brand-brown leading-relaxed">
                                        {selectedRequest.itemDetails.conversionDetails?.required_processing}
                                    </div>
                                </div>

                                {/* Financial Summary */}
                                <div className="border-t pt-6">
                                    <h3 className="font-bold text-brand-brown mb-4">{t('payout_analysis')}</h3>

                                    <div className="bg-brand-brown text-white p-6 rounded-2xl shadow-xl mt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="opacity-80">{t('est_earnings')}</span>
                                            <span className="font-bold text-2xl text-green-400">
                                                ₹{Math.round(selectedRequest.itemDetails.conversionDetails?.cost_breakdown?.base_manufacturing_cost || 0)}
                                            </span>
                                        </div>
                                        <div className="text-xs opacity-50 mb-4 text-right">
                                            {t('before_tracking')}
                                        </div>

                                        {selectedRequest.status === 'pending' ? (
                                            <button
                                                onClick={initiateAccept}
                                                className="w-full py-3 bg-white text-brand-brown rounded-xl font-bold hover:bg-brand-green hover:text-white transition-all shadow-lg"
                                            >
                                                {t('review_accept')}
                                            </button>
                                        ) : selectedRequest.status === 'accepted' ? (
                                            <div className="space-y-4">
                                                <div className="text-center bg-white/10 py-2 rounded-lg font-bold">
                                                    {t('order_active')}
                                                </div>

                                                {/* Tracking Controls */}
                                                <div className="bg-white/10 p-4 rounded-xl">
                                                    <div className="text-xs font-bold uppercase opacity-60 mb-3">{t('update_tracking')}</div>
                                                    <div className="space-y-2">
                                                        {TRACKING_STAGES.map((stage, idx) => {
                                                            const isPast = TRACKING_STAGES.findIndex(s => s.id === selectedRequest.projectMeta?.trackingStage) >= idx;
                                                            const isCurrent = selectedRequest.projectMeta?.trackingStage === stage.id;

                                                            return (
                                                                <button
                                                                    key={stage.id}
                                                                    onClick={() => handleUpdateTracking(stage.id, stage.label)}
                                                                    className={`w-full flex items-center gap-3 p-2 rounded-lg text-sm transition-all ${isCurrent ? 'bg-green-500 text-white font-bold' :
                                                                        isPast ? 'bg-green-500/30 text-white/50' : 'bg-white/5 hover:bg-white/10 text-white'
                                                                        }`}
                                                                >
                                                                    <stage.icon className="w-4 h-4" />
                                                                    {t(stage.labelKey)}
                                                                    {isCurrent && <span className="ml-auto text-[10px] bg-white/20 px-2 rounded">{t('current')}</span>}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center bg-white/10 py-2 rounded-lg font-bold">
                                                Request {getStatusLabel(selectedRequest.status)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex justify-end">
                            <button
                                onClick={() => {
                                    setSelectedRequest(null);
                                    setIsAccepting(false);
                                }}
                                className="px-6 py-2 bg-white border border-gray-300 rounded-xl font-bold text-brand-brown hover:bg-gray-50 transition-colors"
                            >
                                {t('close_details')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Acceptance Confirmation Popup */}
            {isAccepting && selectedRequest && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
                    <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-brand-brown mb-2">{t('confirm_acceptance')}</h2>
                        <p className="text-brand-brown/60 text-sm mb-6">{t('confirm_subtitle')}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-brand-brown uppercase mb-1">{t('est_completion')}</label>
                                <input
                                    type="date"
                                    value={estimatedDate}
                                    onChange={(e) => setEstimatedDate(e.target.value)}
                                    className="w-full bg-brand-brown/5 border-none rounded-xl p-3 text-brand-brown font-bold focus:ring-2 focus:ring-brand-brown/20"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-brand-brown uppercase mb-1">{t('offer_discount')}</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        value={discount}
                                        onChange={(e) => setDiscount(Math.min(10, Math.max(0, parseInt(e.target.value) || 0)))}
                                        className="w-20 bg-brand-brown/5 border-none rounded-xl p-3 text-brand-brown font-bold focus:ring-2 focus:ring-brand-brown/20 text-center"
                                    />
                                    <span className="text-sm font-bold text-brand-brown">%</span>
                                    <span className="text-xs text-brand-brown/40 ml-2">({t('applied_mfg')})</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                            <div className="flex justify-between text-sm text-brand-brown/60">
                                <span>{t('base_mfg')}:</span>
                                <span>₹{Math.round(selectedRequest.itemDetails.conversionDetails?.cost_breakdown?.base_manufacturing_cost || 0)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between text-sm text-red-500">
                                    <span>{t('discount')} ({discount}%):</span>
                                    <span>-₹{Math.round((selectedRequest.itemDetails.conversionDetails?.cost_breakdown?.base_manufacturing_cost || 0) * (discount / 100))}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-brand-brown pt-2 border-t border-dashed border-gray-300">
                                <span>{t('your_earnings')}:</span>
                                <span>₹{Math.round((selectedRequest.itemDetails.conversionDetails?.cost_breakdown?.base_manufacturing_cost || 0) * (1 - discount / 100))}</span>
                            </div>
                            {selectedRequest.itemDetails.conversionDetails?.includeLogistics && (
                                <div className="flex justify-between text-xs text-brand-brown/40 pt-1">
                                    <span>{t('logistics_payout')}:</span>
                                    <span>+₹{selectedRequest.itemDetails.conversionDetails.cost_breakdown.logistics_cost}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs text-brand-brown/40 pt-1">
                                <span>{t('platform_comm')} (5%):</span>
                                <span>+₹{Math.round(((selectedRequest.itemDetails.conversionDetails?.cost_breakdown?.base_manufacturing_cost || 0) * (1 - discount / 100)) * 0.05)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-lg text-brand-green pt-2 mt-1 border-t border-gray-200">
                                <span>{t('cust_pays')}:</span>
                                <span>₹{calculateFinalCustomerPrice()}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <button
                                onClick={() => setIsAccepting(false)}
                                className="py-3 text-brand-brown font-bold hover:bg-brand-brown/5 rounded-xl transition-colors"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleConfirmAccept}
                                disabled={!estimatedDate}
                                className="py-3 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Modal */}
            {selectedRequest && selectedRequest.userId && showChat && (
                <ChatModal
                    open={showChat}
                    onClose={() => setShowChat(false)}
                    orderId={selectedRequest.id}
                    currentUserId={currentUser.uid}
                    recipientName={customerDetails?.name || 'Customer'}
                    receiverId={selectedRequest.userId}
                />
            )}
        </div>
    );
}
