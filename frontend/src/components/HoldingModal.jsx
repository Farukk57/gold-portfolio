import React, { useState, useEffect } from 'react';
import { X, Bookmark } from 'lucide-react';
import { PRESET_TEMPLATES, CATEGORIES } from '../templates';

const METALS = ['gold', 'silver', 'platinum', 'palladium'];
const CARATS = ['24k', '22k', '21k', '18k', '14k', '9k'];

const inp = (err) => ({
  background: 'var(--surface2)',
  border: `1px solid ${err ? 'var(--red)' : 'var(--border)'}`,
  borderRadius: '8px', padding: '11px 12px', color: 'var(--text)',
  fontSize: '15px', outline: 'none', width: '100%',
});
const lbl = { fontSize: '11px', fontWeight: 500, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'block' };

function validate(form, t) {
  const errs = {};
  if (!form.name.trim()) errs.name = t('errName');
  const w = parseFloat(form.weight_grams);
  if (!form.weight_grams || isNaN(w)) errs.weight = t('errWeight');
  else if (w <= 0) errs.weight = t('errWeight');
  if (form.purchase_price !== '') {
    const p = parseFloat(form.purchase_price);
    if (isNaN(p) || p < 0) errs.purchase_price = t('errPrice');
  }
  const q = parseInt(form.quantity, 10);
  if (isNaN(q) || q < 1 || q > 99) errs.quantity = t('errQty');
  return errs;
}

function TemplateChip({ template, selected, onSelect, onDelete }) {
  return (
    <button type="button" onClick={() => onSelect(template)}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${selected ? 'var(--gold)' : 'var(--border)'}`, background: selected ? 'rgba(245,200,66,0.15)' : 'var(--surface2)', color: selected ? 'var(--gold)' : 'var(--text)', fontSize: '12px', fontWeight: selected ? 600 : 400, transition: 'all 0.15s' }}>
      <span>{template.name}</span>
      <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{template.weight_grams}g</span>
      {onDelete && (
        <span onClick={e => { e.stopPropagation(); onDelete(template.id); }}
          style={{ color: 'var(--red)', opacity: 0.6, display: 'flex', alignItems: 'center', marginLeft: '2px' }}>
          <X size={11} />
        </span>
      )}
    </button>
  );
}

function Stepper({ value, onChange, min = 1, max = 99 }) {
  return (
    <div className="stepper">
      <button type="button" className="stepper-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <input
        className="stepper-val"
        type="number" min={min} max={max} inputMode="numeric"
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v) && v >= min && v <= max) onChange(v);
        }}
      />
      <button type="button" className="stepper-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  );
}

export default function HoldingModal({ holding, onClose, onSave, currency, customTemplates = [], onDeleteTemplate, onSaveTemplate, t }) {
  const [category, setCategory] = useState('turkish');
  const [selectedTplId, setSelectedTplId] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { symbol = '$', rate = 1, code = 'USD' } = currency || {};

  const emptyForm = { name: '', metal: 'gold', carat: '22k', weight_grams: '', purchase_price: '', purchase_date: '', notes: '', quantity: 1 };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (holding) {
      setForm({
        name: holding.name,
        metal: holding.metal,
        carat: holding.carat || '22k',
        weight_grams: holding.weight_grams,
        // Convert stored USD to display currency
        purchase_price: holding.purchase_price != null ? (holding.purchase_price * rate).toFixed(2) : '',
        purchase_date: holding.purchase_date ?? '',
        notes: holding.notes ?? '',
        quantity: 1,
      });
    }
  }, [holding, rate]);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (submitted) setErrors(e => ({ ...e, [k]: undefined }));
  };

  const applyTemplate = (tpl) => {
    setSelectedTplId(tpl.id || tpl.name);
    setForm(f => ({
      ...f,
      name: tpl.name,
      metal: tpl.metal,
      carat: tpl.carat || (tpl.metal === 'gold' ? '24k' : null),
      weight_grams: tpl.weight_grams,
      notes: tpl.notes || '',
    }));
    if (submitted) setErrors({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const errs = validate(form, t);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const purchasePriceUsd = form.purchase_price !== ''
      ? parseFloat(form.purchase_price) / rate   // convert display currency → USD
      : null;

    onSave({
      name: form.name.trim(),
      metal: form.metal,
      carat: form.metal === 'gold' ? form.carat : null,
      weight_grams: parseFloat(form.weight_grams),
      purchase_price: purchasePriceUsd,
      purchase_date: form.purchase_date || null,
      notes: form.notes.trim() || null,
    }, parseInt(form.quantity, 10));
  };

  const handleSaveTemplate = () => {
    if (!form.name.trim() || !form.weight_grams) return;
    onSaveTemplate({
      name: form.name.trim(),
      metal: form.metal,
      carat: form.metal === 'gold' ? form.carat : null,
      weight_grams: parseFloat(form.weight_grams),
      notes: form.notes.trim() || null,
    });
  };

  const visiblePresets = PRESET_TEMPLATES.filter(tpl => tpl.category === category);

  const categoryTabs = [
    { key: 'turkish', label: t('turkish') },
    { key: 'german',  label: t('german') },
    { key: 'international', label: t('international') },
    { key: 'custom', label: `⭐ ${t('myTemplates')} (${customTemplates.length})` },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 1.25rem' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)' }}>
            {holding ? t('editHolding') : t('addHolding')}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '6px', minWidth: 36, minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
            <X size={20} />
          </button>
        </div>

        {/* ── Template picker (add mode only) ── */}
        {!holding && (
          <div style={{ marginBottom: '1.25rem', background: 'var(--surface2)', borderRadius: '12px', padding: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              {t('quickAdd')}
            </div>
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '10px', scrollbarWidth: 'none' }}>
              {categoryTabs.map(c => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)}
                  style={{ padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: category === c.key ? 600 : 400, background: category === c.key ? 'var(--gold)' : 'var(--surface)', color: category === c.key ? '#000' : 'var(--text-dim)', minHeight: 30 }}>
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '108px', overflowY: 'auto' }}>
              {category === 'custom'
                ? (customTemplates.length === 0
                    ? <span style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '4px' }}>{t('noCustomTemplates')}</span>
                    : customTemplates.map(tpl => <TemplateChip key={tpl.id} template={tpl} selected={selectedTplId === tpl.id} onSelect={applyTemplate} onDelete={onDeleteTemplate} />)
                  )
                : visiblePresets.map(tpl => <TemplateChip key={tpl.id} template={tpl} selected={selectedTplId === tpl.id} onSelect={applyTemplate} />)
              }
            </div>
          </div>
        )}

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-grid">

            {/* Name */}
            <div className="field-full">
              <label style={lbl}>{t('name')}</label>
              <input style={inp(errors.name)} value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('namePlaceholder')} />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </div>

            {/* Metal */}
            <div>
              <label style={lbl}>{t('metal')}</label>
              <select style={inp(false)} value={form.metal}
                onChange={e => { set('metal', e.target.value); if (e.target.value !== 'gold') set('carat', null); }}>
                {METALS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>

            {/* Carat (gold only) */}
            {form.metal === 'gold'
              ? <div>
                  <label style={lbl}>{t('carat')}</label>
                  <select style={inp(false)} value={form.carat || '24k'} onChange={e => set('carat', e.target.value)}>
                    {CARATS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              : <div />
            }

            {/* Weight */}
            <div>
              <label style={lbl}>{t('weightGrams')}</label>
              <input style={inp(errors.weight)} type="number" step="0.001" min="0" inputMode="decimal"
                value={form.weight_grams} onChange={e => set('weight_grams', e.target.value)} placeholder="7.216" />
              {errors.weight && <span className="field-error">{errors.weight}</span>}
            </div>

            {/* Purchase Price in selected currency */}
            <div>
              <label style={lbl}>{t('purchasePrice')} ({code})</label>
              <input style={inp(errors.purchase_price)} type="number" step="0.01" min="0" inputMode="decimal"
                value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)}
                placeholder={t('optional')} />
              {errors.purchase_price && <span className="field-error">{errors.purchase_price}</span>}
            </div>

            {/* Purchase Date */}
            <div>
              <label style={lbl}>{t('purchaseDate')}</label>
              <input style={inp(false)} type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} />
            </div>

            {/* Quantity (add mode only) */}
            {!holding && (
              <div>
                <label style={lbl}>{t('quantity')}</label>
                <Stepper value={form.quantity} onChange={v => set('quantity', v)} />
                {errors.quantity && <span className="field-error">{errors.quantity}</span>}
              </div>
            )}

            {/* Notes */}
            <div className={holding ? 'field-full' : ''}>
              <label style={lbl}>{t('notes')}</label>
              <textarea style={{ ...inp(false), resize: 'vertical', minHeight: '64px' }}
                value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={t('optional') + '…'} />
            </div>

          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {!holding && (
              <button type="button" onClick={handleSaveTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px', minHeight: 44 }}>
                <Bookmark size={13} /> {t('saveTemplate')}
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" onClick={onClose}
              style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '14px', minHeight: 44 }}>
              {t('cancel')}
            </button>
            <button type="submit"
              style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: 'var(--gold)', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px', minHeight: 44 }}>
              {holding ? t('update') : (form.quantity > 1 ? `${t('add')} ×${form.quantity}` : t('add'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
