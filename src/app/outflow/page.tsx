"use client";

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Layers,
  History,
  CheckCircle2,
  Trash,
  Sparkles,
  AlertTriangle,
  ClipboardList,
  Search
} from 'lucide-react';
import { Button, Card, Badge, Table, Input, Select, Tabs, EmptyState } from '@/components/ui';

interface CatalogItem {
  id: string;
  name: string;
  category: string;
  purchaseUnit: string;
  consumptionUnit: string;
  factor: number;
  sku?: string;
  avgCostPrice?: number;
}

interface Store {
  id: string;
  name: string;
}

interface RecipeIngredient {
  id: string;
  itemId: string;
  quantity: number;
  item: CatalogItem;
}

interface Recipe {
  id: string;
  name: string;
  code: string;
  ingredients: RecipeIngredient[];
}

interface CleanChecklist {
  id: string;
  cleanType: string;
  itemId: string;
  quantity: number;
  item: CatalogItem;
}

interface WastageLog {
  id: string;
  itemId: string;
  storeId: string;
  quantity: number;
  reason: string;
  remarks: string | null;
  createdAt: string;
  item: CatalogItem;
  store: Store;
  recordedBy: {
    name: string;
    email: string;
  };
}

interface StockTransaction {
  id: string;
  itemId: string;
  storeId: string;
  type: string;
  quantity: number;
  costPrice: number;
  referenceId: string | null;
  remarks: string | null;
  createdAt: string;
  item: CatalogItem;
  store: Store;
  recordedBy: {
    name: string;
    email: string;
  } | null;
}

export default function Outflow() {
  const [activeTab, setActiveTab] = useState('recipes');

  // Core Data Lists
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [cleanTemplates, setCleanTemplates] = useState<CleanChecklist[]>([]);
  const [wastageLogs, setWastageLogs] = useState<WastageLog[]>([]);
  const [ledger, setLedger] = useState<StockTransaction[]>([]);

  // Selection state
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Loaders
  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Feedback notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [depletionAlerts, setDepletionAlerts] = useState<{itemName: string; depletedQty: number; remainingQty: number; avgCostPrice: number}[]>([]);

  // ─── FORMS STATE ──────────────────────────────────────────────────
  const [newRecipeName, setNewRecipeName] = useState('');
  const [newRecipeCode, setNewRecipeCode] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState<{ itemId: string; quantity: number }[]>([]);
  const [selectedIngItemId, setSelectedIngItemId] = useState('');
  const [ingQty, setIngQty] = useState<number | string>('');

  const [saleRecipeId, setSaleRecipeId] = useState('');
  const [saleStoreId, setSaleStoreId] = useState('');
  const [saleQty, setSaleQty] = useState<number>(1);
  const [saleRemarks, setSaleRemarks] = useState('');

  const [cleanType, setCleanType] = useState('FULL_CLEAN');
  const [cleanStoreId, setCleanStoreId] = useState('');
  const [cleanRemarks, setCleanRemarks] = useState('');

  const [configCleanType, setConfigCleanType] = useState('FULL_CLEAN');
  const [configItems, setConfigItems] = useState<{ itemId: string; quantity: number }[]>([]);
  const [configItemId, setConfigItemId] = useState('');
  const [configQty, setConfigQty] = useState<number | string>('');

  const [wasteItemId, setWasteItemId] = useState('');
  const [wasteStoreId, setWasteStoreId] = useState('');
  const [wasteQty, setWasteQty] = useState<number | string>('');
  const [wasteReason, setWasteReason] = useState('SPOILED');
  const [wasteRemarks, setWasteRemarks] = useState('');

  const [kotNumber, setKotNumber] = useState('KOT-8001');
  const [kotRecipeCode, setKotRecipeCode] = useState('');
  const [kotQty, setKotQty] = useState<number>(1);
  const [kotRoomNumber, setKotRoomNumber] = useState('');
  const [eventRoomNumber, setEventRoomNumber] = useState('304');
  const [eventType, setEventType] = useState('CHECKOUT');
  const [eventDateCode, setEventDateCode] = useState(new Date().toISOString().split('T')[0]);

  const [ledgerFilterStore, setLedgerFilterStore] = useState('');
  const [ledgerSearchItem, setLedgerSearchItem] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchCoreData();
  }, []);

  const fetchCoreData = async () => {
    setLoading(true);
    try {
      const [itemsRes, storesRes, recipesRes, cleansRes, wastageRes] = await Promise.all([
        api.get('/api/items'),
        api.get('/api/stores'),
        api.get('/api/outflow/recipes'),
        api.get('/api/outflow/clean-checklists'),
        api.get('/api/outflow/wastage')
      ]);
      setCatalogItems(itemsRes.data);
      setStores(storesRes.data);
      setRecipes(recipesRes.data);
      setCleanTemplates(cleansRes.data);
      setWastageLogs(wastageRes.data);

      if (recipesRes.data.length > 0) {
        setSelectedRecipe(recipesRes.data[0]);
      }
      if (storesRes.data.length > 0) {
        setSaleStoreId(storesRes.data[0].id);
        setCleanStoreId(storesRes.data[0].id);
        setWasteStoreId(storesRes.data[0].id);
      }
      if (itemsRes.data.length > 0) {
        setSelectedIngItemId(itemsRes.data[0].id);
        setConfigItemId(itemsRes.data[0].id);
        setWasteItemId(itemsRes.data[0].id);
      }
      if (recipesRes.data.length > 0) {
        setSaleRecipeId(recipesRes.data[0].id);
        setKotRecipeCode(recipesRes.data[0].code);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.error || 'Failed to fetch initial data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLedgerLoading(true);
    try {
      const params: any = {};
      if (ledgerFilterStore) params.storeId = ledgerFilterStore;
      const res = await api.get('/api/outflow/ledger', { params });
      setLedger(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedger();
    }
  }, [activeTab, ledgerFilterStore]);

  useEffect(() => {
    const matching = cleanTemplates
      .filter(t => t.cleanType === configCleanType)
      .map(t => ({ itemId: t.itemId, quantity: t.quantity }));
    setConfigItems(matching);
  }, [configCleanType, cleanTemplates]);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg('');
    setTimeout(() => setErrorMsg(''), 6000);
  };

  const addIngredientToDraft = () => {
    if (!selectedIngItemId || !ingQty || Number(ingQty) <= 0) {
      triggerError('Please select an item and enter a positive quantity.');
      return;
    }
    const exists = recipeIngredients.some(i => i.itemId === selectedIngItemId);
    if (exists) {
      triggerError('This item is already added to the ingredients list.');
      return;
    }
    setRecipeIngredients([
      ...recipeIngredients,
      { itemId: selectedIngItemId, quantity: Number(ingQty) }
    ]);
    setIngQty('');
  };

  const removeIngredientFromDraft = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRecipeName.trim() || !newRecipeCode.trim()) {
      triggerError('Recipe name and code are required.');
      return;
    }
    if (recipeIngredients.length === 0) {
      triggerError('Please add at least one ingredient.');
      return;
    }

    try {
      const res = await api.post(
        '/api/outflow/recipes',
        {
          name: newRecipeName.trim(),
          code: newRecipeCode.trim().toUpperCase(),
          ingredients: recipeIngredients
        }
      );
      setRecipes([res.data, ...recipes]);
      setSelectedRecipe(res.data);
      setNewRecipeName('');
      setNewRecipeCode('');
      setRecipeIngredients([]);
      triggerSuccess('Recipe created successfully!');
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Failed to create recipe.');
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    try {
      await api.delete(`/api/outflow/recipes/${id}`);
      const updated = recipes.filter(r => r.id !== id);
      setRecipes(updated);
      if (selectedRecipe?.id === id) {
        setSelectedRecipe(updated.length > 0 ? updated[0] : null);
      }
      triggerSuccess('Recipe deleted successfully.');
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Failed to delete recipe.');
    }
  };

  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleRecipeId || !saleStoreId || saleQty <= 0) {
      triggerError('Please select a recipe, store, and positive quantity.');
      return;
    }

    try {
      const res = await api.post(
        '/api/outflow/deplete-recipe',
        {
          recipeId: saleRecipeId,
          storeId: saleStoreId,
          quantity: Number(saleQty),
          remarks: saleRemarks.trim()
        }
      );

      setDepletionAlerts(res.data.transactions);
      setSaleRemarks('');
      triggerSuccess('POS sale depletion calculated and stock updated.');
      
      const recipesRes = await api.get('/api/outflow/recipes');
      setRecipes(recipesRes.data);
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Failed to process recipe depletion.');
    }
  };

  const handleLogClean = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanType || !cleanStoreId) {
      triggerError('Please select a clean type and housekeeping store.');
      return;
    }

    try {
      const res = await api.post(
        '/api/outflow/log-clean',
        {
          cleanType,
          storeId: cleanStoreId,
          remarks: cleanRemarks.trim()
        }
      );

      setDepletionAlerts(res.data.transactions);
      setCleanRemarks('');
      triggerSuccess(`Housekeeping ${cleanType} depletion processed.`);
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Failed to process room clean depletion.');
    }
  };

  const handleSaveCleanTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(
        '/api/outflow/clean-checklists',
        {
          cleanType: configCleanType,
          items: configItems
        }
      );
      
      const cleansRes = await api.get('/api/outflow/clean-checklists');
      setCleanTemplates(cleansRes.data);
      triggerSuccess('Housekeeping clean checklist template updated successfully!');
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Failed to save clean checklist template.');
    }
  };

  const addConfigItem = () => {
    if (!configItemId || !configQty || Number(configQty) <= 0) {
      triggerError('Select a valid item and enter a positive quantity.');
      return;
    }
    const exists = configItems.some(i => i.itemId === configItemId);
    if (exists) {
      triggerError('This item is already in the checklist configuration.');
      return;
    }
    setConfigItems([
      ...configItems,
      { itemId: configItemId, quantity: Number(configQty) }
    ]);
    setConfigQty('');
  };

  const removeConfigItem = (index: number) => {
    setConfigItems(configItems.filter((_, i) => i !== index));
  };

  const handleLogWastage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wasteItemId || !wasteStoreId || !wasteQty || Number(wasteQty) <= 0) {
      triggerError('Please select item, store, and enter a positive quantity.');
      return;
    }

    try {
      const res = await api.post(
        '/api/outflow/wastage',
        {
          itemId: wasteItemId,
          storeId: wasteStoreId,
          quantity: Number(wasteQty),
          reason: wasteReason,
          remarks: wasteRemarks.trim()
        }
      );

      setWastageLogs([res.data, ...wastageLogs]);
      setWasteQty('');
      setWasteRemarks('');
      setDepletionAlerts([
        {
          itemName: res.data.item.name,
          depletedQty: res.data.quantity,
          remainingQty: -9999,
          avgCostPrice: 0
        }
      ]);
      triggerSuccess('Wastage logged successfully.');
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Failed to log wastage.');
    }
  };

  const handleSimulateKOT = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kotNumber || !kotRecipeCode || kotQty <= 0) {
      triggerError('Please enter a KOT number, select a recipe, and enter a positive quantity.');
      return;
    }
    try {
      const res = await api.post(
        '/api/outflow/kot',
        {
          kotNumber: kotNumber.trim(),
          items: [{ recipeCode: kotRecipeCode, quantity: Number(kotQty) }],
          roomNumber: kotRoomNumber.trim() || undefined
        }
      );
      setDepletionAlerts(res.data.transactions);
      triggerSuccess(res.data.message);
      
      const suffixMatch = kotNumber.match(/\d+$/);
      if (suffixMatch) {
        const num = Number(suffixMatch[0]) + 1;
        const prefix = kotNumber.slice(0, suffixMatch.index);
        setKotNumber(`${prefix}${num}`);
      } else {
        setKotNumber(kotNumber + '-1');
      }
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'KOT processing failed.');
    }
  };

  const handleSimulateRoomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventRoomNumber || !eventType || !eventDateCode) {
      triggerError('Room number, event type, and date are required.');
      return;
    }
    try {
      const res = await api.post(
        '/api/outflow/room-event',
        {
          roomNumber: eventRoomNumber.trim(),
          event: eventType,
          dateCode: eventDateCode
        }
      );
      setDepletionAlerts(res.data.transactions);
      triggerSuccess(res.data.message);
    } catch (err: any) {
      triggerError(err.response?.data?.error || 'Room event simulation failed.');
    }
  };

  const getRecipeCostDetails = (recipe: Recipe | null) => {
    if (!recipe) return { totalCost: 0, itemsList: [] };
    let totalCost = 0;
    
    const itemsList = recipe.ingredients.map(ing => {
      const itemWac = ing.item.avgCostPrice || 45.0;
      const rowCost = ing.quantity * itemWac;
      totalCost += rowCost;
      return {
        id: ing.id,
        name: ing.item.name,
        qty: ing.quantity,
        unit: ing.item.consumptionUnit,
        wac: itemWac,
        rowCost
      };
    });

    const withContribution = itemsList.map(item => ({
      ...item,
      contribution: totalCost > 0 ? Math.round((item.rowCost / totalCost) * 100) : 0
    }));

    return {
      totalCost,
      itemsList: withContribution
    };
  };

  const { totalCost: selectedRecipeCost, itemsList: selectedRecipeIngredients } = getRecipeCostDetails(selectedRecipe);

  const filteredLedger = ledger.filter(tx =>
    tx.item.name.toLowerCase().includes(ledgerSearchItem.toLowerCase()) ||
    tx.type.toLowerCase().includes(ledgerSearchItem.toLowerCase()) ||
    (tx.remarks && tx.remarks.toLowerCase().includes(ledgerSearchItem.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Outflow & Stock Depletions</h1>
          <p className="text-slate-500 text-sm mt-1">Monitor consumption streams, recipe depletions, room cleans, and wastage.</p>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-100 border border-red-200 rounded-xl text-red-700 text-sm flex items-start space-x-2.5">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-100 border border-green-200 rounded-xl text-green-700 text-sm flex items-start space-x-2.5">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Depletion Alerts Panel */}
      {depletionAlerts.length > 0 && (
        <Card className="p-5 border-brand/20 bg-brand/5">
          <h3 className="text-sm font-bold text-brand flex items-center space-x-2 mb-3">
            <Sparkles className="w-4 h-4 text-brand" />
            <span>Stock Depleted Successfully</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-700">
            {depletionAlerts.map((tx, idx) => (
              <div key={idx} className="bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                <span className="block font-bold text-slate-900 truncate">{tx.itemName}</span>
                <span className="text-red-600 block mt-1">Deducted: {tx.depletedQty}</span>
                {tx.remainingQty !== -9999 && (
                  <span className="text-slate-500 block mt-0.5">Remaining: {tx.remainingQty}</span>
                )}
              </div>
            ))}
          </div>
          <Button onClick={() => setDepletionAlerts([])} variant="tertiary" className="h-8 px-2 text-xs mt-3">
            Clear Notification
          </Button>
        </Card>
      )}

      {/* Primary Tab Navigation */}
      <Tabs
        tabs={[
          { id: 'recipes', label: 'Recipes (BOM)' },
          { id: 'sales', label: 'Sales Consumption' },
          { id: 'housekeeping', label: 'Housekeeping Consumption' },
          { id: 'wastage', label: 'Wastage Logging' },
          { id: 'ledger', label: 'Unified Stock Ledger' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* ─── TAB: RECIPES ──────────────────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List of Recipes */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Recipes List</h3>
              {recipes.length === 0 ? (
                <p className="text-xs text-slate-500 font-semibold py-4 text-center">No recipes created yet.</p>
              ) : (
                <div className="space-y-1">
                  {recipes.map(recipe => (
                    <div
                      key={recipe.id}
                      onClick={() => setSelectedRecipe(recipe)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRecipe(recipe); } }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        selectedRecipe?.id === recipe.id
                          ? 'bg-brand/10 border-brand text-brand font-bold'
                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{recipe.name}</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide font-semibold">{recipe.code}</span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Create Recipe Form */}
            <Card className="p-5">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Create Recipe BOM</h3>
              <form onSubmit={handleCreateRecipe} className="space-y-4">
                <Input
                  label="Recipe Name"
                  required
                  value={newRecipeName}
                  onChange={(e) => setNewRecipeName(e.target.value)}
                  placeholder="e.g., Pancakes Stack"
                />
                <Input
                  label="Recipe Unique Code"
                  required
                  value={newRecipeCode}
                  onChange={(e) => setNewRecipeCode(e.target.value)}
                  placeholder="e.g., REC-PANCAKE"
                />

                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Add Ingredient</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Item</label>
                      <Select
                        value={selectedIngItemId}
                        onChange={(e) => setSelectedIngItemId(e.target.value)}
                        options={catalogItems.map(item => ({ value: item.id, label: item.name }))}
                      />
                    </div>
                    <Input
                      label="Use Quantity"
                      type="number"
                      step="any"
                      value={ingQty}
                      onChange={(e) => setIngQty(e.target.value)}
                      placeholder="e.g., 0.5"
                    />
                  </div>
                  <Button type="button" onClick={addIngredientToDraft} variant="secondary" className="w-full h-9">
                    Add Ingredient Item
                  </Button>
                </div>

                {recipeIngredients.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Ingredients List</span>
                    <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5 max-h-40 overflow-y-auto">
                      {recipeIngredients.map((ing, idx) => {
                        const dbItem = catalogItems.find(i => i.id === ing.itemId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>{dbItem?.name} ({ing.quantity} {dbItem?.consumptionUnit})</span>
                            <button type="button" onClick={() => removeIngredientFromDraft(idx)} className="text-red-500 hover:text-red-750">
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full shadow-sm">
                  Register Recipe
                </Button>
              </form>
            </Card>
          </div>

          {/* Visual Costing Details Panel */}
          <div className="lg:col-span-2">
            {selectedRecipe ? (
              <Card className="p-6">
                <div className="border-b border-slate-100 pb-5 mb-5 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-905">{selectedRecipe.name}</h2>
                    <span className="text-xs text-slate-500 font-mono font-bold uppercase tracking-wider">{selectedRecipe.code}</span>
                  </div>
                  <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl text-right">
                    <span className="text-[10px] text-brand font-bold uppercase tracking-widest block">Est. Cost Per Plate</span>
                    <span className="text-2xl font-extrabold text-brand font-mono">₹{selectedRecipeCost.toFixed(2)}</span>
                  </div>
                </div>

                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Ingredient Bill of Materials (BOM)</h3>
                <Table headers={['Ingredient Item', 'Quantity Used', 'Unit Cost Rate', 'Estimated Cost', 'Cost Contribution %']}>
                  {selectedRecipeIngredients.map(ing => (
                    <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 font-semibold text-slate-900">{ing.name}</td>
                      <td className="py-3 px-6 text-slate-800 font-bold">{ing.qty} {ing.unit}</td>
                      <td className="py-3 px-6 text-slate-500 font-mono">₹{ing.wac.toFixed(2)}</td>
                      <td className="py-3 px-6 text-slate-900 font-bold font-mono">₹{ing.rowCost.toFixed(2)}</td>
                      <td className="py-3 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-brand h-full" style={{ width: `${ing.contribution}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 font-mono w-8 text-right">{ing.contribution}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </Table>
              </Card>
            ) : (
              <EmptyState
                title="No Recipe Selected"
                description="Select a recipe from the sidebar, or create one to view the costing analytics."
                icon={<Layers className="w-12 h-12 text-slate-300" />}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: SALES CONSUMPTION (POS / KOT) ────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* POS Manual Depletion Form */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Manual POS Depletion</h3>
            <form onSubmit={handleProcessSale} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Recipe Item</label>
                <Select
                  value={saleRecipeId}
                  onChange={(e) => setSaleRecipeId(e.target.value)}
                  options={recipes.map(r => ({ value: r.id, label: r.name }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Outlet Store</label>
                  <Select
                    value={saleStoreId}
                    onChange={(e) => setSaleStoreId(e.target.value)}
                    options={stores.map(s => ({ value: s.id, label: s.name }))}
                  />
                </div>
                <Input
                  label="Sales Quantity"
                  type="number"
                  required
                  min={1}
                  value={saleQty}
                  onChange={(e) => setSaleQty(Number(e.target.value))}
                />
              </div>
              <Input
                label="Remarks / Reference"
                value={saleRemarks}
                onChange={(e) => setSaleRemarks(e.target.value)}
                placeholder="POS Bill #1234"
              />
              <Button type="submit" variant="primary" className="w-full shadow-sm">
                Depelete Stock balances
              </Button>
            </form>
          </Card>

          {/* POS Automated KOT Simulation Panel */}
          <Card className="p-6 border-indigo-100 bg-indigo-50/10">
            <div className="border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                <Sparkles className="w-5 h-5 text-brand" />
                <span>Simulate Automated KOT Sale</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Simulates the POS integration automatically depleting recipe ingredients.</p>
            </div>
            <form onSubmit={handleSimulateKOT} className="space-y-4">
              <Input
                label="KOT Ticket Number"
                required
                value={kotNumber}
                onChange={(e) => setKotNumber(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">KOT Recipe Code</label>
                  <Select
                    value={kotRecipeCode}
                    onChange={(e) => setKotRecipeCode(e.target.value)}
                    options={recipes.map(r => ({ value: r.code, label: `${r.name} (${r.code})` }))}
                  />
                </div>
                <Input
                  label="KOT Quantity"
                  type="number"
                  required
                  min={1}
                  value={kotQty}
                  onChange={(e) => setKotQty(Number(e.target.value))}
                />
              </div>
              <Input
                label="Table / Room Number (Optional)"
                value={kotRoomNumber}
                onChange={(e) => setKotRoomNumber(e.target.value)}
                placeholder="Room 102"
              />
              <Button type="submit" variant="primary" className="w-full">
                Simulate KOT Ticket Sync
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* ─── TAB: HOUSEKEEPING CONSUMPTION ───────────────────────────────── */}
      {activeTab === 'housekeeping' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Housekeeping templates builder */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-5">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-900">Configure Clean Checklists</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-semibold">Define quantities of toiletries depleted per clean event.</p>
              </div>
              <form onSubmit={handleSaveCleanTemplate} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Clean Event Type</label>
                  <Select
                    value={configCleanType}
                    onChange={(e) => setConfigCleanType(e.target.value)}
                    options={[
                      { value: 'FULL_CLEAN', label: 'Full Clean (Checkout)' },
                      { value: 'TOUCHUP_CLEAN', label: 'Touchup Clean (Stayover)' },
                      { value: 'DEEP_CLEAN', label: 'Deep Clean (Monthly)' }
                    ]}
                  />
                </div>

                <div className="border border-slate-200 p-4 rounded-xl bg-slate-50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Add Item to Template</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Toiletries / Supply</label>
                      <Select
                        value={configItemId}
                        onChange={(e) => setConfigItemId(e.target.value)}
                        options={catalogItems
                          .filter(i => i.category === 'Housekeeping')
                          .map(i => ({ value: i.id, label: i.name }))}
                      />
                    </div>
                    <Input
                      label="Qty Depleted"
                      type="number"
                      step="any"
                      value={configQty}
                      onChange={(e) => setConfigQty(e.target.value)}
                      placeholder="e.g., 2"
                    />
                  </div>
                  <Button type="button" onClick={addConfigItem} variant="secondary" className="w-full h-9">
                    Add Item
                  </Button>
                </div>

                {configItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Checklist Items</span>
                    <div className="border border-slate-200 rounded-lg p-2.5 bg-white space-y-1.5 max-h-40 overflow-y-auto">
                      {configItems.map((item, idx) => {
                        const dbItem = catalogItems.find(i => i.id === item.itemId);
                        return (
                          <div key={idx} className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>{dbItem?.name} (x{item.quantity})</span>
                            <button type="button" onClick={() => removeConfigItem(idx)} className="text-red-500 hover:text-red-700 font-bold">
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button type="submit" variant="primary" className="w-full">
                  Save Template Checklist
                </Button>
              </form>
            </Card>
          </div>

          {/* Log Clean Event and Simulator */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Manual Clean Log</h3>
              <form onSubmit={handleLogClean} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Clean Type</label>
                    <Select
                      value={cleanType}
                      onChange={(e) => setCleanType(e.target.value)}
                      options={[
                        { value: 'FULL_CLEAN', label: 'Full Clean (Checkout)' },
                        { value: 'TOUCHUP_CLEAN', label: 'Touchup Clean (Stayover)' },
                        { value: 'DEEP_CLEAN', label: 'Deep Clean (Monthly)' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Housekeeping Store</label>
                    <Select
                      value={cleanStoreId}
                      onChange={(e) => setCleanStoreId(e.target.value)}
                      options={stores.map(s => ({ value: s.id, label: s.name }))}
                    />
                  </div>
                </div>
                <Input
                  label="Remarks"
                  value={cleanRemarks}
                  onChange={(e) => setCleanRemarks(e.target.value)}
                  placeholder="Room 203 checkout clean"
                />
                <Button type="submit" variant="primary" className="w-full shadow-sm">
                  Process Clean Depletion
                </Button>
              </form>
            </Card>

            <Card className="p-6 border-indigo-100 bg-indigo-50/10">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-1.5">
                  <Sparkles className="w-5 h-5 text-brand" />
                  <span>Simulate PMS Room Clean Event</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-semibold">Simulates checkout triggers from Property Management Systems automatically depleting toiletries.</p>
              </div>
              <form onSubmit={handleSimulateRoomEvent} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Room Number"
                    required
                    value={eventRoomNumber}
                    onChange={(e) => setEventRoomNumber(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Event Type</label>
                    <Select
                      value={eventType}
                      onChange={(e) => setEventType(e.target.value)}
                      options={[
                        { value: 'CHECKOUT', label: 'CHECKOUT (Triggers Full Clean)' },
                        { value: 'DAILY_SERVICE', label: 'DAILY SERVICE (Triggers Full Clean)' }
                      ]}
                    />
                  </div>
                </div>
                <Input
                  label="Event Date"
                  type="date"
                  required
                  value={eventDateCode}
                  onChange={(e) => setEventDateCode(e.target.value)}
                />
                <Button type="submit" variant="primary" className="w-full">
                  Simulate PMS Hook Trigger
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB: WASTAGE LOGGING ──────────────────────────────────────── */}
      {activeTab === 'wastage' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form on left */}
          <Card className="lg:col-span-1 p-5 self-start">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">Log Stock Wastage</h3>
            <form onSubmit={handleLogWastage} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Wasted Item</label>
                <Select
                  value={wasteItemId}
                  onChange={(e) => setWasteItemId(e.target.value)}
                  options={catalogItems.map(item => ({ value: item.id, label: item.name }))}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Source Store</label>
                  <Select
                    value={wasteStoreId}
                    onChange={(e) => setWasteStoreId(e.target.value)}
                    options={stores.map(s => ({ value: s.id, label: s.name }))}
                  />
                </div>
                <Input
                  label="Qty Wasted"
                  type="number"
                  required
                  step="any"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  placeholder="e.g., 3.0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reason Category</label>
                <Select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  options={[
                    { value: 'SPOILED', label: 'Spoiled / Expired' },
                    { value: 'DAMAGED', label: 'Damaged / Broken' },
                    { value: 'STOLEN', label: 'Theft / Missing' },
                    { value: 'DISCARDED', label: 'Operational Waste' }
                  ]}
                />
              </div>
              <Input
                label="Detailed Remarks"
                value={wasteRemarks}
                onChange={(e) => setWasteRemarks(e.target.value)}
                placeholder="Bag fell and burst"
              />
              <Button type="submit" variant="danger" className="w-full">
                Log Wastage Discard
              </Button>
            </form>
          </Card>

          {/* Table on right */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
                <History className="w-5 h-5 text-slate-400" />
                <span>Recent Wastage Logs</span>
              </h3>
              {wastageLogs.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-semibold">No wastage records logged yet.</div>
              ) : (
                <Table headers={['Wasted Product', 'Store Location', 'Quantity Discarded', 'Reason Tag', 'Logged By', 'Date']}>
                  {wastageLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 font-bold text-slate-900">{log.item.name}</td>
                      <td className="py-3 px-6 text-slate-650 font-semibold">{log.store.name}</td>
                      <td className="py-3 px-6 text-red-600 font-bold">{log.quantity} {log.item.consumptionUnit}</td>
                      <td className="py-3 px-6">
                        <Badge status={log.reason} />
                      </td>
                      <td className="py-3 px-6 font-semibold text-slate-650 text-xs">{log.recordedBy.name}</td>
                      <td className="py-3 px-6 text-slate-400 font-mono text-xs">{new Date(log.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ─── TAB: UNIFIED STOCK LEDGER ─────────────────────────────────── */}
      {activeTab === 'ledger' && (
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <ClipboardList className="w-5 h-5 text-brand" />
              <span>Unified Inventory Transaction Ledger</span>
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-44">
                <Select
                  value={ledgerFilterStore}
                  onChange={(e) => setLedgerFilterStore(e.target.value)}
                  options={[
                    { value: '', label: 'All Store Locations' },
                    ...stores.map(s => ({ value: s.id, label: s.name }))
                  ]}
                />
              </div>
              <div className="relative flex-grow max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Filter by item or type..."
                  value={ledgerSearchItem}
                  onChange={(e) => setLedgerSearchItem(e.target.value)}
                  className="w-full pl-9 pr-4 h-11 bg-slate-50 border border-slate-200 focus:border-brand rounded-[10px] text-slate-900 text-sm focus:outline-none transition-all placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {ledgerLoading ? (
            <div className="text-center py-12 text-slate-500 font-medium">Querying ledger records...</div>
          ) : filteredLedger.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">No transactions match active filters.</div>
          ) : (
            <Table headers={['Transaction ID', 'Item Details', 'Store Room', 'Event Type', 'Quantity Delta', 'Book WAC Price', 'Remarks / User', 'Timestamp']}>
              {filteredLedger.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-6 font-mono text-[11px] text-slate-450">{tx.id.substring(0, 10)}...</td>
                  <td className="py-3 px-6">
                    <span className="font-bold text-slate-900 text-sm block">{tx.item.name}</span>
                    <span className="text-[10px] text-slate-450 mt-0.5 block font-semibold">SKU: {tx.item.sku || 'N/A'}</span>
                  </td>
                  <td className="py-3 px-6 text-slate-650 font-semibold">{tx.store.name}</td>
                  <td className="py-3 px-6">
                    <Badge status={tx.type} />
                  </td>
                  <td className={`py-3 px-6 font-bold text-right ${tx.quantity > 0 ? 'text-green-600' : tx.quantity === 0 ? 'text-slate-500' : 'text-red-650 text-red-600'}`}>
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.item.consumptionUnit}
                  </td>
                  <td className="py-3 px-6 font-mono text-slate-700 text-right">₹{tx.costPrice.toFixed(2)}</td>
                  <td className="py-3 px-6">
                    <div className="text-slate-705 text-xs font-semibold truncate max-w-xs">{tx.remarks || 'No remarks'}</div>
                    <div className="text-[10px] text-slate-400 font-bold mt-0.5">User: {tx.recordedBy?.name || 'Automated Sync'}</div>
                  </td>
                  <td className="py-3 px-6 text-slate-400 font-mono text-xs">{new Date(tx.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
