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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-950">Manage Products</h1>
          <p className="text-sm font-medium text-gray-500 mt-1">Manage your restaurant menu items and pricing.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button 
            onClick={handleDownloadTemplate}
            className="flex-1 md:flex-none border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Template</span>
          </button>
          
          <label className="flex-1 md:flex-none border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-bold text-sm cursor-pointer">
            <FileUp className="w-4 h-4" />
            <span>Bulk Upload</span>
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
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all font-black"
          >
            <Plus className="w-5 h-5" />
            <span>{showAddForm ? 'Cancel' : 'Add Product'}</span>
          </button>
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
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-96 shrink-0">
            <input 
              type="text" 
              placeholder="Search products..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
            <div className="absolute left-3 top-3 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex overflow-x-auto pb-1 gap-2 w-full hide-scrollbar">
            <button
              onClick={() => setSelectedFilterCategory('All')}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                selectedFilterCategory === 'All' 
                  ? 'bg-gray-900 text-white shadow-sm' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {existingCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedFilterCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedFilterCategory === cat 
                    ? 'bg-gray-900 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-6 animate-in zoom-in-95 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-black text-gray-950 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-blue-600" /> Name *
              </label>
              <input 
                type="text" required
                value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-800"
                placeholder="e.g. Steam Momo"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-black text-gray-950 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-blue-600" /> Base Price *
              </label>
              <input 
                type="number" step="0.01" required
                value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-gray-800"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-gray-950 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Availability
              </label>
              <div className="flex bg-gray-100 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewProduct({...newProduct, inStock: true})}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center space-x-2 ${
                    newProduct.inStock ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>In Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNewProduct({...newProduct, inStock: false})}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center space-x-2 ${
                    !newProduct.inStock ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Out of Stock</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-gray-950 flex items-center gap-1.5">
                <HistoryIcon className="w-4 h-4 text-purple-600" /> Discount Type
              </label>
              <div className="flex bg-gray-100 p-1.5 rounded-xl">
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
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-black uppercase transition-all ${
                      discountType === type ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {type === 'none' ? 'None' : type === 'percent' ? '%' : 'Rs.'}
                  </button>
                ))}
              </div>
            </div>

            {discountType !== 'none' && (
              <div className="space-y-1.5">
                <label className="text-sm font-black text-gray-950">Discount Value</label>
                <div className="flex items-center gap-2">
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
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                    />
                  </div>
                  {newProduct.discountPrice && (
                    <div className="bg-green-50 text-green-700 px-3 py-2 rounded-xl border border-green-100 font-black text-[10px] whitespace-nowrap">
                      Net: Rs.{newProduct.discountPrice}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-black text-gray-950">Category</label>
              {!isCreatingNewCategory && existingCategories.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <select
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-gray-800"
                  >
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setIsCreatingNewCategory(true); setNewProduct({...newProduct, category: ''}); }}
                    className="shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider"
                  >
                    + New
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <input 
                    type="text" required
                    value={newProduct.category} 
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                    placeholder="e.g. Snacks"
                  />
                  {existingCategories.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => { setIsCreatingNewCategory(false); setNewProduct({...newProduct, category: existingCategories[0]}); }}
                      className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-black text-xs transition-all uppercase tracking-wider"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-black text-gray-950">Image Source</label>
              <div className="flex gap-2">
                <input 
                  type="url"
                  value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-sm"
                  placeholder="Image URL"
                  disabled={!!imageFile}
                />
                <label className={`shrink-0 cursor-pointer px-4 py-2.5 rounded-xl border-2 border-dashed transition-all flex items-center gap-2 ${imageFile ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-blue-300'}`}>
                  <FileUp className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">{imageFile ? 'Selected' : 'File'}</span>
                  <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" disabled={!!newProduct.image} />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-50">
            <button 
              type="submit" 
              disabled={uploading} 
              className="w-full md:w-auto bg-gray-900 text-white px-10 py-3.5 flex items-center justify-center rounded-2xl font-black hover:bg-black transition-all active:scale-[0.98] disabled:opacity-70 shadow-lg shadow-gray-200"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  <span>{editingId ? 'Update Product' : 'Save Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoaderScreen message="Loading Products..." type="minimal" />
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No products found. Add your first product!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Pricing</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {products
                    .filter(p => {
                      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesCategory = selectedFilterCategory === 'All' || p.category === selectedFilterCategory;
                      return matchesSearch && matchesCategory;
                    })
                    .map(product => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden shrink-0 border border-gray-100 group-hover:scale-105 transition-transform">
                              <img src={product.image} alt="" className="w-full h-full object-cover" />
                            </div>
                            <span className="font-black text-gray-950">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-black uppercase tracking-tight">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.discountPrice ? (
                            <div className="flex flex-col">
                              <span className="text-green-600 font-black">Rs. {Number(product.discountPrice).toFixed(0)}</span>
                              <span className="text-gray-400 text-[10px] font-bold line-through">Rs. {Number(product.price).toFixed(0)}</span>
                            </div>
                          ) : (
                            <span className="text-gray-950 font-black">Rs. {Number(product.price).toFixed(0)}</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                            product.outOfStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                          }`}>
                            {product.outOfStock ? 'Missing' : 'In Stock'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-white p-2 hover:bg-blue-600 rounded-xl transition-all active:scale-95">
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-white p-2 hover:bg-red-500 rounded-xl transition-all active:scale-95">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card Grid */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {products
              .filter(p => {
                const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                const matchesCategory = selectedFilterCategory === 'All' || p.category === selectedFilterCategory;
                return matchesSearch && matchesCategory;
              })
              .map(product => (
                <div key={product.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden shrink-0">
                      <img src={product.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-black text-gray-950 truncate">{product.name}</h3>
                        <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                          product.outOfStock ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
                        }`}>
                          {product.outOfStock ? 'Out' : 'In'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{product.category}</span>
                        <span className="text-gray-300">•</span>
                        {product.discountPrice ? (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600 font-black">Rs.{Number(product.discountPrice).toFixed(0)}</span>
                            <span className="text-gray-400 text-[10px] font-bold line-through">Rs.{Number(product.price).toFixed(0)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-950 font-black">Rs.{Number(product.price).toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50">
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className="flex items-center justify-center space-x-2 bg-blue-50 text-blue-600 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="flex items-center justify-center space-x-2 bg-red-50 text-red-600 py-2.5 rounded-xl font-black text-sm active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
