import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { PackageX, PackageCheck, Search, AlertTriangle } from 'lucide-react';

export default function KitchenStock() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(data.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const toggleStock = async (product) => {
    setUpdating(product.id);
    try {
      await updateDoc(doc(db, 'products', product.id), {
        outOfStock: !product.outOfStock
      });
    } catch (e) {
      console.error(e);
      alert('Failed to update stock status.');
    } finally {
      setUpdating(null);
    }
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const outOfStockCount = products.filter(p => p.outOfStock).length;

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-orange-600 rounded-full border-b-transparent" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap gap-4 justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <PackageX className="w-7 h-7 text-orange-600" />
            Stock Manager
          </h1>
          <p className="text-gray-500 font-medium mt-0.5 text-sm">Mark items that are out of stock — they'll be hidden in POS & Menu.</p>
        </div>
        {outOfStockCount > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {outOfStockCount} item{outOfStockCount > 1 ? 's' : ''} out of stock
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400 shadow-sm"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-medium">No products found</div>
        )}
        {filtered.map(product => (
          <div
            key={product.id}
            className={`flex items-center gap-4 bg-white rounded-2xl p-4 border shadow-sm transition-all ${
              product.outOfStock ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
            }`}
          >
            {product.image ? (
              <img src={product.image} alt={product.name} className={`w-14 h-14 rounded-xl object-cover shrink-0 ${product.outOfStock ? 'opacity-40 grayscale' : ''}`} />
            ) : (
              <div className={`w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 ${product.outOfStock ? 'opacity-40' : ''}`}>
                <span className="text-2xl">🍽️</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-bold truncate ${product.outOfStock ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{product.name}</p>
              <p className="text-xs text-gray-500 font-medium">{product.category || 'Uncategorized'} · Rs. {product.price}</p>
            </div>
            <button
              onClick={() => toggleStock(product)}
              disabled={updating === product.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shrink-0 ${
                product.outOfStock
                  ? 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-200'
                  : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-200'
              } disabled:opacity-50`}
            >
              {updating === product.id ? (
                <div className="w-4 h-4 border-2 border-current rounded-full border-b-transparent animate-spin" />
              ) : product.outOfStock ? (
                <><PackageCheck className="w-4 h-4" /><span>Mark In Stock</span></>
              ) : (
                <><PackageX className="w-4 h-4" /><span>Mark Out of Stock</span></>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
