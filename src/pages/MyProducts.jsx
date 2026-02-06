import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import { Plus, Package, Truck, Tag, DollarSign, Image as ImageIcon, Loader2, CheckCircle, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MyProducts() {
    const { t } = useTranslation();
    const { currentUser } = useAuth();

    // UI State
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // Data State
    const [products, setProducts] = useState([]);
    const [inventory, setInventory] = useState([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'General',
        description: '',
        type: 'new', // 'new' | 'recycled'
        sourceType: 'inventory', // 'inventory' | 'ingredient'
        sourceInventoryId: '', // if type is recycled
        image: null // base64 for preview/upload
    });

    const CATEGORIES = ["General", "Gardening", "Kitchen", "Accessories", "Outdoor", "Decor", "Furniture"];

    // Fetch Products & Inventory
    useEffect(() => {
        if (!currentUser) return;
        fetchData();
    }, [currentUser]);

    const fetchData = async () => {
        try {
            // 1. Fetch My Products
            // 1. Fetch My Products
            const prodQuery = query(
                collection(db, "products"),
                where("vendorId", "==", currentUser.uid)
            );
            const prodSnap = await getDocs(prodQuery);
            const productsData = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Sort in memory (Newest first)
            productsData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setProducts(productsData);

            // 2. Fetch My Inventory (Bought Items that are NOT sold yet)
            // Fix: Fetch all accepted requests for this vendor and filter for 'sell' type in memory
            const invQuery = query(
                collection(db, "requests"),
                where("vendorIds", "array-contains", currentUser.uid),
                where("status", "==", "accepted")
            );
            const invSnap = await getDocs(invQuery);
            const invItems = [];
            invSnap.forEach(doc => {
                const data = doc.data();
                // Ensure I am the one who accepted it AND it is a Sell request (Vendor Buy) AND not used yet
                if (data.acceptedBy === currentUser.uid &&
                    data.itemDetails?.requestType === 'sell' &&
                    data.inventoryStatus !== 'sold') {
                    invItems.push({ id: doc.id, ...data });
                }
            });
            setInventory(invItems);

            setLoading(false);
        } catch (error) {
            console.error("Error fetching data:", error);
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            let imageUrl = null;
            if (formData.image) {
                try {
                    const storageRef = ref(storage, `products/${currentUser.uid}/${Date.now()}.jpg`);
                    await uploadString(storageRef, formData.image, 'data_url');
                    imageUrl = await getDownloadURL(storageRef);
                } catch (uploadError) {
                    console.error("Image upload failed:", uploadError);
                    alert("Warning: Image upload failed (likely CORS issue). Publishing product without image.");
                    imageUrl = null;
                }
            }

            // Simple validation
            if (!formData.name || !formData.price) {
                alert("Please fill required fields");
                setIsSubmitting(false);
                return;
            }

            // Determine Source Name
            let sourceName = null;
            if (formData.type === 'recycled') {
                if (formData.sourceType === 'ingredient') {
                    sourceName = products.find(p => p.id === formData.sourceInventoryId)?.name;
                } else if (formData.sourceType === 'inventory') {
                    sourceName = inventory.find(i => i.id === formData.sourceInventoryId)?.itemName;
                } else if (formData.sourceType === 'other') {
                    sourceName = "Other Source";
                }
            }

            // Create Product
            const newProduct = {
                vendorId: currentUser.uid,
                vendorName: currentUser.displayName || currentUser.businessName || "Vendor",
                name: formData.name,
                price: parseFloat(formData.price),
                category: formData.category,
                description: formData.description,
                type: formData.type,
                sourceType: formData.type === 'recycled' ? (formData.sourceType || 'inventory') : null, // 'inventory' | 'ingredient' | 'other'
                sourceInventoryId: formData.type === 'recycled' ? formData.sourceInventoryId : null,
                sourceInventoryName: sourceName,
                image: imageUrl,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "products"), newProduct);

            // If Recycled from Inventory, mark request as sold
            // Only if strictly 'inventory' type
            if (formData.type === 'recycled' && formData.sourceType === 'inventory' && formData.sourceInventoryId) {
                await updateDoc(doc(db, "requests", formData.sourceInventoryId), {
                    inventoryStatus: 'sold',
                    soldAsProductId: 'PENDING_ID_LINK'
                });
            }

            // Reset and Refresh
            setIsAddingMode(false);
            setFormData({
                name: '', price: '', category: 'General', description: '', type: 'new', sourceType: 'inventory', sourceInventoryId: '', image: null
            });
            fetchData();
            alert("Product Added Successfully!");

        } catch (error) {
            console.error(error);
            alert("Failed to add product");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-brand-brown">My Shop Products</h1>
                    <p className="text-brand-brown/60">Manage your items for sale</p>
                </div>
                <button
                    onClick={() => setIsAddingMode(!isAddingMode)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-green text-white rounded-xl font-bold hover:bg-green-700 transition"
                >
                    {isAddingMode ? "Cancel" : <><Plus size={20} /> Add Product</>}
                </button>
            </div>

            {/* ADD PRODUCT FORM */}
            {isAddingMode && (
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-brand-brown/10 animate-in slide-in-from-top-4">
                    <h2 className="text-lg font-bold mb-4 text-brand-brown">New Product Details</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Left Column: Image & Type */}
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center relative overflow-hidden bg-gray-50 group cursor-pointer hover:border-brand-green/50 transition">
                                <input type="file" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                {formData.image ? (
                                    <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <ImageIcon className="w-10 h-10 mx-auto mb-2" />
                                        <span className="text-sm font-bold">Click to Upload Image</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-brand-cream/30 p-4 rounded-xl">
                                <label className="block text-sm font-bold text-brand-brown mb-2">Product Type</label>
                                <div className="flex bg-white rounded-lg p-1 border mb-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'new' })}
                                        className={`flex-1 py-2 font-bold text-sm rounded-md transition ${formData.type === 'new' ? 'bg-brand-brown text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Brand New
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'recycled', sourceType: 'inventory' })}
                                        className={`flex-1 py-2 font-bold text-sm rounded-md transition ${formData.type === 'recycled' ? 'bg-green-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Recycled
                                    </button>
                                </div>

                                {formData.type === 'recycled' && (
                                    <div className="animate-in fade-in space-y-3">
                                        <div>
                                            <label className="text-xs font-bold text-brand-brown/70 block mb-1">Source Type</label>
                                            <div className="flex bg-white/50 rounded-lg p-1 border">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, sourceType: 'inventory', sourceInventoryId: '' })}
                                                    className={`flex-1 py-1.5 font-bold text-xs rounded transition ${formData.sourceType === 'inventory' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    Raw Inventory
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, sourceType: 'ingredient', sourceInventoryId: '' })}
                                                    className={`flex-1 py-1.5 font-bold text-xs rounded transition ${formData.sourceType === 'ingredient' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    Ingredient
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, sourceType: 'other', sourceInventoryId: '' })}
                                                    className={`flex-1 py-1.5 font-bold text-xs rounded transition ${formData.sourceType === 'other' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    Other
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <p className="text-xs text-brand-brown/50 mt-2">
                                    {formData.type === 'recycled'
                                        ? (formData.sourceType === 'ingredient' ? "Made from one of your existing products/ingredients." : (formData.sourceType === 'other' ? "Made from general recycled materials." : "Made from raw items you bought from customers."))
                                        : "Standard inventory items."}
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Details */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-brand-brown mb-1">Product Name</label>
                                <input
                                    required
                                    className="w-full p-3 bg-gray-50 border rounded-xl font-bold focus:ring-2 focus:ring-brand-green outline-none"
                                    placeholder="e.g. Recycled Metal Planter"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-brand-brown mb-1">Price (₹)</label>
                                    <input
                                        required type="number"
                                        className="w-full p-3 bg-gray-50 border rounded-xl font-bold focus:ring-2 focus:ring-brand-green outline-none"
                                        placeholder="0.00"
                                        value={formData.price}
                                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-brand-brown mb-1">Category</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border rounded-xl font-medium focus:ring-2 focus:ring-brand-green outline-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {formData.type === 'recycled' && formData.sourceType !== 'other' && (
                                <div className="animate-in fade-in">
                                    <label className="block text-sm font-bold text-green-700 mb-1 flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Select {formData.sourceType === 'ingredient' ? 'Ingredient' : 'Inventory Item'}
                                    </label>

                                    {/* Empty State checks */}
                                    {formData.sourceType === 'inventory' && inventory.length === 0 ? (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-bold text-center">
                                            No inventory items found. You need to accept and complete 'Sell' requests from customers first.
                                        </div>
                                    ) : formData.sourceType === 'ingredient' && products.length === 0 ? (
                                        <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl text-xs text-yellow-600 font-bold text-center">
                                            No existing products found to use as ingredients.
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl font-medium focus:ring-2 focus:ring-green-500 outline-none"
                                            value={formData.sourceInventoryId}
                                            onChange={e => setFormData({ ...formData, sourceInventoryId: e.target.value })}
                                            required={formData.type === 'recycled'}
                                        >
                                            <option value="">-- Select {formData.sourceType === 'ingredient' ? 'Ingredient' : 'Item'} --</option>

                                            {formData.sourceType === 'inventory' ? (
                                                inventory.map(item => (
                                                    <option key={item.id} value={item.id}>
                                                        {item.itemName} (Bought for ₹{item.finalQuote?.finalVendorCost})
                                                    </option>
                                                ))
                                            ) : (
                                                products.map(prod => (
                                                    <option key={prod.id} value={prod.id}>
                                                        {prod.name} (Ref: {prod.category})
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    )}

                                    {formData.sourceType === 'inventory' && inventory.length > 0 && (
                                        <p className="text-xs text-green-600 mt-1">
                                            Selecting an item will remove it from your available active inventory.
                                        </p>
                                    )}
                                </div>
                            )}

                            {formData.type === 'recycled' && formData.sourceType === 'other' && (
                                <div className="animate-in fade-in bg-green-50 p-4 rounded-xl border border-green-100">
                                    <div className="text-sm font-bold text-green-800 flex items-center gap-2 mb-1">
                                        <CheckCircle className="w-4 h-4" /> Custom Source
                                    </div>
                                    <p className="text-xs text-green-700">
                                        This product will be listed as recycled from "Other Source". Make sure to describe the materials in the description.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-brand-brown mb-1">Description</label>
                                <textarea
                                    className="w-full p-3 bg-gray-50 border rounded-xl h-32 focus:ring-2 focus:ring-brand-green outline-none resize-none"
                                    placeholder="Describe your product..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-brand-brown text-white font-bold rounded-xl shadow-lg hover:bg-brand-black transition disabled:opacity-50"
                            >
                                {isSubmitting ? "Publishing..." : "Publish Product"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* PRODUCTS LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.length === 0 && !loading && (
                    <div className="col-span-full py-20 text-center opacity-50">
                        <Tag className="w-16 h-16 mx-auto mb-4" />
                        <h3 className="text-xl font-bold">No Products Yet</h3>
                        <p>Add your first product to the shop.</p>
                    </div>
                )}
                {products.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-brand-brown/5 overflow-hidden group hover:shadow-xl transition">
                        <div className="h-48 overflow-hidden relative">
                            <img src={product.image || 'https://via.placeholder.com/300?text=No+Image'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                            {product.type === 'recycled' && (
                                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                    <CheckCircle className="w-3 h-3" /> RECYCLED
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="text-[10px] uppercase font-bold text-brand-brown/40 tracking-wider">{product.category}</div>
                                    <h3 className="font-bold text-brand-brown text-lg leading-tight">{product.name}</h3>
                                </div>
                                <div className="font-black text-brand-green text-lg">₹{product.price}</div>
                            </div>

                            {product.type === 'recycled' && product.sourceInventoryName && (
                                <div className="bg-green-50 p-2 rounded-lg text-xs text-green-800 mb-3 flex items-center gap-2">
                                    <Package className="w-3 h-3" />
                                    Made from: <span className="font-bold">{product.sourceInventoryName}</span>
                                </div>
                            )}

                            <p className="text-sm text-brand-brown/70 line-clamp-2">{product.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
