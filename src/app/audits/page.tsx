"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  History,
  Search,
  AlertTriangle,
  Save,
  CheckCircle2,
  Trash2,
  DollarSign,
  Package,
  RefreshCw,
  Lock,
  Store,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { Button, Card, Badge, Table, Input, EmptyState } from '@/components/ui';

interface StoreType {
  id: string;
  name: string;
}

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  sku?: string;
  purchaseUnit: string;
  consumptionUnit: string;
}

interface StockTakeItem {
  id: string;
  sessionId: string;
  itemId: string;
  systemQty: number;
  physicalQty: number | null;
  avgCostPrice: number;
  varianceQty: number | null;
  varianceValue: number | null;
  item: CatalogItem;
}

interface StockTakeSession {
  id: string;
  storeId: string;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy: {
    name: string;
    email?: string;
  };
  items: StockTakeItem[];
  store: StoreType;
}

export default function Audits() {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStore, setSelectedStore] = useState<StoreType | null>(null);
  const [activeSession, setActiveSession] = useState<StockTakeSession | null>(null);
  const [completedSessions, setCompletedSessions] = useState<StockTakeSession[]>([]);
  const [draftCounts, setDraftCounts] = useState<{ [itemId: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [viewingHistorySession, setViewingHistorySession] = useState<StockTakeSession | null>(null);

  // Parse User details
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

  const isStorekeeper = user?.role === 'STOREKEEPER';

  // Fetch initial data
  useEffect(() => {
    fetchStores();
    fetchCompletedSessions();
  }, []);

  // Fetch active session when selected store changes
  useEffect(() => {
    if (selectedStore) {
      fetchActiveSession(selectedStore.id);
    } else {
      setActiveSession(null);
      setDraftCounts({});
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/stores');
      setStores(res.data);
      if (res.data.length > 0 && !selectedStore) {
        setSelectedStore(res.data[0]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedSessions = async () => {
    try {
      const res = await api.get('/api/audit/completed');
      setCompletedSessions(res.data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchActiveSession = async (storeId: string) => {
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.get(`/api/audit/active/${storeId}`);
      if (res.data) {
        setActiveSession(res.data);
        const initialCounts: { [itemId: string]: string } = {};
        res.data.items.forEach((item: StockTakeItem) => {
          initialCounts[item.itemId] = item.physicalQty !== null ? String(item.physicalQty) : '';
        });
        setDraftCounts(initialCounts);
      } else {
        setActiveSession(null);
        setDraftCounts({});
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch active session');
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedStore) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/api/audit', { storeId: selectedStore.id });
      setSuccessMsg(`Audit session started for ${selectedStore.name}. Snapshot stock counts frozen!`);
      setActiveSession(res.data);
      const initialCounts: { [itemId: string]: string } = {};
      res.data.items.forEach((item: StockTakeItem) => {
        initialCounts[item.itemId] = '';
      });
      setDraftCounts(initialCounts);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCountChange = (itemId: string, value: string) => {
    if (value !== '' && Number(value) < 0) return;
    setDraftCounts(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handlePreFillSystemCounts = () => {
    if (!activeSession) return;
    const prefilled: { [itemId: string]: string } = {};
    activeSession.items.forEach(item => {
      prefilled[item.itemId] = String(item.systemQty);
    });
    setDraftCounts(prefilled);
    setSuccessMsg('Pre-filled all worksheet items with current system stock levels.');
  };

  const handleClearInputs = () => {
    if (!activeSession) return;
    const cleared: { [itemId: string]: string } = {};
    activeSession.items.forEach(item => {
      cleared[item.itemId] = '';
    });
    setDraftCounts(cleared);
    setSuccessMsg('Worksheet input fields cleared.');
  };

  const handleSaveDraft = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const itemsPayload = Object.keys(draftCounts).map(itemId => {
      const value = draftCounts[itemId];
      return {
        itemId,
        physicalQty: value !== '' ? Number(value) : null
      };
    });

    try {
      const res = await api.put(`/api/audit/${activeSession.id}/counts`, { items: itemsPayload });
      setSuccessMsg('Draft count changes saved successfully.');
      setActiveSession(res.data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to save draft counts');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeSession) return;
    if (isStorekeeper) {
      setErrorMsg('Unauthorized: Storekeepers cannot reconcile audits.');
      return;
    }
    const confirmReconcile = window.confirm(
      'Are you sure you want to finalize this audit? This will commit variance deltas to stock levels and log discrepancies in the unified ledger.'
    );
    if (!confirmReconcile) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const itemsPayload = Object.keys(draftCounts).map(itemId => {
        const value = draftCounts[itemId];
        return {
          itemId,
          physicalQty: value !== '' ? Number(value) : null
        };
      });
      await api.put(`/api/audit/${activeSession.id}/counts`, { items: itemsPayload });

      const res = await api.post(`/api/audit/${activeSession.id}/finalize`, {});
      setSuccessMsg(res.data.message || 'Stock audit finalized and reconciled successfully.');
      setActiveSession(null);
      setDraftCounts({});
      fetchCompletedSessions();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to finalize audit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSession = async () => {
    if (!activeSession) return;
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel this stock take? All entered physical counts for this session will be discarded.'
    );
    if (!confirmCancel) return;

    setActionLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.post(`/api/audit/${activeSession.id}/cancel`, {});
      setSuccessMsg('Stock audit session cancelled successfully.');
      setActiveSession(null);
      setDraftCounts({});
      fetchCompletedSessions();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to cancel audit');
    } finally {
      setActionLoading(false);
    }
  };

  const getWorksheetSummary = () => {
    if (!activeSession) return { totalCounted: 0, netVarianceQty: 0, netVarianceVal: 0 };
    let totalCounted = 0;
    let netVarianceQty = 0;
    let netVarianceVal = 0;

    activeSession.items.forEach(item => {
      const inputVal = draftCounts[item.itemId];
      if (inputVal !== undefined && inputVal !== '') {
        totalCounted++;
        const physical = Number(inputVal);
        const varianceQty = physical - item.systemQty;
        const varianceValue = varianceQty * item.avgCostPrice;
        netVarianceQty += varianceQty;
        netVarianceVal += varianceValue;
      }
    });

    return { totalCounted, netVarianceQty, netVarianceVal };
  };

  const { totalCounted, netVarianceQty, netVarianceVal } = getWorksheetSummary();

  const filteredWorksheetItems = activeSession
    ? activeSession.items.filter(item => {
        const nameMatch = item.item.name.toLowerCase().includes(searchQuery.toLowerCase());
        const catMatch = item.item.category.toLowerCase().includes(searchQuery.toLowerCase());
        const skuMatch = item.item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
        return nameMatch || catMatch || skuMatch;
      })
    : [];

  // Metrics
  const activeAudits = activeSession ? 1 : 0;
  const completedAudits = completedSessions.filter(s => s.status === 'COMPLETED').length;
  const totalVarianceValue = completedSessions.reduce((acc, s) => {
    const sessionVal = s.items.reduce((sum, item) => sum + (item.varianceValue || 0), 0);
    return acc + sessionVal;
  }, 0);

  // Completion Percentage
  const progressPercent = activeSession && activeSession.items.length > 0
    ? Math.round((totalCounted / activeSession.items.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Stock Audits & Reconciliation</h1>
          <p className="text-slate-500 text-sm mt-1">Resolve physical discrepancies and reconcile stock deltas securely.</p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm flex items-start space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Error:</span> {errorMsg}
          </div>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-xl text-green-700 text-sm flex items-start space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Success:</span> {successMsg}
          </div>
        </div>
      )}

      {/* Dashboard KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-505 uppercase tracking-widest">Active Audit Sessions</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeAudits}</span>
            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">Lock active</span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-505 uppercase tracking-widest">Completed Audits</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{completedAudits}</span>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">Reconciled</span>
          </div>
        </Card>
        <Card className="p-5 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-505 uppercase tracking-widest">Net Discrepancy Value</div>
          <div className="flex items-baseline justify-between mt-2">
            <span className={`text-2xl font-extrabold ${totalVarianceValue < 0 ? 'text-red-650' : 'text-slate-900'}`}>
              ₹{totalVarianceValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-505 font-medium">All sessions</span>
          </div>
        </Card>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Store Selector */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                <Store className="w-4 h-4 text-brand" />
                <span>Select Store Location</span>
              </h2>
              <button 
                onClick={fetchStores}
                className="text-xs text-brand hover:text-brand-hover font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {loading && stores.length === 0 ? (
              <div className="py-6 text-center text-slate-405 text-xs font-medium">Syncing stores...</div>
            ) : (
              <div className="space-y-1">
                {stores.map(store => {
                  const isSelected = selectedStore?.id === store.id;
                  return (
                    <button
                      key={store.id}
                      onClick={() => setSelectedStore(store)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 group cursor-pointer ${
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
          </Card>

          <Card className="p-5 bg-indigo-50/20 border border-brand/10 space-y-3">
            <h3 className="text-xs font-bold text-brand uppercase tracking-wider flex items-center space-x-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Delta Reconciliations</span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Filing audits applies a delta formula rather than overwriting stocks. Discrepancies are computed relative to snapshot levels.
            </p>
            <div className="bg-white border border-slate-200/80 font-mono text-[10px] text-brand p-3 rounded-lg space-y-1 shadow-sm">
              <div>Variance = Count - Snapshot</div>
              <div>New Stock = Current Bal + Variance</div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              This guarantees kitchen sales and room checkouts during active counts are never lost.
            </p>
          </Card>
        </div>

        {/* Content Right Panel */}
        <div className="lg:col-span-3 space-y-6">
          {selectedStore ? (
            activeSession ? (
              <Card className="p-6">
                {/* Active Session info header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-5 gap-4">
                  <div>
                    <div className="flex items-center space-x-2 bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit mb-2">
                      <Lock className="w-3.5 h-3.5 mr-1" />
                      <span>Audit Session Active (Locked)</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Worksheet: {selectedStore.name}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-xs mt-1.5 font-medium">
                      <span>Started: {new Date(activeSession.createdAt).toLocaleDateString()} &bull; Auditor: {activeSession.createdBy.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button onClick={handlePreFillSystemCounts} variant="secondary" className="h-9 px-3 rounded-lg text-xs">
                      Prefill System Stock
                    </Button>
                    <Button onClick={handleClearInputs} variant="secondary" className="h-9 px-3 rounded-lg text-xs">
                      Clear worksheet
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
                     <span>Audit Count Progress</span>
                     <span>{totalCounted} of {activeSession.items.length} items ({progressPercent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-brand h-full transition-all duration-350" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>

                {/* Worksheet Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-555 font-bold uppercase tracking-wider block">Items Handled</span>
                      <span className="text-xl font-extrabold text-slate-800 mt-1 block">{totalCounted} / {activeSession.items.length}</span>
                    </div>
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-555 font-bold uppercase tracking-wider block">Discrepancy Count</span>
                      <span className={`text-xl font-extrabold mt-1 block ${netVarianceQty > 0 ? 'text-green-605' : netVarianceQty < 0 ? 'text-amber-505' : 'text-slate-800'}`}>
                        {netVarianceQty > 0 ? `+${netVarianceQty}` : netVarianceQty}
                      </span>
                    </div>
                    {netVarianceQty >= 0 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-amber-500" />}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-555 font-bold uppercase tracking-wider block">Est. Variance Value</span>
                      <span className={`text-xl font-extrabold mt-1 block ${netVarianceVal > 0 ? 'text-green-605' : netVarianceVal < 0 ? 'text-red-605' : 'text-slate-800'}`}>
                        ₹{netVarianceVal.toFixed(2)}
                      </span>
                    </div>
                    <DollarSign className="w-6 h-6 text-slate-400" />
                  </div>
                </div>

                <div className="relative mb-4">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search worksheet items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 focus:border-brand rounded-[10px] text-slate-900 text-sm focus:outline-none transition-all placeholder-slate-400"
                  />
                </div>

                {/* Worksheet Table */}
                <Table headers={['Product Item', 'Snapshot System Qty', 'Physical Count', 'Variance Delta', 'Variance Value']}>
                  {filteredWorksheetItems.map(sItem => {
                    const value = draftCounts[sItem.itemId] || '';
                    const physical = value !== '' ? Number(value) : null;
                    const varQty = physical !== null ? physical - sItem.systemQty : null;
                    const varVal = varQty !== null ? varQty * sItem.avgCostPrice : null;

                    return (
                      <tr key={sItem.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-6">
                          <span className="font-bold text-slate-900 text-sm block">{sItem.item.name}</span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">Category: {sItem.item.category}</span>
                        </td>
                        <td className="py-3 px-6 text-slate-705 font-bold text-right">
                          {sItem.systemQty} {sItem.item.consumptionUnit}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <div className="inline-flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={value}
                              onChange={(e) => handleCountChange(sItem.itemId, e.target.value)}
                              placeholder="Count..."
                              className="w-24 text-center py-1 border border-slate-200 focus:border-brand rounded-[8px] text-slate-900 font-bold text-xs focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 font-semibold">{sItem.item.consumptionUnit}</span>
                          </div>
                        </td>
                        <td className="py-3 px-6 text-right font-bold">
                          {varQty !== null ? (
                            <span className={varQty > 0 ? 'text-green-600' : varQty < 0 ? 'text-amber-500' : 'text-slate-500'}>
                              {varQty > 0 ? `+${varQty}` : varQty}
                            </span>
                          ) : '--'}
                        </td>
                        <td className="py-3 px-6 text-right font-bold">
                          {varVal !== null ? (
                            <span className={varVal > 0 ? 'text-green-600' : varVal < 0 ? 'text-red-655' : 'text-slate-500'}>
                              ₹{varVal.toFixed(2)}
                            </span>
                          ) : '--'}
                        </td>
                      </tr>
                    );
                  })}
                </Table>

                {/* Final Form Actions */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-6 mt-6 gap-4">
                  <Button onClick={handleCancelSession} variant="danger" disabled={actionLoading} className="w-full sm:w-auto">
                    <Trash2 className="w-4 h-4 mr-2" /> Cancel Audit Session
                  </Button>

                  <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                    <Button onClick={handleSaveDraft} variant="secondary" disabled={actionLoading}>
                      <Save className="w-4 h-4 mr-2" /> Save Count Draft
                    </Button>

                    {isStorekeeper ? (
                      <Button variant="primary" disabled className="opacity-50 cursor-not-allowed">
                        Finalize (Manager only)
                      </Button>
                    ) : (
                      <Button onClick={handleFinalize} variant="primary" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 shadow-md">
                        Finalize & Reconcile
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <EmptyState
                title="No Active Audit Session"
                description={`A physical audit has not been started for ${selectedStore.name}. Begin a new session to freeze stock levels and count items.`}
                icon={<Lock className="w-12 h-12 text-slate-300" />}
                actionText="Start Stock Take Session"
                onAction={handleStartSession}
              />
            )
          ) : (
            <div className="text-center py-12 text-slate-500 font-medium">Select a store from the sidebar to audit.</div>
          )}

          {/* Historical Audits Log Section */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <History className="w-5 h-5 text-slate-400" />
              <span>Property Stock Audit History</span>
            </h2>

            {completedSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">No finished audit records cataloged.</div>
            ) : (
              <Table headers={['Store Location', 'Audited By', 'Audit Close Date', 'Status', 'Product Items Counted', 'Actions']}>
                {completedSessions.map(session => (
                  <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-6 font-bold text-slate-800">{session.store.name}</td>
                    <td className="py-3 px-6 text-slate-700 font-semibold">{session.createdBy.name}</td>
                    <td className="py-3 px-6 text-slate-500 font-mono text-xs">{new Date(session.updatedAt).toLocaleDateString()}</td>
                    <td className="py-3 px-6">
                      <Badge status={session.status} />
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-500 text-right">{session.items.length} items</td>
                    <td className="py-3 px-6">
                      <Button onClick={() => setViewingHistorySession(session)} variant="secondary" className="h-9 px-3 rounded-lg text-xs">
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      </div>

      {/* ─── Modal: Completed Session Details ──────────────────────── */}
      {viewingHistorySession && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-white p-8 border border-slate-200 shadow-2xl rounded-2xl text-slate-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-brand" />
                  <span>Audit Detail: {viewingHistorySession.store.name}</span>
                </h3>
                <p className="text-slate-500 text-xs font-semibold mt-1">Session ID: <span className="font-mono text-slate-800">{viewingHistorySession.id}</span></p>
              </div>
              <button onClick={() => setViewingHistorySession(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs font-medium mb-4 flex-shrink-0">
              <div>
                <span className="text-slate-500 block">Status:</span>
                <Badge status={viewingHistorySession.status} className="mt-0.5" />
              </div>
              <div>
                <span className="text-slate-500 block">Auditor:</span>
                <span className="font-bold text-slate-900 mt-1 block">{viewingHistorySession.createdBy.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Created At:</span>
                <span className="text-slate-900 mt-1 block">{new Date(viewingHistorySession.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reconciled At:</span>
                <span className="text-slate-900 mt-1 block">{new Date(viewingHistorySession.updatedAt).toLocaleString()}</span>
              </div>
            </div>

            <div className="overflow-y-auto flex-grow border border-slate-200 rounded-xl mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <th className="py-2.5 px-6 font-bold uppercase">Item Name</th>
                    <th className="py-2.5 px-6 font-bold uppercase text-right">System Snapshot</th>
                    <th className="py-2.5 px-6 font-bold uppercase text-right">Physical Counted</th>
                    <th className="py-2.5 px-6 font-bold uppercase text-right">Cost Price (WAC)</th>
                    <th className="py-2.5 px-6 font-bold uppercase text-right">Variance Qty</th>
                    <th className="py-2.5 px-6 font-bold uppercase text-right">Variance Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {viewingHistorySession.items.map(sItem => {
                    const varianceQty = sItem.varianceQty !== null ? sItem.varianceQty : 0;
                    const varianceVal = sItem.varianceValue !== null ? sItem.varianceValue : 0;
                    const physical = sItem.physicalQty !== null ? sItem.physicalQty : sItem.systemQty;

                    return (
                      <tr key={sItem.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-6 font-bold text-slate-900">{sItem.item.name}</td>
                        <td className="py-2.5 px-6 text-right font-medium text-slate-600">
                          {sItem.systemQty} {sItem.item.consumptionUnit}
                        </td>
                        <td className="py-2.5 px-6 text-right font-bold text-slate-900">
                          {physical} {sItem.item.consumptionUnit}
                        </td>
                        <td className="py-2.5 px-6 text-right text-slate-500 font-mono">
                          ₹{sItem.avgCostPrice.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-6 text-right font-bold">
                          <span className={varianceQty > 0 ? 'text-green-600' : varianceQty === 0 ? 'text-slate-500' : 'text-amber-505'}>
                            {varianceQty > 0 ? `+${varianceQty}` : varianceQty}
                          </span>
                        </td>
                        <td className="py-2.5 px-6 text-right font-bold">
                          <span className={varianceVal > 0 ? 'text-green-600' : varianceVal === 0 ? 'text-slate-500' : 'text-red-600'}>
                            ₹{varianceVal.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4 flex-shrink-0">
              <Button onClick={() => setViewingHistorySession(null)} variant="secondary">
                Close details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
