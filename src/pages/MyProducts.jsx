import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { Plus, Package, Truck, Tag, DollarSign, Image as ImageIcon, Loader2, CheckCircle, Info, Recycle, User, Trash2, History, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MyProducts() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();

    // UI State
    const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders' | 'previous'
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [editingId, setEditingId] = useState(null); // Track which product is being edited
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data State
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [inventory, setInventory] = useState([]);

    // Shipping Modal State
    const [showShippingModal, setShowShippingModal] = useState(false);
    const [selectedOrderForShipping, setSelectedOrderForShipping] = useState(null);
    const [trackingData, setTrackingData] = useState({ deliveryPartner: '', trackingId: '' });

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        quantity: 1,
        category: 'General',
        description: '',
        type: 'new', // 'new' | 'recycled'
        sourceType: 'inventory', // 'inventory' | 'ingredient'
        sourceInventoryId: '', // if type is recycled
        image: null, // primary image
        images: [] // array of all product images
    });

    const CATEGORIES = ["General", "Gardening", "Kitchen", "Accessories", "Outdoor", "Decor", "Furniture"];

    // Fetch Products & Inventory & Orders
    useEffect(() => {
        if (!currentUser) return;
        fetchData();
    }, [currentUser]);

    const fetchData = async () => {
        try {
            // 1. Fetch My Products
            const prodQuery = query(
                collection(db, "products"),
                where("vendorId", "==", currentUser.uid)
            );
            const prodSnap = await getDocs(prodQuery);
            const productsData = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            productsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setProducts(productsData);

            // 2. Fetch My Inventory (Bought Items)
            const invQuery = query(
                collection(db, "requests"),
                where("vendorIds", "array-contains", currentUser.uid),
                where("status", "==", "accepted")
            );
            const invSnap = await getDocs(invQuery);
            const invItems = [];
            invSnap.forEach(doc => {
                const data = doc.data();
                if (data.acceptedBy === currentUser.uid &&
                    data.itemDetails?.requestType === 'sell' &&
                    data.inventoryStatus !== 'sold') {
                    invItems.push({ id: doc.id, ...data });
                }
            });
            setInventory(invItems);

            // 3. Fetch Orders (New)
            const orderQuery = query(
                collection(db, "orders"),
                where("vendorId", "==", currentUser.uid)
            );
            const orderSnap = await getDocs(orderQuery);
            const ordersData = orderSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            ordersData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setOrders(ordersData);

            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    // Multiple Images Handler
    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        files.forEach(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`File ${file.name} is larger than 5MB and was skipped.`);
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => {
                    const currentImages = prev.images || [];
                    const updatedImages = [...currentImages, reader.result];
                    return {
                        ...prev,
                        images: updatedImages,
                        image: prev.image || reader.result
                    };
                });
            };
            reader.readAsDataURL(file);
        });
        e.target.value = '';
    };

    const handleRemoveImage = (index) => {
        setFormData(prev => {
            const updatedImages = (prev.images || []).filter((_, i) => i !== index);
            return {
                ...prev,
                images: updatedImages,
                image: updatedImages[0] || null
            };
        });
    };

    const handleSetPrimaryImage = (index) => {
        setFormData(prev => {
            const list = prev.images || [];
            if (!list[index]) return prev;
            const chosen = list[index];
            const remaining = list.filter((_, i) => i !== index);
            const reordered = [chosen, ...remaining];
            return {
                ...prev,
                images: reordered,
                image: chosen
            };
        });
    };

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'drrjsmqsh';
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ecocycle';

            const currentImages = formData.images && formData.images.length > 0
                ? formData.images
                : (formData.image ? [formData.image] : []);

            let uploadedUrls = [];

            // Upload any base64 images to Cloudinary, keep existing URLs
            for (const img of currentImages) {
                if (img && img.startsWith('data:')) {
                    const cloudFormData = new FormData();
                    cloudFormData.append('file', img);
                    cloudFormData.append('upload_preset', uploadPreset);

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: cloudFormData
                    });

                    if (!response.ok) {
                        throw new Error("Failed to upload image to Cloudinary");
                    }

                    const data = await response.json();
                    uploadedUrls.push(data.secure_url);
                } else if (img) {
                    uploadedUrls.push(img);
                }
            }

            const primaryImageUrl = uploadedUrls[0] || null;

            const productData = {
                ...formData,
                images: uploadedUrls,
                image: primaryImageUrl,
                price: Number(formData.price),
                quantity: Number(formData.quantity) || 1,
                vendorId: currentUser.uid,
                vendorName: currentUser.businessName || currentUser.email,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "products", editingId), productData);
                alert("Product updated successfully!");
            } else {
                productData.createdAt = serverTimestamp();
                await addDoc(collection(db, "products"), productData);
                alert(t('product_added_success') || "Product added successfully!");
            }

            // If it was a recycled product from inventory, update inventory status
            if (formData.type === 'recycled' && formData.sourceType === 'inventory' && formData.sourceInventoryId) {
                const inventoryRef = doc(db, "requests", formData.sourceInventoryId);
                await updateDoc(inventoryRef, {
                    inventoryStatus: 'recycled', // Mark as used/recycled
                    recycledProductId: "PENDING_ID" // ideally we'd get the ID from addDoc result
                });
            }

            // Reset Form
            setFormData({
                name: '',
                price: '',
                quantity: 1,
                category: 'General',
                description: '',
                type: 'new',
                sourceType: 'inventory',
                sourceInventoryId: '',
                image: null,
                images: []
            });
            setIsAddingMode(false);
            setEditingId(null);
            fetchData(); // Refresh list

        } catch (error) {
            console.error("Error adding product:", error);
            alert("Error adding product. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update Order Status
    const handleUpdateStatus = async (orderId, newStatus) => {
        if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
        try {
            const orderRef = doc(db, "orders", orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            fetchData(); // Refresh orders
        } catch (error) {
            console.error("Error updating order:", error);
        }
    };

    const openShippingModal = (order) => {
        setSelectedOrderForShipping(order);
        setTrackingData({ deliveryPartner: '', trackingId: '' });
        setShowShippingModal(true);
    };

    const submitShipping = async () => {
        if (!selectedOrderForShipping) return;

        try {
            const orderRef = doc(db, "orders", selectedOrderForShipping.id);
            await updateDoc(orderRef, {
                status: 'shipped',
                trackingId: trackingData.trackingId,
                deliveryPartner: trackingData.deliveryPartner,
                shippedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            setShowShippingModal(false);
            setSelectedOrderForShipping(null);
            fetchData();
            alert("Order marked as shipped!");
        } catch (error) {
            console.error("Error updating shipping status:", error);
            alert("Failed to update status");
        }
    };

    // Edit Handler
    const handleEdit = (product) => {
        const prodImages = product.images && product.images.length > 0
            ? product.images
            : (product.image ? [product.image] : []);

        setFormData({
            name: product.name,
            price: product.price,
            quantity: product.quantity || 1,
            category: product.category || 'General',
            description: product.description || '',
            type: product.type || 'new',
            sourceType: product.sourceType || 'inventory',
            sourceInventoryId: product.sourceInventoryId || '',
            image: product.image || prodImages[0] || null,
            images: prodImages
        });
        setEditingId(product.id);
        setIsAddingMode(true);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Delete Handler
    const handleDelete = async (productId) => {
        if (!window.confirm("Are you sure you want to delete this product? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, "products", productId));
            setProducts(prev => prev.filter(p => p.id !== productId));
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product.");
        }
    };
    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-brand-brown">Shop Management</h1>
                    <p className="text-brand-brown/60">Manage your products and track incoming orders</p>
                </div>

                {activeTab === 'products' && (
                    <button
                        onClick={() => {
                            setIsAddingMode(!isAddingMode);
                            if (isAddingMode) {
                                setEditingId(null); // Reset if canceling
                                setFormData({
                                    name: '', price: '', quantity: 1, category: 'General', description: '',
                                    type: 'new', sourceType: 'inventory', sourceInventoryId: '', image: null, images: []
                                });
                            }
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg ${isAddingMode ? 'bg-gray-200 text-gray-700' : 'bg-brand-brown text-white hover:bg-brand-black'}`}
                    >
                        {isAddingMode ? "Cancel" : <><Plus size={20} /> Add New Product</>}
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-brand-brown/5 max-w-2xl overflow-x-auto">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'bg-brand-brown/10 text-brand-brown shadow-sm' : 'text-gray-400 hover:text-brand-brown/60'}`}
                >
                    <Package className="w-4 h-4" /> Active Listings
                </button>
                <button
                    onClick={() => setActiveTab('previous')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'previous' ? 'bg-orange-100 text-orange-800 shadow-sm' : 'text-gray-400 hover:text-orange-800/60'}`}
                >
                    <History className="w-4 h-4" /> Previous
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-400 hover:text-green-700/60'}`}
                >
                    <Truck className="w-4 h-4" /> Incoming Orders
                    {orders.length > 0 && (
                        <span className="bg-green-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{orders.length}</span>
                    )}
                </button>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="min-h-[500px]">

                {/* 1. PRODUCTS TAB */}
                {(activeTab === 'products' || activeTab === 'previous') && (
                    <>
                        {/* ADD PRODUCT FORM */}
                        {isAddingMode && (
                            <div className="bg-white p-8 rounded-3xl shadow-xl border border-brand-brown/10 animate-in slide-in-from-top-4 mb-8">
                                <h2 className="text-xl font-bold mb-6 text-brand-brown flex items-center gap-2">
                                    {editingId ? <CheckCircle className="w-5 h-5 bg-brand-brown text-white rounded-full p-1" /> : <Plus className="w-5 h-5 bg-brand-brown text-white rounded-full p-1" />}
                                    {editingId ? "Edit Product" : "Add New Product"}
                                </h2>
                                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* ... (Keep existing form content, just updated classes slightly for polish) ... */}
                                    <div className="space-y-6">
                                        {/* Multi-Image Preview & Upload */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-sm font-bold text-brand-brown">
                                                    Product Photos {formData.images?.length > 0 && `(${formData.images.length})`}
                                                </label>
                                                <span className="text-xs text-brand-brown/50">First image is primary</span>
                                            </div>

                                            {formData.images && formData.images.length > 0 ? (
                                                <div className="space-y-3">
                                                    {/* Primary Main Image Preview */}
                                                    <div className="relative h-64 w-full rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 group">
                                                        <img
                                                            src={formData.images[0]}
                                                            alt="Primary product preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute top-3 left-3 bg-brand-brown text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                                                            <CheckCircle className="w-3.5 h-3.5 text-brand-green" /> Primary Photo
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveImage(0)}
                                                            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow hover:bg-red-50 hover:text-red-500 transition-colors"
                                                            title="Remove Image"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    {/* Thumbnails list + Add More */}
                                                    <div className="grid grid-cols-4 gap-2">
                                                        {formData.images.map((img, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`relative h-20 rounded-xl overflow-hidden border-2 cursor-pointer group ${
                                                                    idx === 0 ? 'border-brand-brown ring-2 ring-brand-brown/20' : 'border-gray-200 hover:border-gray-400'
                                                                }`}
                                                                onClick={() => handleSetPrimaryImage(idx)}
                                                                title={idx === 0 ? 'Primary Photo' : 'Click to make primary'}
                                                            >
                                                                <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                                                {idx === 0 ? (
                                                                    <div className="absolute inset-x-0 bottom-0 bg-brand-brown/90 text-white text-[9px] font-bold py-0.5 text-center">
                                                                        Primary
                                                                    </div>
                                                                ) : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleRemoveImage(idx);
                                                                        }}
                                                                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-full shadow opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition"
                                                                        title="Remove"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}

                                                        {/* Add More button */}
                                                        <label className="h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-brown flex flex-col items-center justify-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition text-gray-500">
                                                            <Plus className="w-5 h-5 mb-1" />
                                                            <span className="text-[10px] font-bold">Add More</span>
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/*"
                                                                onChange={handleImageChange}
                                                                className="hidden"
                                                            />
                                                        </label>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="border-2 border-dashed border-gray-300 rounded-2xl h-72 flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 group cursor-pointer hover:border-brand-green/50 transition">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept="image/*"
                                                        onChange={handleImageChange}
                                                        className="hidden"
                                                    />
                                                    <div className="text-center text-gray-400 p-6">
                                                        <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 text-brand-brown/50 group-hover:scale-110 transition">
                                                            <ImageIcon className="w-7 h-7" />
                                                        </div>
                                                        <span className="text-sm font-bold block text-brand-brown">Click to Upload Photos</span>
                                                        <span className="text-xs text-gray-400 mt-1 block">Select one or multiple images (JPG, PNG up to 5MB)</span>
                                                    </div>
                                                </label>
                                            )}
                                        </div>

                                        <div className="bg-brand-cream/30 p-5 rounded-2xl border border-brand-brown/5">
                                            <label className="block text-sm font-bold text-brand-brown mb-3">Product Origin</label>
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'new' })}
                                                    className={`py-3 font-bold text-sm rounded-xl transition ${formData.type === 'new' ? 'bg-brand-brown text-white shadow-md' : 'bg-white border text-gray-400 hover:bg-gray-50'}`}
                                                >
                                                    Brand New
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, type: 'recycled', sourceType: 'inventory' })}
                                                    className={`py-3 font-bold text-sm rounded-xl transition ${formData.type === 'recycled' ? 'bg-green-600 text-white shadow-md' : 'bg-white border text-gray-400 hover:bg-gray-50'}`}
                                                >
                                                    Recycled
                                                </button>
                                            </div>

                                            {formData.type === 'recycled' && (
                                                <div className="animate-in fade-in space-y-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-brand-brown/70 block mb-2 uppercase tracking-wide">Select Source</label>
                                                        <div className="flex gap-2">
                                                            {['inventory', 'ingredient', 'other'].map(type => (
                                                                <button
                                                                    key={type}
                                                                    type="button"
                                                                    onClick={() => setFormData({ ...formData, sourceType: type, sourceInventoryId: '' })}
                                                                    className={`flex-1 py-2 font-bold text-xs rounded-lg capitalize transition ${formData.sourceType === type ? 'bg-green-100 text-green-800 ring-1 ring-green-500' : 'bg-white border text-gray-500 hover:bg-gray-50'}`}
                                                                >
                                                                    {type}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown mb-1.5">Product Name</label>
                                            <input
                                                required
                                                className="w-full p-4 bg-gray-50 border-0 rounded-xl font-bold focus:ring-2 focus:ring-brand-green outline-none transition-all placeholder-gray-300"
                                                placeholder="e.g. Recycled Metal Planter"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-bold text-brand-brown mb-1.5">Price (₹)</label>
                                                <div className="relative">
                                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <input
                                                        required type="number"
                                                        className="w-full p-4 pl-10 bg-gray-50 border-0 rounded-xl font-bold focus:ring-2 focus:ring-brand-green outline-none"
                                                        placeholder="0.00"
                                                        value={formData.price}
                                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-sm font-bold text-brand-brown mb-1.5">Quantity</label>
                                                <input
                                                    required type="number"
                                                    className="w-full p-4 bg-gray-50 border-0 rounded-xl font-bold focus:ring-2 focus:ring-brand-green outline-none"
                                                    placeholder="1"
                                                    value={formData.quantity}
                                                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-bold text-brand-brown mb-1.5">Category</label>
                                                <select
                                                    className="w-full p-4 bg-gray-50 border-0 rounded-xl font-medium focus:ring-2 focus:ring-brand-green outline-none cursor-pointer"
                                                    value={formData.category}
                                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                                >
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {formData.type === 'recycled' && formData.sourceType !== 'other' && (
                                            <div className="animate-in fade-in">
                                                <label className="block text-sm font-bold text-green-700 mb-1.5 flex items-center gap-2">
                                                    <Package className="w-4 h-4" />
                                                    Link Source Item
                                                </label>

                                                <select
                                                    className="w-full p-4 bg-green-50/50 border border-green-100 text-green-900 rounded-xl font-medium focus:ring-2 focus:ring-green-500 outline-none cursor-pointer"
                                                    value={formData.sourceInventoryId}
                                                    onChange={e => setFormData({ ...formData, sourceInventoryId: e.target.value })}
                                                    required={formData.type === 'recycled'}
                                                >
                                                    <option value="">-- Choose Item from Inventory --</option>
                                                    {/* ... (Existing map logic) ... */}
                                                    {formData.sourceType === 'inventory' ? (
                                                        inventory.map(item => (
                                                            <option key={item.id} value={item.id}>
                                                                {item.itemName} (Cost: ₹{item.finalQuote?.finalVendorCost})
                                                            </option>
                                                        ))
                                                    ) : (
                                                        products.map(prod => (
                                                            <option key={prod.id} value={prod.id}>
                                                                {prod.name}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-sm font-bold text-brand-brown mb-1.5">Description</label>
                                            <textarea
                                                className="w-full p-4 bg-gray-50 border-0 rounded-xl h-40 focus:ring-2 focus:ring-brand-green outline-none resize-none"
                                                placeholder="Describe your product materials and features..."
                                                value={formData.description}
                                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full py-5 bg-brand-brown text-white font-bold text-lg rounded-xl shadow-xl hover:bg-brand-black transition transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                                        >
                                            {isSubmitting ? "Saving..." : (editingId ? "Save Changes" : "Publish Product Now")}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}



                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {products.filter(p => activeTab === 'previous' ? (!p.quantity || p.quantity <= 0) : (p.quantity > 0)).length === 0 && !loading && (
                                <div className="col-span-full py-32 text-center opacity-40 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                                    <Tag className="w-20 h-20 mx-auto mb-6 text-gray-300" />
                                    <h3 className="text-2xl font-bold text-gray-400 whitespace-pre-wrap">
                                        {activeTab === 'previous' ? "No Out of Stock Items" : "Your Shop is Empty"}
                                    </h3>
                                    <p className="max-w-xs mx-auto mt-2">
                                        {activeTab === 'previous' ? "Sold out items will appear here." : "Add your first recycled masterpiece to start selling."}
                                    </p>
                                </div>
                            )}
                            {products
                                .filter(p => activeTab === 'previous' ? (!p.quantity || p.quantity <= 0) : (p.quantity > 0))
                                .map(product => (
                                    <div key={product.id} className="bg-white rounded-3xl shadow-sm border border-brand-brown/5 overflow-hidden group hover:shadow-xl transition-all duration-300">
                                        <div className="h-56 overflow-hidden relative bg-gray-100">
                                            <img src={product.image || 'https://placehold.co/300?text=No+Image'} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" />
                                            {product.type === 'recycled' && (
                                                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                                    <CheckCircle className="w-3 h-3" /> RECYCLED
                                                </div>
                                            )}
                                            {product.images && product.images.length > 1 && (
                                                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                                                    <ImageIcon className="w-3 h-3" /> {product.images.length} photos
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-brand-brown shadow-sm uppercase tracking-wider">
                                                {product.category}
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-brand-brown text-lg leading-tight line-clamp-2">{product.name}</h3>
                                                <div className="font-extrabold text-brand-green text-xl whitespace-nowrap">₹{product.price}</div>
                                            </div>

                                            {product.type === 'recycled' && product.sourceInventoryName && (
                                                <div className="bg-green-50 p-2 rounded-lg text-xs text-green-800 mb-4 flex items-start gap-2 border border-green-100/50">
                                                    <Recycle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
                                                    <span className="opacity-90 leading-tight">Made from <span className="font-bold">{product.sourceInventoryName}</span></span>
                                                </div>
                                            )}

                                            <p className="text-sm text-brand-brown/60 line-clamp-2 mb-4 h-10">{product.description}</p>

                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="flex-1 py-2.5 bg-gray-50 text-brand-brown/70 font-bold rounded-xl text-sm hover:bg-brand-brown hover:text-white transition-colors"
                                                >
                                                    Edit Details
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="px-3 py-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"
                                                    title="Delete Product"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </>
                )}

                {/* 2. ORDERS TAB */}
                {activeTab === 'orders' && (
                    <div className="animate-in fade-in">
                        {orders.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-3xl border border-dashed border-gray-200">
                                <Truck className="w-20 h-20 mx-auto mb-6 text-green-100" />
                                <h3 className="text-2xl font-bold text-gray-400">No Orders Yet</h3>
                                <p className="text-gray-400 mt-2">When customers buy your products, orders will appear here.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {orders.map(order => (
                                    <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-brand-brown/5 flex flex-col md:flex-row items-center gap-6 hover:shadow-md transition">
                                        {/* Product Image */}
                                        <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                            <img src={order.productImage} alt="Product" className="w-full h-full object-cover" />
                                        </div>

                                        {/* Order Info */}
                                        <div className="flex-1 text-center md:text-left">
                                            <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                                                <h3 className="font-bold text-lg text-brand-brown">{order.productName}</h3>
                                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-full uppercase tracking-wide">
                                                    {order.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 mb-2">Order ID: #{order.id.slice(0, 8)}</div>

                                            <div className="flex flex-wrap gap-4 text-sm justify-center md:justify-start">
                                                <div className="flex items-center gap-1.5 text-brand-brown/80 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                    <User className="w-4 h-4 opacity-50" />
                                                    <span className="font-bold">{order.customerName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-brand-brown/80 bg-gray-50 px-3 py-1.5 rounded-lg">
                                                    <DollarSign className="w-4 h-4 opacity-50" />
                                                    <span>Total: <span className="font-bold">₹{order.price}</span></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2 w-full md:w-auto">
                                            {(!order.status || order.status === 'pending') && (
                                                <button
                                                    onClick={() => openShippingModal(order)}
                                                    className="flex-1 md:flex-none px-6 py-3 bg-brand-brown text-white font-bold rounded-xl text-sm hover:bg-brand-black transition shadow-sm"
                                                >
                                                    Ship Order
                                                </button>
                                            )}
                                            {order.status === 'shipped' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                                                    className="flex-1 md:flex-none px-6 py-3 bg-brand-green text-white font-bold rounded-xl text-sm hover:bg-green-700 transition shadow-sm"
                                                >
                                                    Mark Delivered
                                                </button>
                                            )}
                                            {order.status === 'delivered' && (
                                                <button disabled className="flex-1 md:flex-none px-6 py-3 bg-gray-100 text-gray-400 font-bold rounded-xl text-sm cursor-not-allowed">
                                                    Delivered
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Shipping Modal */}
            {
                showShippingModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-xl font-bold text-brand-brown mb-2 flex items-center gap-2">
                                <Truck className="w-6 h-6 text-brand-orange" />
                                Ship Order #{selectedOrderForShipping?.id.slice(0, 8)}
                            </h3>
                            <p className="text-brand-brown/60 text-sm mb-6">Enter tracking details to notify the customer.</p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-brand-brown mb-1.5">Delivery Partner</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-brand-orange"
                                        value={trackingData.deliveryPartner}
                                        onChange={(e) => setTrackingData({ ...trackingData, deliveryPartner: e.target.value })}
                                    >
                                        <option value="">Select Partner...</option>
                                        <option value="Delhivery">Delhivery</option>
                                        <option value="India Post">India Post</option>
                                        <option value="DTDC">DTDC</option>
                                        <option value="Blue Dart">Blue Dart</option>
                                        <option value="ExpressBees">ExpressBees</option>
                                        <option value="Shadowfax">Shadowfax</option>
                                        <option value="Dunzo">Dunzo</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-brand-brown mb-1.5">Tracking ID / Link</label>
                                    <input
                                        type="text"
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-brand-orange placeholder-gray-300"
                                        placeholder="e.g. 1234567890"
                                        value={trackingData.trackingId}
                                        onChange={(e) => setTrackingData({ ...trackingData, trackingId: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={() => setShowShippingModal(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={submitShipping}
                                    disabled={!trackingData.deliveryPartner || !trackingData.trackingId}
                                    className="flex-1 py-3 bg-brand-brown text-white font-bold rounded-xl hover:bg-brand-black transition-colors disabled:opacity-50"
                                >
                                    Confirm Shipment
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );

}
