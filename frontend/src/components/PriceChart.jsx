import React, { useEffect, useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getPriceHistory } from '../api';

const METAL_COLORS = { gold: '#f5c842', silver: '#c0c0c0', platinum: '#9eafc2', palladium: '#b69d74' };
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

const CustomTooltip = ({ active, payload, label, symbol, rate, decimals, perOz }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', boxShadow: 'var(--shadow)' }}>
      <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '4px' }}>
        {new Date(label.slice(0, 10) + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px' }}>
        {symbol}{(payload[0].value * rate).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
        <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontSize: '12px' }}>{perOz}</span>
      </div>
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

export default function PriceChart({ metal, currency, t = k => k }) {
  const [data, setData] = useState([]);
  const [range, setRange] = useState('1Y');
  const color = METAL_COLORS[metal] || '#888';
  const { symbol = '$', rate = 1, decimals = 2 } = currency || {};

  useEffect(() => {
    setData([]);
    getPriceHistory(metal, 730).then(setData);
  }, [metal]);

  const filtered = useMemo(() => filterData(data, range), [data, range]);

  if (!data.length) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>{t('loadingChart')}</div>;
  if (!filtered.length) return <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '2rem' }}>{t('noData')}</div>;

  const first = filtered[0].price;
  const last  = filtered[filtered.length - 1].price;
  const changePct = first > 0 ? ((last - first) / first * 100) : 0;
  const isUp = changePct >= 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color }}>
            {symbol}{(last * rate).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
          </span>
          <span style={{ fontSize: '13px', color: isUp ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
            {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
            <span style={{ color: 'var(--text-dim)', fontWeight: 400, marginLeft: '4px' }}>({range})</span>
          </span>
        </div>
        <RangeBar ranges={RANGES} active={range} onSelect={setRange} allLabel={t('rangeAll')} />
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={filtered} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${metal}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="timestamp" tickFormatter={v => xFmt(v, range)}
            tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} axisLine={false}
            interval="preserveStartEnd" minTickGap={50} />
          <YAxis domain={['auto', 'auto']}
            tick={{ fill: 'var(--text-dim)', fontSize: 11 }}
            tickFormatter={v => `${symbol}${(v * rate).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            width={72} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip symbol={symbol} rate={rate} decimals={decimals} perOz={t('perOz')} />} />
          <Area type="monotone" dataKey="price" stroke={color} strokeWidth={2} fill={`url(#grad-${metal})`} dot={false} activeDot={{ r: 4, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
