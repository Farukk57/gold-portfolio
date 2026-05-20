import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Plus, RefreshCw, Trash2, Edit2, TrendingUp, TrendingDown, Coins, Sun, Moon } from 'lucide-react';
import { getHoldings, getSummary, createHolding, updateHolding, deleteHolding, refreshPrices, getExchangeRates, getTemplates, createTemplate, deleteTemplate } from './api';
import HoldingModal from './components/HoldingModal';
import PriceChart from './components/PriceChart';
import PortfolioChart from './components/PortfolioChart';
import { useT, useLang, setLang, LANGS } from './i18n';

const METAL_COLORS = { gold: '#f5c842', silver: '#c0c0c0', platinum: '#9eafc2', palladium: '#b69d74' };
const METAL_ICONS  = { gold: '🥇', silver: '🥈', platinum: '💎', palladium: '⚪' };

const CURRENCY_META = {
  USD: { symbol: '$',    decimals: 2 }, EUR: { symbol: '€',    decimals: 2 },
  GBP: { symbol: '£',   decimals: 2 }, CHF: { symbol: 'Fr.',  decimals: 2 },
  JPY: { symbol: '¥',   decimals: 0 }, TRY: { symbol: '₺',   decimals: 2 },
  CAD: { symbol: 'C$',  decimals: 2 }, AED: { symbol: 'AED ', decimals: 2 },
  AUD: { symbol: 'A$',  decimals: 2 }, CNY: { symbol: '¥',   decimals: 2 },
  SEK: { symbol: 'kr',  decimals: 2 },
};

function useSaved(key, def) {
  const [val, set] = useState(() => { try { const s = localStorage.getItem(key); return s != null ? JSON.parse(s) : def; } catch { return def; } });
  const save = useCallback(v => { set(v); try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key]);
  return [val, save];
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`}>{toast.msg}</div>;
}

export default function App() {
  const t = useT();
  const lang = useLang();

  const [theme, setTheme]         = useSaved('theme', 'dark');
  const [currCode, setCurrCode]   = useSaved('currency', 'USD');
  const [rates, setRates]         = useState({ USD: 1 });
  const [holdings, setHoldings]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [selectedMetal, setSelectedMetal] = useState('gold');
  const [modal, setModal]           = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast]           = useState(null);
  const [portfolioKey, setPortfolioKey] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const toastTimer = useRef(null);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { getExchangeRates().then(setRates); }, []);

  const showToast = useCallback((msg, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const currency = { code: currCode, rate: rates[currCode] ?? 1, ...(CURRENCY_META[currCode] || { symbol: currCode + ' ', decimals: 2 }) };

  const fmt = useCallback((n, dec) => {
    if (n == null) return '—';
    const d = dec ?? currency.decimals;
    return `${currency.symbol}${(Number(n) * currency.rate).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })}`;
  }, [currency]);

  const fmtG = n => `${Number(n).toFixed(2)}g`;
  const metalName = m => t(m);
  const fmtDate = dateStr => {
    if (!dateStr) return '—';
    try { return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  };

  const handleSort = key => setSortConfig(prev =>
    prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
  );

  const sortedHoldings = useMemo(() => {
    if (!sortConfig.key) return holdings;
    return [...holdings].sort((a, b) => {
      let av, bv;
      if (sortConfig.key === 'pl') {
        av = a.current_value_usd != null && a.purchase_price != null ? a.current_value_usd - a.purchase_price : null;
        bv = b.current_value_usd != null && b.purchase_price != null ? b.current_value_usd - b.purchase_price : null;
      } else {
        av = a[sortConfig.key];
        bv = b[sortConfig.key];
      }
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return sortConfig.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortConfig.dir === 'asc' ? av - bv : bv - av;
    });
  }, [holdings, sortConfig]);

  const load = useCallback(async () => {
    const [h, s, tmpl] = await Promise.all([getHoldings(), getSummary(), getTemplates()]);
    setHoldings(h);
    setSummary(s);
    setCustomTemplates(tmpl);
    setPortfolioKey(k => k + 1);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPrices();
    await load();
    setRefreshing(false);
  };

  const handleSave = async (data, quantity = 1) => {
    try {
      if (modal?.id) {
        await updateHolding(modal.id, data);
        showToast(t('updatedToast', { name: data.name }));
      } else {
        await Promise.all(Array.from({ length: quantity }, () => createHolding(data)));
        showToast(t('addedToast', { n: quantity, name: data.name }));
      }
      setModal(null);
      load();
    } catch {
      showToast('Error saving holding', 'error');
    }
  };

  const handleDelete = (id, name) => setConfirmDelete({ id, name });

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    await deleteHolding(confirmDelete.id);
    setConfirmDelete(null);
    showToast(t('deletedToast'));
    load();
  };

  const handleSaveTemplate = async (data) => {
    const tmpl = await createTemplate(data);
    setCustomTemplates(prev => [tmpl, ...prev]);
    showToast(t('templateSaved'));
  };

  const handleDeleteTemplate = async (id) => {
    await deleteTemplate(id);
    setCustomTemplates(prev => prev.filter(x => x.id !== id));
  };

  const gainLoss = summary?.gain_loss_usd;
  const isGain = gainLoss > 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 34, height: 34, borderRadius: '10px', background: 'linear-gradient(135deg,#f5c842,#c9a227)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', flexShrink: 0 }}>🏅</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)', lineHeight: 1.2 }}>{t('title')}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{t('subtitle')}</div>
          </div>
        </div>

        <div className="header-actions">
          <select className="currency-select" value={lang} onChange={e => setLang(e.target.value)}>
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="currency-select" value={currCode} onChange={e => setCurrCode(e.target.value)}>
            {Object.keys(CURRENCY_META).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="icon-btn" onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? t('lightMode') : t('darkMode')}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={handleRefresh} disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '13px', height: 40 }}>
            <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
            <span className="btn-label">{t('refresh')}</span>
          </button>
          <button onClick={() => setModal('new')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px', borderRadius: '8px', border: 'none', background: 'var(--gold)', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: '13px', height: 40 }}>
            <Plus size={14} />
            <span className="btn-label">{t('add')}</span>
          </button>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>{t('loading')}</div>
        ) : (
          <>
            {/* ── Summary Cards ── */}
            <div className="summary-grid">
              <SummaryCard label={t('portfolioValue')}  value={fmt(summary?.total_value_usd)}  accent="var(--gold)" icon={<Coins size={18} />} />
              <SummaryCard label={t('totalInvested')}   value={fmt(summary?.total_purchase_usd)} accent="var(--text-dim)" />
              <SummaryCard
                label={t('gainLoss')}
                value={gainLoss != null ? `${isGain ? '+' : ''}${fmt(gainLoss)}` : '—'}
                accent={gainLoss == null ? 'var(--text-dim)' : isGain ? 'var(--green)' : 'var(--red)'}
                icon={gainLoss != null ? (isGain ? <TrendingUp size={18} /> : <TrendingDown size={18} />) : null}
              />
              {summary && Object.entries(summary.prices || {}).map(([metal, price]) => (
                <SummaryCard key={metal} label={`${metalName(metal)} ${t('perOz')}`} value={fmt(price)} accent={METAL_COLORS[metal]} />
              ))}
            </div>

            {/* ── Portfolio Value History ── */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>{t('portfolioHistory')}</h2>
              <PortfolioChart key={portfolioKey} currency={currency} t={t} />
            </div>

            {/* ── Price Charts ── */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="chart-header">
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('priceHistory')}</h2>
                <div className="metal-tabs">
                  {['gold', 'silver', 'platinum', 'palladium'].map(m => (
                    <button key={m} onClick={() => setSelectedMetal(m)}
                      style={{ padding: '7px 14px', borderRadius: '8px', border: `1px solid ${selectedMetal === m ? METAL_COLORS[m] : 'var(--border)'}`, background: selectedMetal === m ? `${METAL_COLORS[m]}22` : 'none', color: selectedMetal === m ? METAL_COLORS[m] : 'var(--text-dim)', cursor: 'pointer', fontSize: '13px', fontWeight: selectedMetal === m ? 600 : 400, whiteSpace: 'nowrap', minHeight: 36 }}>
                      {metalName(m)}
                    </button>
                  ))}
                </div>
              </div>
              <PriceChart metal={selectedMetal} currency={currency} t={t} />
            </div>

            {/* ── Allocation ── */}
            {summary && Object.keys(summary.by_metal).length > 0 && (
              <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>{t('allocation')}</h2>
                <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', height: '10px', marginBottom: '1rem', background: 'var(--surface2)' }}>
                  {Object.entries(summary.by_metal).map(([metal, data]) => {
                    const pct = summary.total_value_usd > 0 ? (data.value / summary.total_value_usd) * 100 : 0;
                    return <div key={metal} style={{ width: `${pct}%`, background: METAL_COLORS[metal], transition: 'width 0.4s' }} title={`${metal}: ${pct.toFixed(1)}%`} />;
                  })}
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {Object.entries(summary.by_metal).map(([metal, data]) => {
                    const pct = summary.total_value_usd > 0 ? (data.value / summary.total_value_usd) * 100 : 0;
                    return (
                      <div key={metal} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: METAL_COLORS[metal], flexShrink: 0 }} />
                        <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{metalName(metal)}</span>
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{pct.toFixed(1)}%</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>({fmtG(data.weight_grams)})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Holdings ── */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>{t('holdings')} ({holdings.length})</h2>
              </div>

              {holdings.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏅</div>
                  {t('noHoldings')}
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="holdings-table-wrap">
                    <table className="holdings-table">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {[
                            { label: t('metal'),                               key: 'metal' },
                            { label: t('name'),                                key: 'name' },
                            { label: t('weight'),                              key: 'weight_grams' },
                            { label: t('carat'),                               key: 'carat' },
                            { label: t('purchased'),                           key: 'purchase_date' },
                            { label: `${t('spotOz')} (${currCode})`,          key: 'price_per_oz' },
                            { label: `${t('value')} (${currCode})`,           key: 'current_value_usd' },
                            { label: `${t('paid')} (${currCode})`,            key: 'purchase_price' },
                            { label: t('pl'),                                  key: 'pl' },
                            { label: '',                                       key: null },
                          ].map(({ label, key }, i) => (
                            <th key={i} onClick={key ? () => handleSort(key) : undefined}
                              style={{ padding: '11px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: key ? 'pointer' : 'default', userSelect: 'none', color: key && sortConfig.key === key ? 'var(--gold)' : 'var(--text-dim)' }}>
                              {label}
                              {key && <span style={{ marginLeft: '3px', opacity: sortConfig.key === key ? 1 : 0.25 }}>{sortConfig.key === key ? (sortConfig.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedHoldings.map((h, i) => {
                          const pl = h.current_value_usd != null && h.purchase_price != null ? h.current_value_usd - h.purchase_price : null;
                          const isPos = pl > 0;
                          return (
                            <tr key={h.id} style={{ borderBottom: i < sortedHoldings.length - 1 ? '1px solid var(--border)' : 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding: '13px 16px' }}>
                                <span style={{ color: METAL_COLORS[h.metal], fontWeight: 500 }}>{METAL_ICONS[h.metal]} {metalName(h.metal)}</span>
                              </td>
                              <td style={{ padding: '13px 16px', fontWeight: 500 }}>{h.name}</td>
                              <td style={{ padding: '13px 16px', color: 'var(--text-dim)' }}>{fmtG(h.weight_grams)}</td>
                              <td style={{ padding: '13px 16px' }}>
                                {h.carat
                                  ? <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 7px', fontSize: '12px', color: 'var(--gold)' }}>{h.carat}</span>
                                  : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                              </td>
                              <td style={{ padding: '13px 16px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDate(h.purchase_date)}</td>
                              <td style={{ padding: '13px 16px', color: 'var(--text-dim)' }}>{fmt(h.price_per_oz)}</td>
                              <td style={{ padding: '13px 16px', fontWeight: 600 }}>{fmt(h.current_value_usd)}</td>
                              <td style={{ padding: '13px 16px', color: 'var(--text-dim)' }}>{fmt(h.purchase_price)}</td>
                              <td style={{ padding: '13px 16px', fontWeight: 600, color: pl == null ? 'var(--text-dim)' : isPos ? 'var(--green)' : 'var(--red)' }}>
                                {pl != null ? `${isPos ? '+' : ''}${fmt(pl)}` : '—'}
                              </td>
                              <td style={{ padding: '13px 16px' }}>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button onClick={() => setModal(h)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', minWidth: 32, minHeight: 32 }}><Edit2 size={14} /></button>
                                  <button onClick={() => handleDelete(h.id, h.name)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '6px', opacity: 0.7, minWidth: 32, minHeight: 32 }}><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="holdings-cards">
                    {sortedHoldings.map(h => {
                      const pl = h.current_value_usd != null && h.purchase_price != null ? h.current_value_usd - h.purchase_price : null;
                      const isPos = pl > 0;
                      return (
                        <div key={h.id} className="holding-card">
                          <div className="holding-card-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: METAL_COLORS[h.metal], fontWeight: 600 }}>{METAL_ICONS[h.metal]} {metalName(h.metal)}</span>
                              {h.carat && <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', color: 'var(--gold)' }}>{h.carat}</span>}
                            </div>
                            <div className="holding-card-actions">
                              <button onClick={() => setModal(h)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={15} /></button>
                              <button onClick={() => handleDelete(h.id, h.name)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '6px', opacity: 0.7, minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={15} /></button>
                            </div>
                          </div>
                          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{h.name}</div>
                          <div className="holding-card-row" style={{ marginTop: '2px' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{fmtG(h.weight_grams)} · {fmt(h.price_per_oz)}/oz</span>
                            <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--gold)' }}>{fmt(h.current_value_usd)}</span>
                          </div>
                          {h.purchase_date && (
                            <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                              {t('purchased')}: {fmtDate(h.purchase_date)}
                            </div>
                          )}
                          {pl != null && (
                            <div style={{ fontSize: '13px', color: isPos ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                              {isPos ? '▲ +' : '▼ '}{fmt(pl)} {t('paid').toLowerCase()} {fmt(h.purchase_price)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {modal && (
        <HoldingModal
          holding={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
          currency={currency}
          customTemplates={customTemplates}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          t={t}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          name={confirmDelete.name}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={confirmDeleteAction}
          t={t}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}

function ConfirmModal({ name, onCancel, onConfirm, t }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2rem 1.75rem', maxWidth: '340px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow)' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '22px' }}>🗑️</div>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{t('deleteTitle')}</div>
        <div style={{ color: 'var(--gold)', fontWeight: 500, fontSize: '14px', marginBottom: '0.4rem' }}>{name}</div>
        <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '1.75rem' }}>{t('deleteWarning')}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', fontWeight: 500, minHeight: 44 }}>
            {t('cancel')}
          </button>
          <button onClick={onConfirm}
            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--red)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px', minHeight: 44 }}>
            {t('delete')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, icon }) {
  return (
    <div className="card" style={{ padding: '1rem 1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.3 }}>{label}</span>
        {icon && <span style={{ color: accent, opacity: 0.8, flexShrink: 0 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: accent, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}
