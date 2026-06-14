"use client";

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Plus, Edit3, Trash2, Search, Scale, Settings, ChevronDown, Grid, List, AlertCircle } from 'lucide-react';
import { Button, Card, Badge, Table, Input, Select, EmptyState } from '@/components/ui';

interface InventoryItem {
  id: string;
  sku?: string;
  name: string;
  category: string;
  subcategory?: string;
  isConsumable: boolean;
  uom: { purchaseUnit: string; consumptionUnit: string; factor: number };
}

const PURCHASE_UNITS = ['Box', 'Case', 'Crate', 'Carton', 'Sack', 'Drum', 'Bottle', 'Packet', 'Bundle', 'Dozen'];
const CONSUMPTION_UNITS = ['Piece', 'Unit', 'Kg', 'Gram', 'Litre', 'ml', 'Meter', 'Pair', 'Sheet', 'Roll'];

function UomDropdown({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingCustom(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => { setOpen(!open); setSearch(''); setAddingCustom(false); }}
          className="w-full flex items-center justify-between h-11 px-4 bg-white border border-slate-200 rounded-[10px] text-sm text-slate-900 focus:border-brand focus:outline-none transition-all cursor-pointer"
        >
          <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>{value || `Select ${label}`}</span>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-slate-250 rounded-[10px] shadow-xl max-h-56 overflow-hidden">
            <div className="p-2 border-b border-slate-100">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand"
                autoFocus
              />
            </div>

            <ul className="max-h-36 overflow-y-auto">
              {filtered.map(opt => (
                <li
                  key={opt}
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`px-4 py-2 text-xs cursor-pointer font-medium transition-colors ${
                    value === opt
                      ? 'bg-brand text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt}
                </li>
              ))}
              {filtered.length === 0 && !addingCustom && (
                <li className="px-4 py-2 text-xs text-slate-400">No match found</li>
              )}
            </ul>

            <div className="border-t border-slate-100 p-2 bg-slate-50/50">
              {addingCustom ? (
                <div className="flex space-x-1.5">
                  <input
                    type="text"
                    placeholder="Custom unit..."
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customValue.trim()) {
                        onChange(customValue.trim());
                        setCustomValue('');
                        setAddingCustom(false);
                        setOpen(false);
                      }
                    }}
                    className="flex-grow px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand"
                    autoFocus
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      if (customValue.trim()) {
                        onChange(customValue.trim());
                        setCustomValue('');
                        setAddingCustom(false);
                        setOpen(false);
                      }
                    }}
                    className="h-8 px-3 rounded-lg text-xs"
                  >
                    Add
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingCustom(true)}
                  className="w-full flex items-center space-x-1.5 px-2 py-1.5 text-xs text-brand hover:text-brand-hover hover:bg-white rounded-lg transition-all cursor-pointer font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Unit</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Catalog() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('F&B');
  const [subcategory, setSubcategory] = useState('');
  const [isConsumable, setIsConsumable] = useState(true);
  const [purchaseUnit, setPurchaseUnit] = useState('');
  const [consumptionUnit, setConsumptionUnit] = useState('');
  const [factor, setFactor] = useState(1);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/api/items');
      setItems(res.data);
    } catch (err) { console.error('Fetch items error', err); }
    finally { setLoading(false); }
  };

  const handleOpenAdd = () => {
    setEditingId(null); setName(''); setSku(''); setCategory('F&B');
    setSubcategory(''); setIsConsumable(true);
    setPurchaseUnit(''); setConsumptionUnit(''); setFactor(1);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingId(item.id); setName(item.name); setSku(item.sku || '');
    setCategory(item.category); setSubcategory(item.subcategory || '');
    setIsConsumable(item.isConsumable);
    setPurchaseUnit(item.uom.purchaseUnit);
    setConsumptionUnit(item.uom.consumptionUnit);
    setFactor(item.uom.factor);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseUnit || !consumptionUnit) {
      alert('Please select both a Purchase Unit and a Consumption Unit.');
      return;
    }
    const payload = {
      name, sku, category, subcategory, isConsumable,
      uom: { purchaseUnit, consumptionUnit, factor: Number(factor) }
    };
    try {
      if (editingId) {
        await api.put(`/api/items/${editingId}`, payload);
      } else {
        await api.post('/api/items', payload);
      }
      setModalOpen(false); fetchItems();
    } catch (err) {
      console.error('Save item error', err);
      alert('Failed to save item.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item and all its stock records?')) return;
    try {
      await api.delete(`/api/items/${id}`);
      fetchItems();
    } catch (err) { console.error('Delete item error', err); }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(search.toLowerCase())) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Title & Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Master Catalog</h1>
          <p className="text-slate-500 text-sm mt-1">Define every product stocked across your hotel operations.</p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" className="shadow-md">
          <Plus className="w-5 h-5 mr-2" />
          <span>Add New Product</span>
        </Button>
      </div>

      {/* Filter and View Toggles Bar */}
      <Card className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search box */}
          <div className="relative flex-grow max-w-sm">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search catalog items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-11 bg-slate-50 border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-[10px] text-slate-900 text-sm focus:outline-none transition-all placeholder-slate-400"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-48">
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'F&B', label: 'F&B (Kitchen/Bar)' },
                { value: 'Housekeeping', label: 'Housekeeping' },
                { value: 'Maintenance', label: 'Maintenance' },
                { value: 'Stationery', label: 'Stationery' }
              ]}
            />
          </div>
        </div>

        {/* List / Grid Toggle */}
        <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50/50 self-start md:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              viewMode === 'list' ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-all cursor-pointer ${
              viewMode === 'grid' ? 'bg-white text-brand shadow-sm' : 'text-slate-400 hover:text-slate-700'
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Main Grid/List Content */}
      {loading ? (
        <div className="text-center py-12 text-slate-500 font-medium">Loading catalog items...</div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No Catalog Items Found"
          description={
            search || filterCategory !== 'ALL'
              ? "We couldn't find any items matching your active search or filters. Try adjusting them."
              : "Your master hotel catalog is currently empty. Get started by creating your first master product."
          }
          icon={<AlertCircle className="w-12 h-12 text-slate-300" />}
          actionText={search || filterCategory !== 'ALL' ? undefined : "Add First Product"}
          onAction={search || filterCategory !== 'ALL' ? undefined : handleOpenAdd}
        />
      ) : viewMode === 'list' ? (
        <Table headers={['Product Item', 'Category', 'SKU / Barcode', 'Purchase Unit', 'Consumption Unit', 'Conversion Ratio', 'Actions']}>
          {filteredItems.map(item => (
            <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
              <td className="py-4 px-6 font-semibold text-slate-900">{item.name}</td>
              <td className="py-4 px-6">
                <Badge status={item.category} />
              </td>
              <td className="py-4 px-6 font-mono text-xs text-slate-500">{item.sku || 'N/A'}</td>
              <td className="py-4 px-6 text-slate-600 font-medium">{item.uom.purchaseUnit}</td>
              <td className="py-4 px-6 text-slate-600 font-medium">{item.uom.consumptionUnit}</td>
              <td className="py-4 px-6 font-mono text-xs text-brand font-bold bg-indigo-50/40 px-2.5 py-1.5 rounded-md w-fit">
                1 {item.uom.purchaseUnit} = {item.uom.factor} {item.uom.consumptionUnit}
              </td>
              <td className="py-4 px-6">
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleOpenEdit(item)}
                    variant="secondary"
                    className="h-9 px-3 rounded-lg text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(item.id)}
                    variant="danger"
                    className="h-9 px-3 rounded-lg text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <Card key={item.id} className="flex flex-col justify-between hover:border-slate-300 transition-all duration-150">
              <Card.Header className="pb-2">
                <Badge status={item.category} />
                <div className="flex space-x-1.5">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-2 hover:bg-slate-100 text-slate-500 hover:text-brand rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-slate-100 text-slate-500 hover:text-danger rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card.Header>
              <Card.Content className="pt-2">
                <h3 className="font-bold text-slate-900 text-lg mb-1 leading-snug">{item.name}</h3>
                {item.sku && <span className="text-slate-500 text-xs font-mono">SKU: {item.sku}</span>}
                <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs font-medium text-slate-500">
                  <div className="flex justify-between">
                    <span className="flex items-center space-x-1"><Scale className="w-3.5 h-3.5" /><span>Buy Unit:</span></span>
                    <span className="text-slate-800 font-bold">{item.uom.purchaseUnit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center space-x-1"><Settings className="w-3.5 h-3.5" /><span>Consumption:</span></span>
                    <span className="text-slate-800 font-bold">{item.uom.consumptionUnit}</span>
                  </div>
                </div>
              </Card.Content>
              <Card.Footer className="text-center font-mono font-bold text-brand bg-slate-50/70 py-2.5">
                1 {item.uom.purchaseUnit} = {item.uom.factor} {item.uom.consumptionUnit}
              </Card.Footer>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900">
            <h3 className="text-2xl font-bold text-slate-900 mb-6">
              {editingId ? 'Edit Product Parameters' : 'Register New Master Product'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Product Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Basmati Rice Sack"
                />
                <Input
                  label="SKU / Barcode"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., SKU-1234"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: 'F&B', label: 'F&B (Kitchen/Bar)' },
                      { value: 'Housekeeping', label: 'Housekeeping' },
                      { value: 'Maintenance', label: 'Maintenance' },
                      { value: 'Stationery', label: 'Stationery' }
                    ]}
                  />
                </div>
                <Input
                  label="Subcategory"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g., Grains, Linen"
                />
              </div>

              <hr className="border-slate-100 my-2" />
              <h4 className="text-xs font-bold text-brand uppercase tracking-widest mb-3">Unit Conversion Specifications</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UomDropdown label="Buy Unit" options={PURCHASE_UNITS} value={purchaseUnit} onChange={setPurchaseUnit} />
                <UomDropdown label="Use Unit" options={CONSUMPTION_UNITS} value={consumptionUnit} onChange={setConsumptionUnit} />
                <Input
                  label="Ratio (Qty in Buy Unit)"
                  type="number"
                  required
                  min={0.01}
                  step="any"
                  value={factor}
                  onChange={(e) => setFactor(Number(e.target.value))}
                />
              </div>

              {purchaseUnit && consumptionUnit && factor > 0 && (
                <div className="px-4 py-3 bg-brand/5 border border-brand/10 rounded-xl text-center text-sm text-brand font-semibold font-mono">
                  1 {purchaseUnit} = {factor} {consumptionUnit}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
                <Button type="button" onClick={() => setModalOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingId ? 'Save Configuration' : 'Add to Catalog'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
