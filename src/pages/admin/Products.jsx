import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Trash2, Edit2, Package, Search, Download, FileUp, CheckCircle2, AlertCircle, Tag, History as HistoryIcon } from 'lucide-react';
import LoaderScreen from '../../components/LoaderScreen';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', discountPrice: '', category: '', image: '', inStock: true });
  const [editingId, setEditingId] = useState(null);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('All');
  const [discountType, setDiscountType] = useState('none'); // 'none', 'percent', 'flat'
  const [discountValue, setDiscountValue] = useState('');
  const [bulkError, setBulkError] = useState(null);
  const [bulkSuccess, setBulkSuccess] = useState(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Derive existing categories from products array
  const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleEditProduct = (product) => {
    setNewProduct({
      name: product.name,
      price: product.price.toString(),
      discountPrice: product.discountPrice ? product.discountPrice.toString() : '',
      category: product.category,
      image: product.image
    });
    setEditingId(product.id);
    setIsCreatingNewCategory(!existingCategories.includes(product.category));
    setImageFile(null);
    setNewProduct(prev => ({ ...prev, inStock: !product.outOfStock }));
    if (product.discountPrice) {
      setDiscountType('flat');
      setDiscountValue( (product.price - product.discountPrice).toString() );
    } else {
      setDiscountType('none');
      setDiscountValue('');
    }
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setNewProduct({ name: '', price: '', discountPrice: '', category: existingCategories[0] || '', image: '', inStock: true });
    setImageFile(null);
    setEditingId(null);
    setIsCreatingNewCategory(existingCategories.length === 0);
    setDiscountType('none');
    setDiscountValue('');
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;
    setUploading(true);

    try {
      let imageUrl = newProduct.image;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const res = await fetch('https://api.imgbb.com/1/upload?key=0e887e356028dfa76c96867759b68981', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (data && data.data && data.data.url) {
          imageUrl = data.data.url;
        }
      }

      const productData = {
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        discountPrice: newProduct.discountPrice ? parseFloat(newProduct.discountPrice) : null,
        category: newProduct.category || 'Uncategorized',
        image: imageUrl || `https://placehold.co/400x300?text=${encodeURIComponent(newProduct.name)}`,
        outOfStock: !newProduct.inStock
      };

      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
      } else {
        await addDoc(collection(db, 'products'), productData);
      }
      
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      alert("Failed to save product");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Failed to delete product");
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['name', 'price', 'category', 'discount_type', 'discount_value', 'image', 'in_stock'];
    const sampleRow = ['Sample Momo', '200', 'Snacks', 'percent', '10', 'https://placehold.co/400x300', 'true'];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'menu_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsBulkProcessing(true);
    setBulkError(null);
    setBulkSuccess(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        if (lines.length < 2) throw new Error("File is empty or missing data rows.");

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['name', 'price', 'category'];
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) throw new Error(`Missing required columns: ${missing.join(', ')}`);

          const newItems = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const item = {};
          headers.forEach((header, index) => {
            item[header] = values[index];
          });

          if (!item.name || !item.price || !item.category) continue;

          const basePrice = parseFloat(item.price) || 0;
          let calculatedDiscountPrice = null;

          if (item.discount_type === 'percent' && item.discount_value) {
            calculatedDiscountPrice = basePrice * (1 - parseFloat(item.discount_value) / 100);
          } else if (item.discount_type === 'flat' && item.discount_value) {
            calculatedDiscountPrice = basePrice - parseFloat(item.discount_value);
          }

          newItems.push({
            name: item.name,
            price: basePrice,
            category: item.category,
            discountPrice: calculatedDiscountPrice,
            image: item.image || `https://placehold.co/400x300?text=${encodeURIComponent(item.name)}`,
            outOfStock: item.in_stock === 'false'
          });
        }

        if (newItems.length === 0) throw new Error("No valid items found in CSV.");

        const batchPromises = newItems.map(item => addDoc(collection(db, 'products'), item));
        await Promise.all(batchPromises);

        setBulkSuccess(`Successfully uploaded ${newItems.length} items!`);
        fetchProducts();
      } catch (err) {
        console.error("Bulk upload error:", err);
        setBulkError(err.message);
      } finally {
        setIsBulkProcessing(false);
        e.target.value = ''; // Reset file input
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Premium Header */}
      <div className="relative overflow-hidden bg-white rounded-4xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-6 md:p-10">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 bg-blue-50/30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-5 py-2 rounded-2xl text-xs font-black uppercase tracking-widest mb-4">
              <Package className="w-4 h-4" />
              <span>Menu Management</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none mb-2">Manage Products</h1>
            <p className="text-gray-400 font-medium">Add, edit, and manage your restaurant menu items and pricing.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Template</span>
            </button>
            <label className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer">
              <FileUp className="w-4 h-4" />
              <span>Bulk CSV</span>
              <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" disabled={isBulkProcessing} />
            </label>
            <button
              onClick={() => {
                if (showAddForm && !editingId) {
                  resetForm();
                } else {
                  resetForm();
                  if (existingCategories.length > 0) {
                    setNewProduct(prev => ({...prev, category: existingCategories[0]}));
                    setIsCreatingNewCategory(false);
                  } else {
                    setIsCreatingNewCategory(true);
                  }
                  setShowAddForm(true);
                }
              }}
              className="flex items-center gap-2 bg-gray-950 hover:bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? 'Cancel' : 'Add Product'}</span>
            </button>
          </div>
        </div>
      </div>

      {(bulkError || bulkSuccess || isBulkProcessing) && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          bulkError ? 'bg-red-50 border-red-100 text-red-800' : 
          bulkSuccess ? 'bg-green-50 border-green-100 text-green-800' : 
          'bg-blue-50 border-blue-100 text-blue-800'
        }`}>
          {isBulkProcessing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
          ) : bulkError ? (
            <AlertCircle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          )}
          <p className="text-sm font-bold">
            {isBulkProcessing ? 'Processing bulk upload... please wait.' : bulkError || bulkSuccess}
          </p>
          {(bulkError || bulkSuccess) && (
            <button onClick={() => { setBulkError(null); setBulkSuccess(null); }} className="ml-auto p-1 hover:bg-black/5 rounded-lg transition-colors">
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          )}
        </div>
      )}

      {/* Search and Filters */}
      {!showAddForm && products.length > 0 && (
        <div className="bg-white p-4 md:p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-300 outline-none font-bold text-sm transition-all"
            />
          </div>
          <div className="flex overflow-x-auto gap-2 w-full hide-scrollbar flex-nowrap">
            <button
              onClick={() => setSelectedFilterCategory('All')}
              className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all shrink-0 uppercase tracking-widest ${
                selectedFilterCategory === 'All'
                  ? 'bg-gray-950 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {existingCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedFilterCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all shrink-0 uppercase tracking-widest ${
                  selectedFilterCategory === cat
                    ? 'bg-gray-950 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-950">{editingId ? 'Edit Product' : 'Add New Product'}</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-0.5">Enter item details and pricing</p>
              </div>
              <button 
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="flex-1 overflow-y-auto p-8 space-y-8 hide-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-950 flex items-center gap-2 px-1">
                    <Tag className="w-4 h-4 text-blue-600" /> Name *
                  </label>
                  <input 
                    type="text" required
                    value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                    placeholder="e.g. Steam Momo"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-950 flex items-center gap-2 px-1">
                    <Package className="w-4 h-4 text-blue-600" /> Base Price *
                  </label>
                  <input 
                    type="number" step="0.01" required
                    value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-950 flex items-center gap-2 px-1">
                    <AlertCircle className="w-4 h-4 text-orange-500" /> Availability
                  </label>
                  <div className="flex bg-gray-100 p-2 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setNewProduct({...newProduct, inStock: true})}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center space-x-2 ${
                        newProduct.inStock ? 'bg-white shadow-md text-green-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>In Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProduct({...newProduct, inStock: false})}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center space-x-2 ${
                        !newProduct.inStock ? 'bg-white shadow-md text-red-600' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span>Out Stock</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-950 flex items-center gap-2 px-1">
                    <HistoryIcon className="w-4 h-4 text-purple-600" /> Discount Type
                  </label>
                  <div className="flex bg-gray-100 p-2 rounded-2xl">
                    {['none', 'percent', 'flat'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setDiscountType(type);
                          if (type === 'none') {
                            setDiscountValue('');
                            setNewProduct({...newProduct, discountPrice: ''});
                          }
                        }}
                        className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-black uppercase transition-all ${
                          discountType === type ? 'bg-white shadow-md text-blue-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {type === 'none' ? 'None' : type === 'percent' ? '%' : 'Rs.'}
                      </button>
                    ))}
                  </div>
                </div>

                {discountType !== 'none' && (
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-950 px-1">Discount Value</label>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={discountValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDiscountValue(val);
                            const price = parseFloat(newProduct.price) || 0;
                            if (discountType === 'percent') {
                              const dp = price * (1 - (parseFloat(val) || 0) / 100);
                              setNewProduct({...newProduct, discountPrice: dp > 0 ? dp.toFixed(0) : '0'});
                            } else {
                              const dp = price - (parseFloat(val) || 0);
                              setNewProduct({...newProduct, discountPrice: dp > 0 ? dp.toFixed(0) : '0'});
                            }
                          }}
                          placeholder={discountType === 'percent' ? '% Off' : 'Flat Off'}
                          className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-sm"
                        />
                      </div>
                      {newProduct.discountPrice && (
                        <div className="bg-green-50 text-green-700 px-4 py-3 rounded-2xl border border-green-100 font-black text-xs whitespace-nowrap shadow-sm">
                          Net: Rs.{newProduct.discountPrice}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-950 px-1">Category</label>
                  {!isCreatingNewCategory && existingCategories.length > 0 ? (
                    <div className="flex items-center space-x-3">
                      <select
                        value={newProduct.category}
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-gray-800"
                      >
                        {existingCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => { setIsCreatingNewCategory(true); setNewProduct({...newProduct, category: ''}); }}
                        className="shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-600 px-5 py-3.5 rounded-2xl font-black text-xs transition-all uppercase tracking-widest"
                      >
                        + New
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <input 
                        type="text" required
                        value={newProduct.category} 
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold placeholder:text-gray-300"
                        placeholder="e.g. Snacks"
                      />
                      {existingCategories.length > 0 && (
                        <button 
                          type="button" 
                          onClick={() => { setIsCreatingNewCategory(false); setNewProduct({...newProduct, category: existingCategories[0]}); }}
                          className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3.5 rounded-2xl font-black text-xs transition-all uppercase tracking-widest"
                        >
                          Back
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                  <label className="text-sm font-black text-gray-950 px-1">Item Image Source</label>
                  <div className="flex flex-col md:flex-row gap-4">
                    <input 
                      type="url"
                      value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                      className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-sm"
                      placeholder="Paste image URL here..."
                      disabled={!!imageFile}
                    />
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-black text-gray-400 uppercase">Or</span>
                      <label className={`shrink-0 cursor-pointer px-6 py-3.5 rounded-2xl border-2 border-dashed transition-all flex items-center gap-3 ${imageFile ? 'bg-blue-50 border-blue-400 text-blue-600' : 'bg-gray-50 border-gray-300 text-gray-500 hover:border-blue-500 hover:bg-blue-50/10'}`}>
                        <FileUp className="w-5 h-5 transition-transform group-hover:-translate-y-1" />
                        <span className="text-sm font-black uppercase tracking-wider">{imageFile ? 'Selected' : 'Upload File'}</span>
                        <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" disabled={!!newProduct.image} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-8 sticky bottom-0 bg-white/80 backdrop-blur-md">
                <button 
                  type="submit" 
                  disabled={uploading} 
                  className="w-full md:w-auto bg-gray-950 text-white px-12 py-4 flex items-center justify-center rounded-[1.25rem] font-black hover:bg-blue-600 transition-all active:scale-[0.98] disabled:opacity-70 shadow-2xl shadow-blue-200/50"
                >
                  {uploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-3" />
                      <span>{editingId ? 'Confirm Changes' : 'Create Product'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <LoaderScreen message="Loading Products..." type="minimal" />
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-4xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-4xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-10 h-10 text-gray-200" />
          </div>
          <p className="font-black text-gray-300 text-xl mb-2">No products yet</p>
          <p className="text-gray-300 font-medium text-sm">Click "Add Product" to create your first menu item.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const filtered = products.filter(p => {
              const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesCategory = selectedFilterCategory === 'All' || p.category === selectedFilterCategory;
              return matchesSearch && matchesCategory;
            });
            const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
            const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            return (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-4xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing</th>
                          <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map(product => (
                          <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-all group">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-100 group-hover:scale-105 transition-transform duration-300 shadow-sm">
                                  <img src={product.image} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="font-black text-gray-950">{product.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-3 py-1.5 bg-gray-100 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">{product.category}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {product.discountPrice ? (
                                <div className="flex flex-col">
                                  <span className="text-emerald-600 font-black">Rs. {Number(product.discountPrice).toFixed(0)}</span>
                                  <span className="text-gray-300 text-[10px] font-bold line-through">Rs. {Number(product.price).toFixed(0)}</span>
                                </div>
                              ) : (
                                <span className="text-gray-950 font-black">Rs. {Number(product.price).toFixed(0)}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${product.outOfStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {product.outOfStock ? 'Out of Stock' : 'In Stock'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                              <button onClick={() => handleEditProduct(product)} className="text-blue-500 hover:text-white p-2.5 hover:bg-blue-600 rounded-2xl transition-all active:scale-95"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteProduct(product.id)} className="text-red-400 hover:text-white p-2.5 hover:bg-red-500 rounded-2xl transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile Cards */}
                <div className="grid grid-cols-1 gap-4 md:hidden">
                  {paginated.map(product => (
                    <div key={product.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden shrink-0"><img src={product.image} alt="" className="w-full h-full object-cover" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-black text-gray-950 truncate">{product.name}</h3>
                            <span className={`shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${product.outOfStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{product.outOfStock ? 'Out' : 'In'}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{product.category}</span>
                            {product.discountPrice ? (
                              <><span className="text-emerald-600 font-black text-sm ml-1">Rs.{Number(product.discountPrice).toFixed(0)}</span><span className="text-gray-300 text-[10px] line-through">Rs.{Number(product.price).toFixed(0)}</span></>
                            ) : (<span className="text-gray-950 font-black text-sm ml-1">Rs.{Number(product.price).toFixed(0)}</span>)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                        <button onClick={() => handleEditProduct(product)} className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"><Edit2 className="w-3.5 h-3.5" /><span>Edit</span></button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"><Trash2 className="w-3.5 h-3.5" /><span>Delete</span></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col md:flex-row items-center justify-between bg-white rounded-3xl border border-gray-100 shadow-sm p-4 gap-3">
                    <p className="text-xs font-bold text-gray-400">
                      Showing <span className="font-black text-gray-700">{(currentPage-1)*ITEMS_PER_PAGE+1}–{Math.min(currentPage*ITEMS_PER_PAGE, filtered.length)}</span> of <span className="font-black text-gray-700">{filtered.length}</span> products
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <button onClick={() => setCurrentPage(p => Math.max(1,p-1))} disabled={currentPage===1} className="px-4 py-2 rounded-2xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-all active:scale-95">← Prev</button>
                      {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>p===1||p===totalPages||Math.abs(p-currentPage)<=1).reduce((acc,p,idx,arr)=>{if(idx>0&&arr[idx-1]!==p-1)acc.push('...');acc.push(p);return acc;},[]).map((p,idx)=>p==='...'?<span key={`d${idx}`} className="px-2 text-gray-300 font-black">…</span>:<button key={p} onClick={()=>setCurrentPage(p)} className={`w-9 h-9 rounded-2xl text-xs font-black transition-all active:scale-95 ${currentPage===p?'bg-gray-950 text-white shadow-md':'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}>{p}</button>)}
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="px-4 py-2 rounded-2xl text-xs font-black bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 transition-all active:scale-95">Next →</button>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
