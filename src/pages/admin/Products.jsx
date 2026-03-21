import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Plus, Trash2, Edit2, Package, Search } from 'lucide-react';
import LoaderScreen from '../../components/LoaderScreen';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category: '', image: '' });
  const [editingId, setEditingId] = useState(null);
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('All');

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
      category: product.category,
      image: product.image
    });
    setEditingId(product.id);
    setIsCreatingNewCategory(!existingCategories.includes(product.category));
    setImageFile(null);
    setShowAddForm(true);
  };

  const resetForm = () => {
    setShowAddForm(false);
    setNewProduct({ name: '', price: '', category: existingCategories[0] || '', image: '' });
    setImageFile(null);
    setEditingId(null);
    setIsCreatingNewCategory(existingCategories.length === 0);
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
        category: newProduct.category || 'Uncategorized',
        image: imageUrl || `https://placehold.co/400x300?text=${encodeURIComponent(newProduct.name)}`
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Manage Products</h1>
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-colors font-medium cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>{showAddForm ? 'Cancel' : 'Add Product'}</span>
        </button>
      </div>

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
        <form onSubmit={handleAddProduct} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <input 
                type="text" required
                value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g. Momo"
              />
            </div>
            <div className="w-full md:w-32 space-y-1">
              <label className="text-sm font-medium text-gray-700">Price ($) *</label>
              <input 
                type="number" step="0.01" required
                value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-gray-700">Category</label>
              {!isCreatingNewCategory && existingCategories.length > 0 ? (
                <div className="flex items-center space-x-2">
                  <select
                    value={newProduct.category}
                    onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  >
                    {existingCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => { setIsCreatingNewCategory(true); setNewProduct({...newProduct, category: ''}); }}
                    className="shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-bold transition-colors text-sm"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Snacks"
                  />
                  {existingCategories.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => { setIsCreatingNewCategory(false); setNewProduct({...newProduct, category: existingCategories[0]}); }}
                      className="shrink-0 text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-bold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end mt-2">
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-gray-700">Image URL (Optional)</label>
              <input 
                type="url"
                value={newProduct.image} onChange={e => setNewProduct({...newProduct, image: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://..."
                disabled={!!imageFile}
              />
            </div>
            <div className="flex items-center text-sm text-gray-500 pb-2">OR</div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-sm font-medium text-gray-700">Upload Image</label>
              <input 
                type="file" accept="image/*"
                onChange={handleImageFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 pb-1"
                disabled={!!newProduct.image}
              />
            </div>
            <button type="submit" disabled={uploading} className="w-full md:w-auto bg-gray-900 text-white px-6 py-2.5 flex items-center justify-center rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-70">
              {uploading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : (editingId ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <LoaderScreen message="Loading Products..." />
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No products found. Add your first product!</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products
                .filter(p => {
                  const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchesCategory = selectedFilterCategory === 'All' || p.category === selectedFilterCategory;
                  return matchesSearch && matchesCategory;
                })
                .map(product => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${Number(product.price).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-full transition-colors">
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
