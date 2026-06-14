"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Box, Plus, Settings2, ShieldAlert, Trash2, Package, Search, ChevronRight, X } from 'lucide-react';
import { Button, Card, Badge, Table, Input, EmptyState } from '@/components/ui';

interface Store { id: string; name: string; }

interface StockItem {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  sku?: string;
  quantity: number;
  minStockLevel: number;
  avgCostPrice: number;
  purchaseUnit: string;
  consumptionUnit: string;
  factor: number;
}

interface AvailableItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
  consumptionUnit: string;
}

export default function Stores() {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [storeName, setStoreName] = useState('');
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);

  // "Add Item to Store" modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<AvailableItem[]>([]);
  const [availableSearch, setAvailableSearch] = useState('');
  const [selectedAvailableItem, setSelectedAvailableItem] = useState<AvailableItem | null>(null);
  const [initQty, setInitQty] = useState<number | string>('');
  const [initMin, setInitMin] = useState<number | string>('');
  const [initCost, setInitCost] = useState<number | string>('');

  // "Adjust Stock" modal state
  const [adjustingItem, setAdjustingItem] = useState<StockItem | null>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustMin, setAdjustMin] = useState(0);
  const [adjustCost, setAdjustCost] = useState(0);

  useEffect(() => { fetchStores(); }, []);

  const fetchStores = async () => {
    try {
      const res = await api.get('/api/stores');
      setStores(res.data);
      if (res.data.length > 0 && !selectedStore) setSelectedStore(res.data[0]);
    } catch (err) { console.error(err); }
    finally { setLoadingStores(false); }
  };

  useEffect(() => {
    if (selectedStore) fetchStock(selectedStore.id);
  }, [selectedStore]);

  const fetchStock = async (storeId: string) => {
    setLoadingStock(true);
    try {
      const res = await api.get(`/api/stores/${storeId}/stock`);
      setStockList(res.data);
    } catch (err) { console.error(err); }
    finally { setLoadingStock(false); }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;
    try {
      const res = await api.post('/api/stores', { name: storeName.trim() });
      setStoreName('');
      fetchStores();
      setSelectedStore(res.data);
    } catch (err) { console.error(err); }
  };

  const openAddItemModal = async () => {
    if (!selectedStore) return;
    try {
      const res = await api.get(`/api/stores/${selectedStore.id}/available-items`);
      setAvailableItems(res.data);
      setSelectedAvailableItem(null);
      setAvailableSearch('');
      setInitQty(''); setInitMin(''); setInitCost('');
      setAddModalOpen(true);
    } catch (err) { console.error(err); }
  };

  const handleAddItemToStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStore || !selectedAvailableItem) return;
    if (initQty === '' || initMin === '' || initCost === '') {
      alert('Please fill in all fields: Opening Stock, Min Alert Level, and Cost Per Unit.');
      return;
    }
    try {
      await api.post(`/api/stores/${selectedStore.id}/items`, {
        itemId: selectedAvailableItem.id,
        quantity: Number(initQty),
        minStockLevel: Number(initMin),
        avgCostPrice: Number(initCost)
      });
      setAddModalOpen(false);
      fetchStock(selectedStore.id);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to add item.');
    }
  };

  const handleOpenAdjust = (item: StockItem) => {
    setAdjustingItem(item);
    setAdjustQty(item.quantity);
    setAdjustMin(item.minStockLevel);
    setAdjustCost(item.avgCostPrice);
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    try {
      await api.put(`/api/stores/stock/${adjustingItem.id}`, {
        quantity: Number(adjustQty),
        minStockLevel: Number(adjustMin),
        avgCostPrice: Number(adjustCost)
      });
      setAdjustingItem(null);
      if (selectedStore) fetchStock(selectedStore.id);
    } catch (err) { console.error(err); }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!selectedStore) return;
    if (!confirm('Remove this product from the store permanently? (Will wipe stock record)')) return;
    try {
      await api.delete(`/api/stores/${selectedStore.id}/items/${itemId}`);
      fetchStock(selectedStore.id);
    } catch (err) { console.error(err); }
  };

  const filteredAvailable = availableItems.filter(item =>
    item.name.toLowerCase().includes(availableSearch.toLowerCase()) ||
    item.category.toLowerCase().includes(availableSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stores & Stock Levels</h1>
          <p className="text-slate-500 text-sm mt-1">Manage physical warehouses, product stock maps, and thresholds.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Side: Store Selection and Create Store */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
              <Box className="w-4 h-4 text-brand" />
              <span>Store Locations</span>
            </h3>

            {loadingStores && stores.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs font-semibold">Syncing store list...</div>
            ) : (
              <div className="space-y-1 mb-6">
                {stores.map(store => {
                  const isSelected = selectedStore?.id === store.id;
                  return (
                    <button
                      key={store.id}
                      onClick={() => setSelectedStore(store)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all group cursor-pointer ${
                        isSelected
                          ? 'bg-brand/10 border-brand text-brand font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <span className="text-xs truncate font-semibold">{store.name}</span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${
                        isSelected ? 'text-brand translate-x-0.5' : 'group-hover:translate-x-0.5'
                      }`} />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Create Store Form */}
            <form onSubmit={handleCreateStore} className="border-t border-slate-100 pt-4 space-y-3">
              <Input
                label="New Store Name"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g., Main Kitchen"
                className="h-10"
              />
              <Button type="submit" variant="secondary" className="w-full h-10">
                <Plus className="w-4 h-4 mr-2" /> Add Location
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Side: Stock Worksheet Table */}
        <div className="lg:col-span-3">
          {selectedStore ? (
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 mb-5 gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Stock Sheet: {selectedStore.name}</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-1">
                    Manage parameters, costs, and alert thresholds for items linked to this store.
                  </p>
                </div>
                <Button onClick={openAddItemModal} variant="primary" className="shadow-md">
                  <Plus className="w-4 h-4 mr-2" /> Link Product Item
                </Button>
              </div>

              {loadingStock ? (
                <div className="text-center py-12 text-slate-500 font-medium">Syncing store items...</div>
              ) : stockList.length === 0 ? (
                <EmptyState
                  title="No Products Linked"
                  description="Products must be mapped to this store from the master catalog before logging stock levels."
                  icon={<Package className="w-12 h-12 text-slate-300" />}
                  actionText="Link First Product"
                  onAction={openAddItemModal}
                />
              ) : (
                <Table headers={['Product Name', 'Category', 'SKU ID', 'In Stock Qty', 'Min Safety Level', 'Book WAC Price', 'Actions']}>
                  {stockList.map(item => {
                    const isLow = item.quantity <= item.minStockLevel;
                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/70 transition-colors ${isLow ? 'bg-red-50/30' : ''}`}>
                        <td className="py-4 px-6">
                          <span className="font-bold text-slate-900 text-sm block">{item.itemName}</span>
                          {isLow && (
                            <span className="inline-flex items-center text-[10px] font-bold text-red-600 mt-1 bg-red-100 px-1.5 py-0.5 rounded">
                              <ShieldAlert className="w-3 h-3 mr-1" /> Low Stock
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <Badge status={item.category} />
                        </td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-500">{item.sku || 'N/A'}</td>
                        <td className={`py-4 px-6 font-bold ${isLow ? 'text-red-600' : 'text-slate-900'}`}>
                          {item.quantity} {item.consumptionUnit}
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-600">{item.minStockLevel} {item.consumptionUnit}</td>
                        <td className="py-4 px-6 font-mono font-bold text-slate-700">₹{item.avgCostPrice.toFixed(2)}</td>
                        <td className="py-4 px-6">
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => handleOpenAdjust(item)}
                              variant="secondary"
                              className="h-9 px-3 rounded-lg text-xs"
                            >
                              <Settings2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              onClick={() => handleRemoveItem(item.itemId)}
                              variant="danger"
                              className="h-9 px-3 rounded-lg text-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              )}
            </Card>
          ) : (
            <div className="text-center py-12 text-slate-500 font-medium">Select a store from the sidebar to inspect items.</div>
          )}
        </div>
      </div>

      {/* ─── LINK PRODUCT ITEM MODAL ──────────────────────────────────── */}
      {addModalOpen && selectedStore && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Link Product to {selectedStore.name}</h3>
              <button onClick={() => setAddModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItemToStore} className="space-y-4">
              <div className="relative mb-2">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Filter available products..."
                  value={availableSearch}
                  onChange={(e) => setAvailableSearch(e.target.value)}
                  className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 focus:border-brand rounded-[10px] text-slate-900 text-sm focus:outline-none placeholder-slate-400"
                />
              </div>

              {/* Scrollable List */}
              <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2 bg-slate-50/50 space-y-1.5">
                {filteredAvailable.map(item => {
                  const isSelected = selectedAvailableItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedAvailableItem(item)}
                      className={`p-2.5 rounded-lg border cursor-pointer text-xs font-semibold transition-colors flex justify-between items-center ${
                        isSelected
                          ? 'bg-brand/10 border-brand text-brand'
                          : 'bg-white border-slate-200 hover:border-slate-350 text-slate-700'
                      }`}
                    >
                      <span>{item.name}</span>
                      <Badge status={item.category} className="scale-90" />
                    </div>
                  );
                })}
                {filteredAvailable.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No unlinked catalog items found.</p>
                )}
              </div>

              {selectedAvailableItem && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <Input
                    label={`Opening Stock (${selectedAvailableItem.consumptionUnit})`}
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={initQty}
                    onChange={(e) => setInitQty(e.target.value)}
                  />
                  <Input
                    label={`Min Alert Level (${selectedAvailableItem.consumptionUnit})`}
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={initMin}
                    onChange={(e) => setInitMin(e.target.value)}
                  />
                  <Input
                    label="WAC Unit Cost (INR)"
                    type="number"
                    required
                    min={0}
                    step="any"
                    value={initCost}
                    onChange={(e) => setInitCost(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <Button type="button" onClick={() => setAddModalOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={!selectedAvailableItem}>
                  Map Item to Store
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── ADJUST PARAMETERS MODAL ──────────────────────────────────── */}
      {adjustingItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Adjust parameters</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Item: {adjustingItem.itemName}</p>
              </div>
              <button onClick={() => setAdjustingItem(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjust} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label={`Physical Stock (${adjustingItem.consumptionUnit})`}
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                />
                <Input
                  label={`Min Safety Qty (${adjustingItem.consumptionUnit})`}
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={adjustMin}
                  onChange={(e) => setAdjustMin(Number(e.target.value))}
                />
                <Input
                  label="Average WAC Cost (INR)"
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={adjustCost}
                  onChange={(e) => setAdjustCost(Number(e.target.value))}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <Button type="button" onClick={() => setAdjustingItem(null)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Commit Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
