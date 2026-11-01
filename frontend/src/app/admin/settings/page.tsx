"use client";

import React, { FormEvent, useCallback, useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import { AlertCircle, Database, Loader2, Save, Settings2 } from "lucide-react";

type Stock = { id: string; fpsShopId: string; commodity: string; quantity: number; unit: string };
type Entitlement = { id: string; category: string; commodity: string; quantity: number; unit: string; pricePerUnit: number };
type PlatformSetting = { key: string; value: unknown; updatedAt: string | null };
const inputClass = "w-full rounded-md border border-border bg-background p-2.5 text-sm text-foreground";

export default function SystemSettingsPage() {
  const [stock, setStock] = useState<Stock[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [stockForm, setStockForm] = useState({ fps_shop_id: "", commodity: "", quantity: "", unit: "KG" });
  const [ruleForm, setRuleForm] = useState({ category: "PHH", commodity: "", quantity: "", unit: "KG", price_per_unit: "" });
  const [settingForm, setSettingForm] = useState({ key: "", value: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [stockResponse, ruleResponse, settingsResponse] = await Promise.all([apiClient.get("/admin/stock"), apiClient.get("/admin/entitlements"), apiClient.get("/admin/settings")]);
      setStock(Array.isArray(stockResponse.data?.stock) ? stockResponse.data.stock : []);
      setEntitlements(Array.isArray(ruleResponse.data?.entitlements) ? ruleResponse.data.entitlements : []);
      setSettings(Array.isArray(settingsResponse.data?.settings) ? settingsResponse.data.settings : []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Platform configuration could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const saveStock = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await apiClient.put("/admin/stock", { ...stockForm, quantity: Number(stockForm.quantity) });
      setNotice("Stock level saved."); setStockForm({ fps_shop_id: "", commodity: "", quantity: "", unit: "KG" }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Stock level was not saved."); }
    finally { setSaving(false); }
  };
  const saveRule = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      await apiClient.put("/admin/entitlements", { ...ruleForm, quantity: Number(ruleForm.quantity), price_per_unit: Number(ruleForm.price_per_unit) });
      setNotice("Entitlement rule saved."); setRuleForm((current) => ({ ...current, commodity: "", quantity: "", price_per_unit: "" })); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Entitlement rule was not saved."); }
    finally { setSaving(false); }
  };

  const saveSetting = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    const key = settingForm.key.trim();
    if (!/^[a-zA-Z0-9_.-]{1,100}$/.test(key) || /(secret|password|token|private_key|api_key)$/i.test(key)) {
      setError("Use a valid non-secret setting key. Credentials and API keys belong in deployment environment variables."); setSaving(false); return;
    }
    let value: unknown;
    try { value = JSON.parse(settingForm.value); }
    catch { setError("Setting value must be valid JSON, such as a quoted string, number, boolean, array, or object."); setSaving(false); return; }
    try {
      await apiClient.put("/admin/settings", { key, value });
      setNotice(`Setting “${key}” saved.`); setSettingForm({ key: "", value: "" }); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Setting was not saved."); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <header className="border-b border-border pb-4"><h1 className="text-xl font-bold text-foreground">Distribution Configuration</h1><p className="mt-1 text-xs text-muted-foreground">Manage the persisted monthly entitlement rules and Fair Price Shop stock used by distribution validation.</p></header>
    {error && <div role="alert" className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
    {notice && <div role="status" className="border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-4 border border-border bg-card p-5"><h2 className="flex items-center gap-2 border-b border-border pb-3 font-semibold text-foreground"><Database className="size-4 text-primary" />Fair Price Shop Stock</h2><form onSubmit={saveStock} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">FPS shop ID<input required value={stockForm.fps_shop_id} onChange={(e) => setStockForm({ ...stockForm, fps_shop_id: e.target.value })} className={inputClass} /></label><label className="text-xs font-semibold">Commodity<input required value={stockForm.commodity} onChange={(e) => setStockForm({ ...stockForm, commodity: e.target.value })} className={inputClass} /></label><label className="text-xs font-semibold">Quantity<input required min="0" type="number" step="any" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} className={inputClass} /></label><label className="text-xs font-semibold">Unit<input required value={stockForm.unit} onChange={(e) => setStockForm({ ...stockForm, unit: e.target.value })} className={inputClass} /></label><button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2"><Save className="size-4" />Save stock</button></form><div className="overflow-x-auto border border-border"><table className="w-full min-w-[420px] text-left text-xs"><thead className="bg-muted/50"><tr>{["FPS", "COMMODITY", "AVAILABLE", "UNIT"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{stock.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-3 py-2 font-mono">{row.fpsShopId}</td><td className="px-3 py-2">{row.commodity}</td><td className="px-3 py-2">{row.quantity}</td><td className="px-3 py-2">{row.unit}</td></tr>)}</tbody></table>{!loading && stock.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No shop stock is configured.</p>}</div></section>
      <section className="space-y-4 border border-border bg-card p-5"><h2 className="flex items-center gap-2 border-b border-border pb-3 font-semibold text-foreground"><Database className="size-4 text-primary" />Monthly Entitlement Rules</h2><form onSubmit={saveRule} className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Category<select value={ruleForm.category} onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })} className={inputClass}><option value="AAY">AAY</option><option value="PHH">PHH</option><option value="NPHH">NPHH</option><option value="SPECIAL">SPECIAL</option></select></label><label className="text-xs font-semibold">Commodity<input required value={ruleForm.commodity} onChange={(e) => setRuleForm({ ...ruleForm, commodity: e.target.value })} className={inputClass} /></label><label className="text-xs font-semibold">Monthly quantity<input required min="0" type="number" step="any" value={ruleForm.quantity} onChange={(e) => setRuleForm({ ...ruleForm, quantity: e.target.value })} className={inputClass} /></label><label className="text-xs font-semibold">Unit<input required value={ruleForm.unit} onChange={(e) => setRuleForm({ ...ruleForm, unit: e.target.value })} className={inputClass} /></label><label className="text-xs font-semibold sm:col-span-2">Subsidized price per unit (₹)<input required min="0" type="number" step="any" value={ruleForm.price_per_unit} onChange={(e) => setRuleForm({ ...ruleForm, price_per_unit: e.target.value })} className={inputClass} /></label><button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 sm:col-span-2"><Save className="size-4" />Save entitlement rule</button></form><div className="overflow-x-auto border border-border"><table className="w-full min-w-[440px] text-left text-xs"><thead className="bg-muted/50"><tr>{["CATEGORY", "COMMODITY", "MONTHLY LIMIT", "RATE"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{entitlements.map((row) => <tr key={row.id} className="border-t border-border"><td className="px-3 py-2">{row.category}</td><td className="px-3 py-2">{row.commodity}</td><td className="px-3 py-2">{row.quantity} {row.unit}</td><td className="px-3 py-2">₹{row.pricePerUnit}/{row.unit}</td></tr>)}</tbody></table>{!loading && entitlements.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No entitlement rules are configured.</p>}</div></section>
    </div>
    <section className="space-y-4 border border-border bg-card p-5"><h2 className="flex items-center gap-2 border-b border-border pb-3 font-semibold text-foreground"><Settings2 className="size-4 text-primary" />Persisted platform settings</h2><p className="text-xs text-muted-foreground">Store non-secret JSON settings for platform workflows. Deployment credentials remain in environment configuration and cannot be stored here.</p><form onSubmit={saveSetting} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]"><label className="text-xs font-semibold">Setting key<input required maxLength={100} pattern="[A-Za-z0-9_.-]+" value={settingForm.key} onChange={(event) => setSettingForm({ ...settingForm, key: event.target.value })} className={inputClass} placeholder="distribution.receipt_label" /></label><label className="text-xs font-semibold">JSON value<input required value={settingForm.value} onChange={(event) => setSettingForm({ ...settingForm, value: event.target.value })} className={inputClass} placeholder='"Configured value" or 10 or {"enabled":true}' /></label><button disabled={saving} className="inline-flex items-end justify-center gap-2 bg-primary px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Save className="size-4" />Save setting</button></form><div className="overflow-x-auto border border-border"><table className="w-full min-w-[520px] text-left text-xs"><thead className="bg-muted/50"><tr>{["KEY", "VALUE", "LAST UPDATED"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody>{settings.map((row) => <tr key={row.key} className="border-t border-border"><td className="px-3 py-2 font-mono">{row.key}</td><td className="max-w-lg break-all px-3 py-2 font-mono">{JSON.stringify(row.value)}</td><td className="px-3 py-2">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "—"}</td></tr>)}</tbody></table>{!loading && settings.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">No non-secret platform settings are configured.</p>}</div></section>
    {loading && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading persisted configuration…</div>}
  </div>;
}
