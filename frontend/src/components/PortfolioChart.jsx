import React, { useEffect, useState, useMemo } from 'react';
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getPortfolioHistory } from '../api';

const RANGES = ['1W', '1M', '3M', '6M', '1Y', '2Y', 'ALL'];
const RANGE_DAYS = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365, '2Y': 730 };

function filterData(data, range) {
  if (range === 'ALL') return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RANGE_DAYS[range]);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter(d => d.timestamp >= cutoffStr);
}

function xFmt(v, range) {
  const d = new Date(v.slice(0, 10) + 'T12:00:00');
  if (range === '1W') return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
  if (range === '1M' || range === '3M') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

const CustomTooltip = ({ active, payload, label, symbol, rate, decimals, t }) => {
  if (!active || !payload?.length) return null;
  const value = payload.find(p => p.dataKey === 'value')?.value ?? 0;
  const cost  = payload.find(p => p.dataKey === 'cost_basis')?.value ?? 0;
  const pl    = value - cost;
  const isPos = pl >= 0;
  const f = (n) => `${symbol}${(n * rate).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', boxShadow: 'var(--shadow)', minWidth: 160 }}>
      <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '6px' }}>
        {new Date(label.slice(0, 10) + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      <div style={{ color: '#f5c842', fontWeight: 700, fontSize: '15px' }}>{f(value)}</div>
      {cost > 0 && <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '3px' }}>{t('paid')}: {f(cost)}</div>}
      {cost > 0 && (
        <div style={{ color: isPos ? 'var(--green)' : 'var(--red)', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
          {isPos ? '▲ +' : '▼ '}{f(Math.abs(pl))}
        </div>
      )}
    </div>
  );
};

function RangeBar({ ranges, active, onSelect, allLabel }) {
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--surface2)', borderRadius: '8px', padding: '3px', flexShrink: 0 }}>
      {ranges.map(r => (
        <button key={r} onClick={() => onSelect(r)}
          style={{ padding: '4px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 600, minHeight: 28, minWidth: 32, background: active === r ? 'var(--gold)' : 'transparent', color: active === r ? '#000' : 'var(--text-dim)', transition: 'background 0.15s, color 0.15s' }}>
          {r === 'ALL' ? allLabel : r}
        </button>
      ))}
    </div>
  );
}

export default function PortfolioChart({ currency, t = k => k }) {
  const [data, setData] = useState([]);
  const [range, setRange] = useState('ALL');
  const { symbol = '$', rate = 1, decimals = 2 } = currency || {};

  useEffect(() => { getPortfolioHistory().then(setData); }, []);

  const filtered = useMemo(() => filterData(data, range), [data, range]);

  if (!data.length) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>{t('loadingChart')}</div>;
  if (data.length < 2) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>{t('buildingHistory')}</div>;
  if (!filtered.length) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>{t('noData')}</div>;

  const last = data[data.length - 1];
  const filteredFirst = filtered[0];
  const pl    = last.value - last.cost_basis;
  const plPct = last.cost_basis > 0 ? ((pl / last.cost_basis) * 100).toFixed(2) : null;
  const isPos = pl >= 0;
  const rangeChange = filtered.length > 1 ? ((filtered[filtered.length-1].value - filteredFirst.value) / (filteredFirst.value || 1) * 100).toFixed(2) : null;
  const rangeUp = parseFloat(rangeChange) >= 0;
  const f = (n) => `${symbol}${(n * rate).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)' }}>{f(last.value)}</span>
            {rangeChange && (
              <span style={{ fontSize: '13px', color: rangeUp ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                {rangeUp ? '▲' : '▼'} {Math.abs(parseFloat(rangeChange))}%
                <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '4px' }}>({range})</span>
              </span>
            )}
          </div>
          {plPct && (
            <div style={{ fontSize: '12px', color: isPos ? 'var(--green)' : 'var(--red)', marginTop: '2px' }}>
              {t('paid')}: {f(last.cost_basis)} &nbsp;·&nbsp; {t('pl')}: {isPos ? '+' : ''}{f(pl)} ({isPos ? '+' : ''}{plPct}%)
            </div>
          )}
        </div>
        <RangeBar ranges={RANGES} active={range} onSelect={setRange} allLabel={t('rangeAll')} />
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolio-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f5c842" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f5c842" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" tickFormatter={v => xFmt(v, range)}
            tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} axisLine={false}
            interval="preserveStartEnd" minTickGap={50} />
          <YAxis domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
            tickFormatter={v => `${symbol}${(v * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            width={76} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip symbol={symbol} rate={rate} decimals={decimals} t={t} />} />
          <Area type="monotone" dataKey="value" stroke="#f5c842" strokeWidth={2} fill="url(#portfolio-grad)" dot={false} activeDot={{ r: 4, fill: '#f5c842' }} />
          <Line type="stepAfter" dataKey="cost_basis" stroke="var(--text-dim)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 20, height: 2, background: '#f5c842' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t('portfolioHistory')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 20, height: 2, backgroundImage: 'repeating-linear-gradient(90deg, var(--text-dim) 0, var(--text-dim) 5px, transparent 5px, transparent 9px)' }} />
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{t('costBasis')}</span>
        </div>
      </div>
    </div>
  );
}
