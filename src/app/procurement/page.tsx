"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  ShoppingCart,
  Plus,
  Search,
  Truck,
  FileText,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building
} from 'lucide-react';
import { Button, Card, Badge, Table, Input, Select, Tabs, EmptyState } from '@/components/ui';

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  address?: string;
}

interface Store {
  id: string;
  name: string;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  uom: { purchaseUnit: string; consumptionUnit: string; factor: number };
}

interface POItem {
  id: string;
  itemId: string;
  item: CatalogItem;
  purchaseUnit: string;
  orderQty: number;
  unitPrice: number;
  receivedQty: number;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendorId: string;
  vendor: Vendor;
  storeId: string;
  store: Store;
  status: string;
  totalAmount: number;
  createdById: string;
  createdBy: { name: string; role: string };
  approvedById?: string;
  approvedBy?: { name: string };
  items: POItem[];
  createdAt: string;
}

interface GRNItem {
  id: string;
  itemId: string;
  item: CatalogItem;
  receivedQty: number;
  rejectedQty: number;
  unitPrice: number;
  remarks?: string;
}

interface GoodsReceivedNote {
  id: string;
  grnNumber: string;
  poId: string;
  po: PurchaseOrder;
  receivedById: string;
  receivedBy: { name: string };
  receivedDate: string;
  items: GRNItem[];
  createdAt: string;
}

interface LowStockAlert {
  id: string;
  itemId: string;
  itemName: string;
  category: string;
  storeId: string;
  storeName: string;
  currentStock: number;
  minStockLevel: number;
  consumptionUnit: string;
  purchaseUnit: string;
  factor: number;
  suggestedQty: number;
  lastUnitPrice: number;
  lastVendor: { id: string; name: string } | null;
}

export default function Procurement() {
  const [activeTab, setActiveTab] = useState('alerts');
  
  // Data States
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [grns, setGrns] = useState<GoodsReceivedNote[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  
  // Settings State
  const [settings, setSettings] = useState({ deptManagerLimit: 25000, genManagerLimit: 100000 });
  const [editDeptLimit, setEditDeptLimit] = useState<number | string>('');
  const [editGenLimit, setEditGenLimit] = useState<number | string>('');

  // Loading States
  const [loading, setLoading] = useState(true);

  // Modals & Forms State
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [newVendor, setNewVendor] = useState({ name: '', email: '', phone: '', gstin: '', address: '' });

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [newPo, setNewPo] = useState({ vendorId: '', storeId: '', status: 'PENDING_APPROVAL' });
  const [poLines, setPoLines] = useState<{ itemId: string; orderQty: number; unitPrice: number }[]>([]);
  const [selectedItemToAdd, setSelectedItemToAdd] = useState('');
  const [qtyToAdd, setQtyToAdd] = useState<number | string>('');
  const [priceToAdd, setPriceToAdd] = useState<number | string>('');
  const [selectedPoDetails, setSelectedPoDetails] = useState<PurchaseOrder | null>(null);

  const [grnModalOpen, setGrnModalOpen] = useState(false);
  const [grnSelectorModalOpen, setGrnSelectorModalOpen] = useState(false);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState<PurchaseOrder | null>(null);
  const [grnItemsState, setGrnItemsState] = useState<{ itemId: string; receivedQty: number; rejectedQty: number; remarks: string }[]>([]);

  // Search filters
  const [vendorSearch, setVendorSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');

  // Local storage user session details
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const [allowedItems, setAllowedItems] = useState<CatalogItem[]>([]);

  // Fetch allowed items when Destination Store changes
  useEffect(() => {
    if (newPo.storeId) {
      fetchAllowedItems(newPo.storeId);
    } else {
      setAllowedItems([]);
    }
  }, [newPo.storeId]);

  const fetchAllowedItems = async (storeId: string) => {
    try {
      const res = await api.get(`/api/stores/${storeId}/stock`);
      const stockItemIds = new Set(res.data.map((s: any) => s.itemId));
      const filtered = catalogItems.filter(item => stockItemIds.has(item.id));
      setAllowedItems(filtered);
    } catch (err) {
      console.error('Failed to fetch store stock for PO allowed items:', err);
      setAllowedItems([]);
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [vendorsRes, posRes, grnsRes, alertsRes, catalogRes, storesRes, settingsRes] = await Promise.all([
        api.get('/api/procurement/vendors'),
        api.get('/api/procurement/pos'),
        api.get('/api/procurement/grns'),
        api.get('/api/procurement/low-stock'),
        api.get('/api/items'),
        api.get('/api/stores'),
        api.get('/api/procurement/settings')
      ]);

      setVendors(vendorsRes.data);
      setPos(posRes.data);
      setGrns(grnsRes.data);
      setAlerts(alertsRes.data);
      setCatalogItems(catalogRes.data);
      setStores(storesRes.data);
      setSettings(settingsRes.data);
      setEditDeptLimit(settingsRes.data.deptManagerLimit);
      setEditGenLimit(settingsRes.data.genManagerLimit);
    } catch (err) {
      console.error('Error fetching procurement data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPO = (alertItem: LowStockAlert) => {
    setNewPo({
      vendorId: alertItem.lastVendor?.id || '',
      storeId: alertItem.storeId,
      status: 'PENDING_APPROVAL'
    });
    setPoLines([
      {
        itemId: alertItem.itemId,
        orderQty: alertItem.suggestedQty,
        unitPrice: alertItem.lastUnitPrice || 0
      }
    ]);
    setSelectedItemToAdd('');
    setQtyToAdd('');
    setPriceToAdd('');
    setPoModalOpen(true);
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendor.name.trim()) return;

    try {
      const res = await api.post('/api/procurement/vendors', newVendor);
      setVendors(prev => [...prev, res.data]);
      setVendorModalOpen(false);
      setNewVendor({ name: '', email: '', phone: '', gstin: '', address: '' });
    } catch (err) {
      console.error(err);
      alert('Failed to save vendor');
    }
  };

  const handleAddLineItem = () => {
    if (!selectedItemToAdd || !qtyToAdd || Number(qtyToAdd) <= 0 || !priceToAdd || Number(priceToAdd) < 0) {
      alert('Please select item and enter valid quantities/prices.');
      return;
    }

    const exists = poLines.some(line => line.itemId === selectedItemToAdd);
    if (exists) {
      alert('Item is already added to the PO. Edit or remove it.');
      return;
    }

    setPoLines(prev => [
      ...prev,
      {
        itemId: selectedItemToAdd,
        orderQty: Number(qtyToAdd),
        unitPrice: Number(priceToAdd)
      }
    ]);

    setSelectedItemToAdd('');
    setQtyToAdd('');
    setPriceToAdd('');
  };

  const handleRemoveLineItem = (index: number) => {
    setPoLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPo.vendorId || !newPo.storeId) {
      alert('Vendor and Store are required');
      return;
    }
    if (poLines.length === 0) {
      alert('Add at least one line item');
      return;
    }

    try {
      const payload = {
        vendorId: newPo.vendorId,
        storeId: newPo.storeId,
        status: newPo.status,
        items: poLines
      };

      await api.post('/api/procurement/pos', payload);
      setPoModalOpen(false);
      setPoLines([]);
      setNewPo({ vendorId: '', storeId: '', status: 'PENDING_APPROVAL' });
      fetchInitialData();
      alert('Purchase Order created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create PO');
    }
  };

  const handleApprovePO = async (poId: string) => {
    if (!confirm('Approve this Purchase Order?')) return;
    try {
      await api.post(`/api/procurement/pos/${poId}/approve`, {});
      alert('Purchase Order approved!');
      setSelectedPoDetails(null);
      fetchInitialData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to approve PO');
    }
  };

  const openGrnWizard = (po: PurchaseOrder) => {
    setSelectedPoForGrn(po);
    setGrnItemsState(
      po.items.map(item => ({
        itemId: item.itemId,
        receivedQty: item.orderQty - item.receivedQty,
        rejectedQty: 0,
        remarks: ''
      }))
    );
    setGrnModalOpen(true);
  };

  const handleGrnItemQtyChange = (itemId: string, field: 'receivedQty' | 'rejectedQty' | 'remarks', value: any) => {
    setGrnItemsState(prev =>
      prev.map(i => {
        if (i.itemId === itemId) {
          return {
            ...i,
            [field]: field === 'remarks' ? value : Number(value)
          };
        }
        return i;
      })
    );
  };

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoForGrn) return;

    try {
      const payload = {
        poId: selectedPoForGrn.id,
        items: grnItemsState.map(gi => {
          const poLine = selectedPoForGrn.items.find(pi => pi.itemId === gi.itemId);
          return {
            itemId: gi.itemId,
            receivedQty: gi.receivedQty,
            rejectedQty: gi.rejectedQty,
            unitPrice: poLine?.unitPrice || 0,
            remarks: gi.remarks
          };
        })
      };

      await api.post('/api/procurement/grns', payload);
      setGrnModalOpen(false);
      setSelectedPoForGrn(null);
      fetchInitialData();
      alert('Goods Receipt Note filed and inventory balance updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create Goods Receipt Note');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(
        '/api/procurement/settings',
        {
          deptManagerLimit: Number(editDeptLimit),
          genManagerLimit: Number(editGenLimit)
        }
      );
      setSettings(prev => ({
        ...prev,
        deptManagerLimit: Number(editDeptLimit),
        genManagerLimit: Number(editGenLimit)
      }));
      alert('Approval tier thresholds updated!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to save settings');
    }
  };

  const canApprove = (po: PurchaseOrder) => {
    if (!user) return false;
    const role = user.role;
    if (role === 'HOTEL_OWNER' || role === 'SUPER_ADMIN') return true;
    if (role === 'GENERAL_MANAGER' && po.totalAmount <= settings.genManagerLimit) return true;
    if (role === 'DEPARTMENT_MANAGER' && po.totalAmount <= settings.deptManagerLimit) return true;
    return false;
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.email && v.email.toLowerCase().includes(vendorSearch.toLowerCase())) ||
    (v.phone && v.phone.includes(vendorSearch))
  );

  const filteredPOs = pos.filter(po =>
    po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.vendor.name.toLowerCase().includes(poSearch.toLowerCase()) ||
    po.store.name.toLowerCase().includes(poSearch.toLowerCase())
  );

  // Metrics
  const pendingApprovals = pos.filter(p => p.status === 'PENDING_APPROVAL').length;
  const openPOs = pos.filter(p => p.status === 'APPROVED' || p.status === 'PARTIALLY_RECEIVED').length;
  const awaitingReceipt = alerts.length;
  const totalSpend = pos
    .filter(p => p.status === 'COMPLETED' || p.status === 'APPROVED')
    .reduce((sum, po) => sum + po.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Procurement Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Operational command center for supply requests, vendors, and receipts.</p>
        </div>
        <div className="flex items-center space-x-3 self-start sm:self-auto">
          {activeTab === 'vendors' && (
            <Button onClick={() => setVendorModalOpen(true)} variant="primary" className="shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Add Vendor
            </Button>
          )}
          {activeTab === 'pos' && (
            <Button onClick={() => { setPoLines([]); setPoModalOpen(true); }} variant="primary" className="shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Create PO
            </Button>
          )}
          {activeTab === 'grns' && (
            <Button onClick={() => setGrnSelectorModalOpen(true)} variant="primary" className="shadow-md">
              <Truck className="w-4 h-4 mr-2" /> Receive Goods
            </Button>
          )}
        </div>
      </div>

      {/* ─── DASHBOARD METRICS ROW ────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pending Approvals</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{pendingApprovals}</span>
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">Needs Review</span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Open PO Orders</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{openPOs}</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">Sent / Active</span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Low Stock Items</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{awaitingReceipt}</span>
            <span className="text-xs bg-red-100 text-red-805 px-2 py-0.5 rounded font-bold">Priority alerts</span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Procurement Spend</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-extrabold text-slate-900">₹{totalSpend.toLocaleString('en-IN')}</span>
            <span className="text-xs text-slate-500 font-medium">Approved / Active</span>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'alerts', label: 'Low Stock Alerts', count: alerts.length },
          { id: 'pos', label: 'Purchase Orders (PO)' },
          { id: 'grns', label: 'Goods Received (GRN)' },
          { id: 'vendors', label: 'Vendors' },
          { id: 'settings', label: 'Approval Settings' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ─── TAB: LOW STOCK ALERTS ────────────────────────────────────── */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-medium">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <EmptyState
              title="All stock levels healthy!"
              description="No inventory items are currently below minimum safety thresholds. Great operational discipline!"
              icon={<CheckCircle2 className="w-12 h-12 text-green-500" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map(alert => (
                <Card key={alert.id} className="flex flex-col justify-between hover:border-red-300 hover:shadow-lg transition-all duration-200">
                  <Card.Header className="pb-2">
                    <Badge status="LOW STOCK" />
                    <span className="text-xs text-slate-500 font-mono font-bold uppercase">{alert.storeName}</span>
                  </Card.Header>
                  <Card.Content className="pt-2">
                    <h3 className="font-bold text-slate-900 text-lg mb-1 leading-snug">{alert.itemName}</h3>
                    <p className="text-xs text-slate-500 mb-4">{alert.category}</p>

                    <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 mb-4 text-xs font-semibold">
                      <div>
                        <span className="text-slate-500 block">Current Stock</span>
                        <span className="text-red-600 text-sm font-bold">{alert.currentStock} {alert.consumptionUnit}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Min Threshold</span>
                        <span className="text-slate-800 text-sm">{alert.minStockLevel} {alert.consumptionUnit}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-650 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-medium">
                      <div className="flex justify-between">
                        <span>Rec. Purchase:</span>
                        <span className="font-bold text-slate-900">{alert.suggestedQty} {alert.purchaseUnit}</span>
                      </div>
                      {alert.lastVendor && (
                        <div className="flex justify-between">
                          <span>Primary Supplier:</span>
                          <span className="text-brand font-semibold">{alert.lastVendor.name}</span>
                        </div>
                      )}
                      {alert.lastUnitPrice > 0 && (
                        <div className="flex justify-between">
                          <span>Last Unit Rate:</span>
                          <span className="font-mono text-slate-800 font-semibold">₹{alert.lastUnitPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </Card.Content>
                  <Card.Actions>
                    <Button onClick={() => handleQuickPO(alert)} variant="primary" className="w-full">
                      <ShoppingCart className="w-4 h-4 mr-2" /> Generate PO
                    </Button>
                  </Card.Actions>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PURCHASE ORDERS (POs) ────────────────────────────────── */}
      {activeTab === 'pos' && (
        <div className="space-y-6">
          <Card className="p-4 flex items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search POs by number, vendor, store..."
                value={poSearch}
                onChange={(e) => setPoSearch(e.target.value)}
                className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 focus:border-brand rounded-[10px] text-slate-900 text-sm focus:outline-none placeholder-slate-400 transition-all"
              />
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-12 text-slate-500 font-medium">Loading purchase orders...</div>
          ) : filteredPOs.length === 0 ? (
            <EmptyState
              title="No Purchase Orders Yet"
              description="Create a draft purchase order to request stock replenishment from suppliers."
              icon={<FileText className="w-12 h-12 text-slate-300" />}
              actionText="Create Purchase Order"
              onAction={() => { setPoLines([]); setPoModalOpen(true); }}
            />
          ) : (
            <Table headers={['PO Number', 'Vendor', 'Destination Store', 'Total Amount', 'Status', 'Created By', 'Actions']}>
              {filteredPOs.map(po => (
                <tr key={po.id} className="hover:bg-slate-50/70 transition-all">
                  <td className="py-4 px-6 font-bold text-slate-900">{po.poNumber}</td>
                  <td className="py-4 px-6 font-semibold text-slate-800">{po.vendor.name}</td>
                  <td className="py-4 px-6 text-slate-600 font-medium">{po.store.name}</td>
                  <td className="py-4 px-6 font-mono text-brand font-bold">
                    ₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-4 px-6">
                    <Badge status={po.status} />
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-semibold text-slate-900 text-xs">{po.createdBy?.name || 'Staff'}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">
                      {po.createdBy?.role.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <Button onClick={() => setSelectedPoDetails(po)} variant="secondary" className="h-9 px-3 rounded-lg text-xs">
                        View
                      </Button>
                      {(po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED') && (
                        <Button onClick={() => openGrnWizard(po)} variant="primary" className="h-9 px-3 rounded-lg text-xs bg-teal-650 bg-teal-600 hover:bg-teal-700">
                          Receive
                        </Button>
                      )}
                      {po.status === 'PENDING_APPROVAL' && canApprove(po) && (
                        <Button onClick={() => handleApprovePO(po.id)} variant="primary" className="h-9 px-3 rounded-lg text-xs bg-emerald-650 bg-emerald-600 hover:bg-emerald-700">
                          Approve
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* ─── TAB: GOODS RECEIVED NOTES (GRNs) ───────────────────────────── */}
      {activeTab === 'grns' && (
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-12 text-slate-500 font-medium">Loading receipt records...</div>
          ) : grns.length === 0 ? (
            <EmptyState
              title="No Goods Receipts Found"
              description="Receipt records (GRN) are registered automatically when goods are received from purchase orders."
              icon={<Truck className="w-12 h-12 text-slate-300" />}
            />
          ) : (
            <div className="space-y-4">
              {grns.map(grn => (
                <Card key={grn.id} className="p-6 border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <span className="font-bold text-slate-900 text-lg">{grn.grnNumber}</span>
                        <Badge status="COMPLETED" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-semibold">
                        Linked PO: <span className="font-bold text-slate-800">{grn.po.poNumber}</span> &bull; Vendor: <span className="font-bold text-slate-800">{grn.po.vendor.name}</span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 font-semibold text-right">
                      <div>Received: <span className="text-slate-800">{grn.receivedBy?.name}</span></div>
                      <div className="mt-1">Date: <span className="text-slate-800 font-mono">{new Date(grn.createdAt).toLocaleDateString()}</span></div>
                    </div>
                  </div>
                  <Table headers={['Product Item', 'Qty Received', 'Qty Rejected', 'Unit Cost (PO)', 'Remarks']}>
                    {grn.items.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-6 font-semibold text-slate-900">{item.item.name}</td>
                        <td className="py-2.5 px-6 text-slate-800 font-bold">{item.receivedQty}</td>
                        <td className="py-2.5 px-6 text-red-600 font-bold">{item.rejectedQty}</td>
                        <td className="py-2.5 px-6 font-mono text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-6 text-slate-500">{item.remarks || 'None'}</td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: VENDORS DIRECTORY ────────────────────────────────────── */}
      {activeTab === 'vendors' && (
        <div className="space-y-6">
          <Card className="p-4 flex items-center justify-between gap-4">
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search vendors by name, GSTIN, phone..."
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 focus:border-brand rounded-[10px] text-slate-900 text-sm focus:outline-none placeholder-slate-400 transition-all"
              />
            </div>
          </Card>

          {loading ? (
            <div className="text-center py-12 text-slate-500 font-medium">Loading vendor list...</div>
          ) : filteredVendors.length === 0 ? (
            <EmptyState
              title="No Vendors Found"
              description="Register vendor contacts to link them to purchase orders and catalog supplies."
              icon={<Building className="w-12 h-12 text-slate-350" />}
              actionText="Add First Vendor"
              onAction={() => setVendorModalOpen(true)}
            />
          ) : (
            <Table headers={['Vendor Name', 'Email Address', 'GSTIN ID', 'Phone / Contact', 'Address Details']}>
              {filteredVendors.map(vendor => (
                <tr key={vendor.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{vendor.name}</td>
                  <td className="py-4 px-6 text-slate-600 font-semibold">{vendor.email || 'N/A'}</td>
                  <td className="py-4 px-6 font-mono text-slate-700 font-semibold">{vendor.gstin || 'N/A'}</td>
                  <td className="py-4 px-6 text-slate-500 font-medium">{vendor.phone || 'N/A'}</td>
                  <td className="py-4 px-6 text-slate-500 truncate max-w-xs">{vendor.address || 'N/A'}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* ─── TAB: SETTINGS ─────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <Card className="max-w-xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Approval Threshold Policies</h2>
          <p className="text-slate-500 text-sm mb-6">Configure maximum PO values managers are permitted to approve. Higher amounts escalate to Hotel Owners.</p>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <Input
              label="Dept Head Limit (INR)"
              type="number"
              required
              value={editDeptLimit}
              onChange={(e) => setEditDeptLimit(e.target.value)}
            />
            <Input
              label="General Manager Limit (INR)"
              type="number"
              required
              value={editGenLimit}
              onChange={(e) => setEditGenLimit(e.target.value)}
            />
            <Button type="submit" variant="primary" className="shadow-md">
              Save Threshold Rules
            </Button>
          </form>
        </Card>
      )}

      {/* ─── PO DETAILS MODAL ─────────────────────────────────────────── */}
      {selectedPoDetails && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Purchase Order: {selectedPoDetails.poNumber}</h3>
                <p className="text-xs text-slate-505 font-semibold">Vendor: {selectedPoDetails.vendor.name} &bull; Store: {selectedPoDetails.store.name}</p>
              </div>
              <button onClick={() => setSelectedPoDetails(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <Table headers={['Item Name', 'Order Qty', 'Delivered Qty', 'Unit Price', 'Total Row Amount']}>
              {selectedPoDetails.items.map(line => (
                <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-2.5 px-6 font-semibold text-slate-900">{line.item.name}</td>
                  <td className="py-2.5 px-6 text-slate-800 font-bold">{line.orderQty}</td>
                  <td className="py-2.5 px-6 text-slate-500 font-semibold">{line.receivedQty}</td>
                  <td className="py-2.5 px-6 font-mono text-slate-700">₹{line.unitPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-6 font-mono font-bold text-slate-800">
                    ₹{(line.orderQty * line.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </Table>

            <div className="mt-6 flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-sm font-semibold text-slate-500">PO Total Amount:</span>
              <span className="text-xl font-bold text-brand font-mono">
                ₹{selectedPoDetails.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-100">
              <Button onClick={() => setSelectedPoDetails(null)} variant="secondary">
                Close
              </Button>
              {selectedPoDetails.status === 'PENDING_APPROVAL' && canApprove(selectedPoDetails) && (
                <Button onClick={() => handleApprovePO(selectedPoDetails.id)} variant="primary" className="bg-emerald-600 hover:bg-emerald-700">
                  Approve Order
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── CREATE PO MODAL ──────────────────────────────────────────── */}
      {poModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Create Supplier Purchase Order</h3>
              <button onClick={() => setPoModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Supplier Vendor</label>
                  <Select
                    value={newPo.vendorId}
                    onChange={(e) => setNewPo(prev => ({ ...prev, vendorId: e.target.value }))}
                    options={[
                      { value: '', label: 'Select Vendor...' },
                      ...vendors.map(v => ({ value: v.id, label: v.name }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Destination Store</label>
                  <Select
                    value={newPo.storeId}
                    onChange={(e) => setNewPo(prev => ({ ...prev, storeId: e.target.value }))}
                    options={[
                      { value: '', label: 'Select Destination Store...' },
                      ...stores.map(s => ({ value: s.id, label: s.name }))
                    ]}
                  />
                </div>
              </div>

              {newPo.storeId && (
                <Card className="p-4 bg-slate-50/50 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">Add Order Line Item</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Product</label>
                      <Select
                        value={selectedItemToAdd}
                        onChange={(e) => {
                          setSelectedItemToAdd(e.target.value);
                          const matchedAlert = alerts.find(a => a.itemId === e.target.value);
                          if (matchedAlert) {
                            setQtyToAdd(matchedAlert.suggestedQty);
                            setPriceToAdd(matchedAlert.lastUnitPrice);
                          } else {
                            setQtyToAdd('');
                            setPriceToAdd('');
                          }
                        }}
                        options={[
                          { value: '', label: 'Select Product...' },
                          ...allowedItems.map(item => ({ value: item.id, label: item.name }))
                        ]}
                      />
                    </div>
                    <Input
                      label="Purchase Qty"
                      type="number"
                      min={0.01}
                      step="any"
                      value={qtyToAdd}
                      onChange={(e) => setQtyToAdd(e.target.value)}
                    />
                    <Input
                      label="Unit Price (INR)"
                      type="number"
                      min={0}
                      step="any"
                      value={priceToAdd}
                      onChange={(e) => setPriceToAdd(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={handleAddLineItem} variant="secondary" className="mt-4 w-full">
                    Add Line Item
                  </Button>
                </Card>
              )}

              {poLines.length > 0 && (
                <Table headers={['Product Item', 'Order Qty', 'Unit Rate', 'Row Total', 'Action']}>
                  {poLines.map((line, idx) => {
                    const dbItem = catalogItems.find(i => i.id === line.itemId);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-6 font-semibold text-slate-900">{dbItem?.name || 'N/A'}</td>
                        <td className="py-2.5 px-6 font-bold text-slate-800">{line.orderQty}</td>
                        <td className="py-2.5 px-6 font-mono text-slate-700">₹{line.unitPrice.toFixed(2)}</td>
                        <td className="py-2.5 px-6 font-mono font-bold text-slate-900">
                          ₹{(line.orderQty * line.unitPrice).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-6">
                          <button type="button" onClick={() => handleRemoveLineItem(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded-lg cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              )}

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <Button type="button" onClick={() => setPoModalOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Draft Purchase Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RECEIVE GOODS WIZARD (GRN MODAL) ─────────────────────────── */}
      {grnModalOpen && selectedPoForGrn && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">File Goods Received Note (GRN)</h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Filing receipts for order PO: {selectedPoForGrn.poNumber} &bull; Supplier: {selectedPoForGrn.vendor.name}</p>
              </div>
              <button onClick={() => setGrnModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitGRN} className="space-y-6">
              <Table headers={['Product Name', 'Ordered (Unreceived)', 'Received Delivery Qty', 'Rejected / Damaged Qty', 'Remarks']}>
                {selectedPoForGrn.items.map(poLine => {
                  const stateItem = grnItemsState.find(gi => gi.itemId === poLine.itemId);
                  const remaining = poLine.orderQty - poLine.receivedQty;
                  return (
                    <tr key={poLine.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-6 font-semibold text-slate-900">{poLine.item.name}</td>
                      <td className="py-2.5 px-6 font-semibold text-slate-500">{poLine.orderQty} ({remaining})</td>
                      <td className="py-2.5 px-6">
                        <input
                          type="number"
                          required
                          min={0}
                          step="any"
                          value={stateItem?.receivedQty || 0}
                          onChange={(e) => handleGrnItemQtyChange(poLine.itemId, 'receivedQty', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 focus:border-brand rounded-[8px] text-slate-900 text-sm focus:outline-none font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-6">
                        <input
                          type="number"
                          required
                          min={0}
                          step="any"
                          value={stateItem?.rejectedQty || 0}
                          onChange={(e) => handleGrnItemQtyChange(poLine.itemId, 'rejectedQty', e.target.value)}
                          className="w-24 px-2 py-1 border border-slate-200 focus:border-brand rounded-[8px] text-slate-900 text-sm focus:outline-none font-bold"
                        />
                      </td>
                      <td className="py-2.5 px-6">
                        <input
                          type="text"
                          value={stateItem?.remarks || ''}
                          onChange={(e) => handleGrnItemQtyChange(poLine.itemId, 'remarks', e.target.value)}
                          placeholder="Damaged label, etc."
                          className="w-full min-w-[150px] px-2 py-1 border border-slate-200 focus:border-brand rounded-[8px] text-slate-900 text-xs focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </Table>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <Button type="button" onClick={() => setGrnModalOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Record Delivery & Update Stock
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SELECT PO FOR GRN MODAL ─────────────────────────────────── */}
      {grnSelectorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-2xl bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Receive Goods from PO</h3>
              <button onClick={() => setGrnSelectorModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {pos.filter(po => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED').length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-medium">No open purchase orders await delivery.</div>
            ) : (
              <div className="space-y-3">
                {pos
                  .filter(po => po.status === 'APPROVED' || po.status === 'PARTIALLY_RECEIVED')
                  .map(po => (
                    <div
                      key={po.id}
                      onClick={() => {
                        setGrnSelectorModalOpen(false);
                        openGrnWizard(po);
                      }}
                      className="p-4 border border-slate-200 rounded-xl hover:border-brand cursor-pointer transition-colors bg-slate-50/50 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{po.poNumber}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">Supplier: {po.vendor.name} &bull; Destination: {po.store.name}</div>
                      </div>
                      <Badge status={po.status} />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── VENDOR MODAL ────────────────────────────────────────────── */}
      {vendorModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-slate-900">Register Supplier Vendor</h3>
              <button onClick={() => setVendorModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVendor} className="space-y-4">
              <Input
                label="Vendor/Company Name"
                required
                value={newVendor.name}
                onChange={(e) => setNewVendor(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., General Mills Foodservice"
              />
              <Input
                label="GSTIN ID / Tax Registration"
                value={newVendor.gstin}
                onChange={(e) => setNewVendor(prev => ({ ...prev, gstin: e.target.value }))}
                placeholder="e.g., GST-12345"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={newVendor.email}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="e.g., orders@mills.com"
                />
                <Input
                  label="Phone Number"
                  value={newVendor.phone}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="e.g., +91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Registered Address</label>
                <textarea
                  value={newVendor.address}
                  onChange={(e) => setNewVendor(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address, city, state"
                  className="w-full min-h-[80px] p-3 border border-slate-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-[10px] text-slate-900 text-sm focus:outline-none transition-all placeholder-slate-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100">
                <Button type="button" onClick={() => setVendorModalOpen(false)} variant="secondary">
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  Register Vendor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
