import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, FolderPlus, PackagePlus, QrCode, MessageSquare,
  Clock, Smartphone, Plus, Trash2, Layers, MapPin,
  Upload, CheckCircle, Image as ImageIcon, ArrowUpRight, Eye, Edit2, X, Send, Bot, User
} from 'lucide-react';

const CLOUD_NAME = "dljxl4mls";
const UPLOAD_PRESET = "prwatchesandmobiles";

const API_BASE_URL = "http://localhost:8000/";

function App() {
  const [activeTab, setActiveTab] = useState('crm'); 
  
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  const [chats, setChats] = useState([]);
  const [searchPhone, setSearchPhone] = useState('');
  const [dateSortOrder, setDateSortOrder] = useState('desc'); 
  const [selectedChat, setSelectedChat] = useState(null);
  const [manualMessage, setManualMessage] = useState('');
  
  const [activePreviewImage, setActivePreviewImage] = useState(null);

  const [categoryForm, setCategoryForm] = useState({ name: '', display_order: '0' });
  const [categoryFile, setCategoryFile] = useState(null); 

  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', display_order: '0' });
  const [editFile, setEditFile] = useState(null);

  const [productForm, setProductForm] = useState({ category_id: '', name: '', price: '', description: '', priority_order: '1' });
  const [selectedImages, setSelectedImages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [qrFile, setQrFile] = useState(null);

  const [editingProductId, setEditingProductId] = useState(null);
  const [productEditForm, setProductEditForm] = useState({ category_id: '', name: '', price: '', description: '', priority_order: '1' });
  const [productEditImages, setProductEditImages] = useState([]);

  useEffect(() => {
    fetchCRMOrders();
    fetchCategories();
    fetchProducts();
    fetchGlobalSettings();
    fetchLiveChats();

    const globalSyncInterval = setInterval(() => {
      fetchLiveChats();
      fetchCRMOrders(); 
    }, 5000);

    return () => clearInterval(globalSyncInterval);
  }, [selectedChat?._id]);

  const fetchCRMOrders = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/orders`);
      setOrders(res.data);
    } catch (err) { console.error("Error fetching CRM lead database:", err); }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/categories`);
      setCategories(res.data);
    } catch (err) { console.error("Error fetching macro catalog sectors:", err); }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/products`);
      const sortedData = res.data.sort((a, b) => Number(a.priority_order || 0) - Number(b.priority_order || 0));
      setProducts(sortedData);
    } catch (err) { console.error("Error fetching sub-tier product specifications:", err); }
  };

  const fetchGlobalSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/settings`);
      if (res.data?.qr_code_url) setQrCodeUrl(res.data.qr_code_url);
    } catch (err) { console.error("Error fetching retail configuration state:", err); }
  };

  const fetchLiveChats = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/chats`);
      setChats(res.data);
      if (selectedChat) {
        const updatedSelected = res.data.find(c => c._id === selectedChat._id);
        if (updatedSelected) setSelectedChat(updatedSelected);
      }
    } catch (err) { console.error("Error loading chat context matrices:", err); }
  };

  const toggleBotBypassState = async (phone, currentStatus) => {
    try {
      await axios.post(`${API_BASE_URL}/api/admin/chats/toggle-bot`, {
        phone, is_bot_disabled: !currentStatus
      });
      fetchLiveChats();
    } catch (err) { alert("Failed to switch execution environment status flags."); }
  };

  const handleSendManualText = async (e) => {
    e.preventDefault();
    if (!manualMessage.trim() || !selectedChat) return;
    try {
      await axios.post(`${API_BASE_URL}/api/admin/chats/manual-send`, {
        phone: selectedChat._id, message: manualMessage
      });
      setManualMessage('');
      fetchLiveChats();
    } catch (err) { alert("Failed to dispatch text frame."); }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let uploadedBannerUrl = "";
      if (categoryFile) {
        const formData = new FormData();
        formData.append('file', categoryFile);
        formData.append('upload_preset', UPLOAD_PRESET);
        const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
        uploadedBannerUrl = cloudRes.data.secure_url;
      }

      const cleanDisplayOrder = parseInt(categoryForm.display_order, 10) || 0;

      await axios.post(`${API_BASE_URL}/api/admin/categories`, {
        name: categoryForm.name, 
        display_order: cleanDisplayOrder, 
        category_image_url: uploadedBannerUrl 
      });
      setCategoryForm({ name: '', display_order: '0' }); setCategoryFile(null); fetchCategories();
      alert("Category along with its Manual Complete Catalog Image saved successfully!");
    } catch (err) { alert("Failed compiling changes."); } finally { setIsUploading(false); }
  };

  const handleCategoryUpdate = async (id, originalImageUrl) => {
    setIsUploading(true);
    try {
      let finalBannerUrl = originalImageUrl;
      if (editFile) {
        const formData = new FormData(); 
        formData.append('file', editFile); 
        formData.append('upload_preset', UPLOAD_PRESET);
        const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
        finalBannerUrl = cloudRes.data.secure_url;
      }
      
      const cleanDisplayOrder = parseInt(editForm.display_order, 10) || 0;

      await axios.post(`${API_BASE_URL}/api/admin/categories`, {
        _id: id,
        name: editForm.name, 
        display_order: cleanDisplayOrder, 
        category_image_url: finalBannerUrl
      });
      
      setEditingCategoryId(null); setEditFile(null); fetchCategories();
      alert("Category properties updated and re-saved flawlessly!");
    } catch (err) { alert("Error writing modifications."); } finally { setIsUploading(false); }
  };

  const startEditing = (category) => {
    setEditingCategoryId(category._id);
    setEditForm({ name: category.name, display_order: String(category.display_order || 0) });
    setEditFile(null);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (selectedImages.length === 0) return alert("Please drop or select at least 1 image file asset.");
    setIsUploading(true);
    try {
      const uploadedUrlStrings = [];
      for (let i = 0; i < selectedImages.length; i++) {
        const formData = new FormData(); formData.append('file', selectedImages[i]); formData.append('upload_preset', UPLOAD_PRESET);
        const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
        uploadedUrlStrings.push(cloudRes.data.secure_url);
      }
      await axios.post(`${API_BASE_URL}/api/admin/products`, {
        ...productForm, 
        price: Number(productForm.price), 
        priority_order: Number(productForm.priority_order), 
        images: uploadedUrlStrings
      });
      setProductForm({ category_id: '', name: '', price: '', description: '', priority_order: '1' }); setSelectedImages([]); fetchProducts();
      alert("Product variations mapped successfully to sequential framework positions!");
    } catch (err) { alert("Error committing product allocations."); } finally { setIsUploading(false); }
  };

  const handleProductUpdate = async (id, originalImages) => {
    setIsUploading(true);
    try {
      let finalImages = [...originalImages];
      if (productEditImages.length > 0) {
        finalImages = [];
        for (let i = 0; i < productEditImages.length; i++) {
          const formData = new FormData();
          formData.append('file', productEditImages[i]);
          formData.append('upload_preset', UPLOAD_PRESET);
          const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
          finalImages.push(cloudRes.data.secure_url);
        }
      }

      await axios.post(`${API_BASE_URL}/api/admin/products`, {
        _id: id,
        category_id: productEditForm.category_id,
        name: productEditForm.name,
        price: Number(productEditForm.price),
        priority_order: Number(productEditForm.priority_order),
        description: productEditForm.description,
        images: finalImages
      });

      setEditingProductId(null); setProductEditImages([]); fetchProducts();
      alert("Product variations mapped and properties updated flawlessly!");
    } catch (err) { alert("Error committing product allocations."); } finally { setIsUploading(false); }
  };

  const startProductEditing = (product) => {
    setEditingProductId(product._id);
    setProductEditForm({
      category_id: product.category_id?._id || product.category_id || '',
      name: product.name,
      price: String(product.price),
      description: product.description || '',
      priority_order: String(product.priority_order || 1)
    });
    setProductEditImages([]);
  };

  const handleQrUpload = async (e) => {
    e.preventDefault(); if (!qrFile) return; setIsUploading(true);
    try {
      const formData = new FormData(); formData.append('file', qrFile); formData.append('upload_preset', UPLOAD_PRESET);
      const cloudRes = await axios.post(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, formData);
      const publicUrl = cloudRes.data.secure_url;
      await axios.post(`${API_BASE_URL}/api/admin/settings`, { qr_code_url: publicUrl });
      setQrCodeUrl(publicUrl); setQrFile(null); alert("Master retail payment switch context rewritten smoothly!");
    } catch (err) { alert("Error saving payment configuration."); } finally { setIsUploading(false); }
  };

  const handleDeleteCategory = async (id) => { if (window.confirm("Purging this category will un-link its sub-products. Proceed?")) { await axios.delete(`${API_BASE_URL}/api/admin/categories/${id}`); fetchCategories(); fetchProducts(); } };
  const handleDeleteProduct = async (id) => { if (window.confirm("Permanently strip this product definition from conversational catalog?")) { await axios.delete(`${API_BASE_URL}/api/admin/products/${id}`); fetchProducts(); } };

  const processedChats = chats
    .filter(c => c._id.includes(searchPhone))
    .sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans antialiased relative">
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between p-4 sticky top-0 h-screen shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center space-x-3 px-2 py-3 border-b border-slate-100">
            <Layers className="h-6 w-6 text-amber-500" />
            <span className="font-bold text-lg bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">SmartCRM Board</span>
          </div>
          <nav className="space-y-1">
            <button onClick={() => setActiveTab('crm')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${activeTab === 'crm' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Users className="h-4 w-4" /> <span>CRM Lead Ledger</span>
            </button>
            <button onClick={() => setActiveTab('chats')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${activeTab === 'chats' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-50'}`}>
              <MessageSquare className="h-4 w-4" /> <span>WhatsApp Terminal</span>
            </button>
            <button onClick={() => setActiveTab('categories')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${activeTab === 'categories' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-50'}`}>
              <FolderPlus className="h-4 w-4" /> <span>Sector Catalog Names</span>
            </button>
            <button onClick={() => setActiveTab('products')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${activeTab === 'products' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-50'}`}>
              <PackagePlus className="h-4 w-4" /> <span>Product Variations</span>
            </button>
            <button onClick={() => setActiveTab('qr')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all duration-150 ${activeTab === 'qr' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-600 hover:bg-slate-50'}`}>
              <QrCode className="h-4 w-4" /> <span>Update Store QR Code</span>
            </button>
          </nav>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium">Auto TTL: 10 Days Active</p>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto max-w-7xl mx-auto w-full">
        
        {activeTab === 'crm' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">CRM Automated Ledger</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time repository capturing verified buyer conversions and delivery maps.</p>
            </div>
            <div className="bg-white border border-slate-200/60 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200/60">
                    <th className="p-4">Customer Phone Link</th>
                    <th className="p-4">Timestamp (IST)</th>
                    <th className="p-4">Verified Shipping Address</th>
                    <th className="p-4">Status Ledger Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {orders.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No logs captured within active data retention rules yet.</td></tr>
                  ) : (
                    orders.map(o => (
                      <tr key={o._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-mono text-amber-600 flex items-center gap-2 font-medium"><Smartphone className="h-4 w-4 text-slate-400"/> +{o.phone_number}</td>
                        <td className="p-4 text-slate-500">{new Date(o.timestamp).toLocaleString()}</td>
                        <td className="p-4 text-slate-700 max-w-xs truncate font-medium flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                          <span>{o.shipping_address || <span className="text-slate-400 italic font-normal">Waiting for address entry text...</span>}</span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center w-fit gap-1 border ${o.status.includes('FALLBACK') ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            <CheckCircle className="h-3.5 w-3.5"/> {o.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="space-y-6 h-[82vh] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">WhatsApp Client Core Terminal</h1>
                <p className="text-sm text-slate-500 mt-1">Review sessions running over the past week and execute manual overrides.</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="text" placeholder="Search number..." className="bg-white text-xs px-4 py-2 rounded-xl border border-slate-200 text-slate-700 focus:outline-none focus:border-amber-500 w-44 shadow-sm" value={searchPhone} onChange={e => setSearchPhone(e.target.value)} />
                <select className="bg-white text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-600 focus:outline-none shadow-sm" value={dateSortOrder} onChange={e => setDateSortOrder(e.target.value)}>
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 overflow-y-auto space-y-2 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">Active Client Pipelines ({processedChats.length})</h3>
                {processedChats.length === 0 ? (
                  <p className="text-xs text-slate-400 p-4 text-center">No active chats found.</p>
                ) : (
                  processedChats.map(chat => (
                    <div key={chat._id} onClick={() => setSelectedChat(chat)} className={`p-3.5 rounded-xl cursor-pointer transition-all border flex flex-col gap-1.5 ${selectedChat?._id === chat._id ? 'bg-amber-500/10 border-amber-400 shadow-sm' : 'bg-white border-slate-150 hover:border-slate-300'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-slate-800">+{chat._id}</span>
                        {chat.is_bot_disabled && <span className="text-[10px] px-2 py-0.5 font-bold rounded bg-orange-100 text-orange-700 border border-orange-200 uppercase">Manual</span>}
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>State: {chat.state}</span>
                        <span>{new Date(chat.timestamp).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="md:col-span-2 bg-white border border-slate-200/60 rounded-2xl flex flex-col overflow-hidden relative shadow-sm">
                {selectedChat ? (
                  <>
                    <div className="p-4 bg-slate-50/80 border-b border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-amber-500" />
                        <span className="font-mono font-bold text-base text-slate-800">+{selectedChat._id}</span>
                      </div>
                      <button onClick={() => toggleBotBypassState(selectedChat._id, selectedChat.is_bot_disabled)} className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1.5 ${selectedChat.is_bot_disabled ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm' : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'}`}>
                        <Bot className="h-3.5 w-3.5" />
                        <span>{selectedChat.is_bot_disabled ? "Re-enable AI Automation" : "Disconnect AI Bot"}</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col bg-slate-50/30">
                      {(!selectedChat.chat_logs || selectedChat.chat_logs.length === 0) ? (
                        <p className="text-xs text-slate-400 italic text-center my-auto">No text messages tracked in this session cluster.</p>
                      ) : (
                        selectedChat.chat_logs.map((log, idx) => (
                          <div key={idx} className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm flex flex-col gap-1 shadow-sm border ${
                            log.sender === 'customer' 
                              ? 'bg-white border-slate-200 mr-auto text-slate-800 rounded-tl-none' 
                              : log.sender === 'admin'
                                ? 'bg-amber-500 border-amber-600 text-white font-medium ml-auto rounded-tr-none'
                                : 'bg-amber-100 border-amber-200 text-amber-900 ml-auto rounded-tr-none'
                          }`}>
                            <div className="flex items-center gap-1 text-[10px] uppercase font-bold opacity-70">
                              {log.sender === 'customer' ? <User className="h-2.5 w-2.5"/> : <Bot className="h-2.5 w-2.5"/>}
                              <span>{log.sender}</span>
                            </div>
                            <p className="leading-relaxed break-words">{log.text}</p>
                            <span className="text-[9px] text-right mt-0.5 opacity-60 block font-mono">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleSendManualText} className="p-3 bg-white border-t border-slate-200/60 flex items-center gap-2">
                      <input type="text" placeholder={selectedChat.is_bot_disabled ? "Type manual response message..." : "⚠️ Disconnect AI bot at top right to send messages..."} disabled={!selectedChat.is_bot_disabled} className="flex-1 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none disabled:opacity-50 text-slate-700" value={manualMessage} onChange={e => setManualMessage(e.target.value)} />
                      <button type="submit" disabled={!selectedChat.is_bot_disabled || !manualMessage.trim()} className="p-2.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors shadow-sm"><Send className="h-4 w-4"/></button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8">
                    <MessageSquare className="h-8 w-8 text-slate-300 animate-pulse" />
                    <p className="text-sm">Select an active client phone number from the sidebar stack.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Primary Sections & Complete Catalog Image Matrix</h1>
              <p className="text-sm text-slate-500 mt-1">Upload customized grid-banners manually to provide frictionless matching operations down the line.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <form onSubmit={handleCategorySubmit} className="bg-white p-6 rounded-2xl border border-slate-200/60 h-fit space-y-4 shadow-sm">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Plus className="text-amber-500"/> Add Primary Sector</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-800" placeholder="e.g., Drones" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Sequence Priority Order</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-800" placeholder="0" value={categoryForm.display_order} onChange={e => setCategoryForm({...categoryForm, display_order: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Upload Complete Catalog Graphic Asset</label>
                  <label className="w-full border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer text-slate-500">
                    <Upload className="h-5 w-5 mb-1 text-slate-400" />
                    <span className="text-xs font-medium">Choose Custom Grid-Image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={e => setCategoryFile(e.target.files[0])} />
                  </label>
                  {categoryFile && <p className="text-xs text-amber-600 mt-1.5 font-medium">✓ File staged: {categoryFile.name}</p>}
                </div>
                <button type="submit" disabled={isUploading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white font-semibold py-2.5 rounded-xl text-sm shadow-md shadow-amber-500/10">{isUploading ? "Uploading Design..." : "Commit Category Deck"}</button>
              </form>

              <div className="md:col-span-2 space-y-3">
                <h3 className="text-lg font-bold text-slate-800">Active Catalog Sections</h3>
                {categories.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-200/60 bg-white text-slate-400 text-sm shadow-sm">No sectors initialized yet.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {categories.map(c => (
                      <div key={c._id} className="bg-white border border-slate-200/60 p-4 rounded-xl flex flex-col shadow-sm hover:border-slate-300 transition-all">
                        {editingCategoryId === c._id ? (
                          <div className="space-y-4 p-2 w-full text-slate-800">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-bold uppercase text-amber-600 tracking-wider flex items-center gap-1"><Edit2 className="h-3 w-3" /> Editing Sector Scope</span>
                              <button onClick={() => setEditingCategoryId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Update Name</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 text-slate-800" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Update Order Placement</label>
                                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 text-slate-800" value={editForm.display_order} onChange={e => setEditForm({...editForm, display_order: e.target.value})} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Replace Catalog Graphic Asset Layout</label>
                              <label className="w-full border border-dashed border-slate-300 bg-slate-50 flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs text-slate-500 hover:bg-slate-100">
                                <Upload className="h-4 w-4 text-slate-400" />
                                <span>{editFile ? editFile.name : "Choose New Banner File"}</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => setEditFile(e.target.files[0])} />
                              </label>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                              <button onClick={() => setEditingCategoryId(null)} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                              <button onClick={() => handleCategoryUpdate(c._id, c.category_image_url)} disabled={isUploading} className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm">{isUploading ? "Saving Changes..." : "Save Updates"}</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-4">
                              {c.category_image_url ? (
                                <div className="relative group cursor-pointer border border-slate-200 rounded-lg overflow-hidden shadow-sm" onClick={() => setActivePreviewImage(c.category_image_url)}>
                                  <img src={c.category_image_url} className="h-14 w-24 object-cover group-hover:opacity-70 transition-opacity" alt="" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                              ) : (
                                <div className="h-14 w-24 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 text-center px-1">NO CUSTOM IMAGE</div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 text-base">{c.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5">Priority Placement: {c.display_order} {c.category_image_url && "• 🖼️ Custom Grid-Banner Set"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {c.category_image_url && (
                                <button onClick={() => setActivePreviewImage(c.category_image_url)} title="Inspect Full Section Graphic Banner" className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"><Eye className="h-4 w-4" /></button>
                              )}
                              <button onClick={() => startEditing(c)} title="Edit Category Setup Structure" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit2 className="h-4 w-4"/></button>
                              <button onClick={() => handleDeleteCategory(c._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4"/></button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nested Product Variations</h1>
              <p className="text-sm text-slate-500 mt-1">Configure serial matching positions cleanly under parent sectors.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <form onSubmit={handleProductSubmit} className="bg-white p-6 rounded-2xl border border-slate-200/60 space-y-4 shadow-sm h-fit">
                <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Plus className="text-amber-500"/> Map Nested Product</h3>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Base Folder Category</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-700" value={productForm.category_id} onChange={e => setProductForm({...productForm, category_id: e.target.value})} required>
                    <option value="">-- Choose Category Base --</option>
                    {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Specific Variant Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-800" placeholder="e.g., DJI Mini 4 Pro" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} required />
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1.5">Serial Matching Number Position Index</label>
                  <input type="number" className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none font-bold text-amber-700 focus:border-amber-500" placeholder="e.g. 1" min="1" value={productForm.priority_order} onChange={e => setProductForm({...productForm, priority_order: e.target.value})} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fixed Price Accounted (₹)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 text-slate-800" placeholder="95000" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Short Spec Description</label>
                  <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 h-20 resize-none text-slate-800" placeholder="4K camera specifications..." value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Upload Product Primary Representation Image</label>
                  <label className="w-full border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer text-slate-500">
                    <Upload className="h-5 w-5 mb-1 text-slate-400" />
                    <span className="text-xs font-medium">Choose File Asset(s)</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={e => setSelectedImages(Array.from(e.target.files))} />
                  </label>
                  {selectedImages.length > 0 && <p className="text-xs text-emerald-600 mt-1.5 font-medium">✓ {selectedImages.length} local file(s) staged for inventory mapping</p>}
                </div>
                <button type="submit" disabled={isUploading} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-amber-500/10">{isUploading ? "Uploading Data Assets..." : "Inject Variant Data"}</button>
              </form>

              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-lg font-bold text-slate-800">Catalog Stream Inventory List</h3>
                {products.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-slate-200/60 bg-white text-slate-400 text-sm shadow-sm">No variations found.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map(p => (
                      <div key={p._id} className="bg-white border border-slate-200/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                        
                        {editingProductId === p._id ? (
                          <div className="space-y-4 w-full text-sm text-slate-800">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-xs font-bold uppercase text-amber-600 tracking-wider flex items-center gap-1"><Edit2 className="h-3 w-3" /> Editing Variant Specifications</span>
                              <button onClick={() => setEditingProductId(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4"/></button>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Parent Section Folder</label>
                              <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-amber-500" value={productEditForm.category_id} onChange={e => setProductEditForm({...productEditForm, category_id: e.target.value})}>
                                <option value="">-- Choose Category Base --</option>
                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Variant Name</label>
                              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 text-slate-800" value={productEditForm.name} onChange={e => setProductEditForm({...productEditForm, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Serial Index Position</label>
                                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 text-slate-800" value={productEditForm.priority_order} onChange={e => setProductEditForm({...productEditForm, priority_order: e.target.value})} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Price (₹)</label>
                                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 text-slate-800" value={productEditForm.price} onChange={e => setProductEditForm({...productEditForm, price: e.target.value})} />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Short Description Specs</label>
                              <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 h-16 resize-none text-slate-800" value={productEditForm.description} onChange={e => setProductEditForm({...productEditForm, description: e.target.value})} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Replace Representation Media</label>
                              <label className="w-full border border-dashed border-slate-300 bg-slate-50 flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs text-slate-500 hover:bg-slate-100">
                                <Upload className="h-4 w-4 text-slate-400" />
                                <span>{productEditImages.length > 0 ? `${productEditImages.length} Local File(s) Staged` : "Choose New File Asset(s)"}</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={e => setProductEditImages(Array.from(e.target.files))} />
                              </label>
                            </div>
                            <div className="flex gap-2 justify-end pt-2">
                              <button type="button" onClick={() => setEditingProductId(null)} className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                              <button type="button" onClick={() => handleProductUpdate(p._id, p.images || [])} disabled={isUploading} className="px-4 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors shadow-sm">{isUploading ? "Saving Specs..." : "Save Product Updates"}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="absolute top-3 right-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-md">
                              Serial: #{p.priority_order || 'N/A'}
                            </div>

                            <div>
                              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                                {p.images?.map((img, idx) => (
                                  <img key={idx} src={img} onClick={() => setActivePreviewImage(img)} className="h-16 w-16 object-cover rounded-lg border border-slate-100 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity shadow-sm" alt="" />
                                ))}
                              </div>
                              <h4 className="font-bold text-slate-800 text-base mt-2 pr-16">{p.name}</h4>
                              <p className="text-xs text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded w-fit mt-1.5 font-medium">Sector: {p.category_id?.name || 'Unassigned'}</p>
                              {p.description && <p className="text-xs text-slate-500 mt-2 line-clamp-2">{p.description}</p>}
                              <p className="text-sm text-emerald-600 font-bold mt-2">Price: ₹{p.price}</p>
                            </div>
                            <div className="flex justify-end pt-3 mt-4 border-t border-slate-100 gap-1">
                              <button onClick={() => startProductEditing(p)} title="Edit Product Setup Structure" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><Edit2 className="h-4 w-4"/></button>
                              <button onClick={() => handleDeleteProduct(p._id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 className="h-4 w-4"/></button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Update Retail Payment QR Code</h1>
            </div>
            <div className="bg-white border border-slate-200/60 p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50/50 border border-slate-200">
                <div className="bg-white p-3 rounded-xl border border-slate-200 h-36 w-36 flex items-center justify-center shadow-inner">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} className="h-full w-full object-contain cursor-pointer" onClick={() => setActivePreviewImage(qrCodeUrl)} alt="Store QR" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1 text-center sm:text-left">
                  <p className="text-sm font-bold text-slate-800">Active Validation Canvas</p>
                  {qrCodeUrl && <a href={qrCodeUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline font-medium pt-1">Open Canvas Link <ArrowUpRight className="h-3 w-3"/></a>}
                </div>
              </div>

              <form onSubmit={handleQrUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Drop Fresh QR Graphic Document File</label>
                  <label className="w-full border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer text-slate-500">
                    <Upload className="h-6 w-6 mb-1 text-slate-400" />
                    <span className="text-xs font-medium">Select Image Target</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setQrFile(e.target.files[0])} />
                  </label>
                  {qrFile && <p className="text-xs text-emerald-600 mt-1.5 font-medium">✓ Staged file asset: {qrFile.name}</p>}
                </div>
                <button type="submit" disabled={isUploading || !qrFile} className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 font-semibold py-3 rounded-xl text-sm text-white transition-colors shadow-md shadow-amber-500/10">{isUploading ? "Uploading Graphic..." : "Commit Payment Vector Rewrite"}</button>
              </form>
            </div>
          </div>
        )}

      </main>

      {activePreviewImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4" onClick={() => setActivePreviewImage(null)}>
          <div className="max-w-4xl max-h-[85vh] bg-white p-2 rounded-2xl border border-slate-200 shadow-xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img src={activePreviewImage} className="w-full h-auto max-h-[75vh] object-contain rounded-xl shadow-sm" alt="Visual Preview Layout" />
            <button onClick={() => setActivePreviewImage(null)} className="mt-4 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl transition-all shadow-md shadow-amber-500/10">Close Complete View</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;