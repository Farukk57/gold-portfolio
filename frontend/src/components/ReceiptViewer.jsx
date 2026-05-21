import React, { useState, useEffect } from 'react';
import { X, Download, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useT } from '../i18n';

function isImage(filename) {
  return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(filename || '');
}

export default function ReceiptViewer({ receipts, startIndex = 0, onClose }) {
  const t = useT();
  const [idx, setIdx] = useState(startIndex);
  const receipt = receipts[idx];
  const url = `/api/receipts/${receipt.id}/file`;
  const img = isImage(receipt.filename);
  const pdf = /\.pdf$/i.test(receipt.filename || '');

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft'  && idx > 0)                  setIdx(i => i - 1);
      if (e.key === 'ArrowRight' && idx < receipts.length - 1) setIdx(i => i + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, receipts.length, onClose]);

  return (
    /* Explicit viewport size avoids any overflow/clip interaction with body */
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(0,0,0,0.93)',
      zIndex: 400,
      display: 'flex', flexDirection: 'column',
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.25rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          {receipts.length > 1 && (
            <>
              <button onClick={() => setIdx(i => i - 1)} disabled={idx === 0}
                style={{ background: 'none', border: 'none', color: idx === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', cursor: idx === 0 ? 'default' : 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
                <ChevronLeft size={18} />
              </button>
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{idx + 1} / {receipts.length}</span>
              <button onClick={() => setIdx(i => i + 1)} disabled={idx === receipts.length - 1}
                style={{ background: 'none', border: 'none', color: idx === receipts.length - 1 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', cursor: idx === receipts.length - 1 ? 'default' : 'pointer', padding: '4px', display: 'flex', flexShrink: 0 }}>
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {receipt.original_name || t('receipt')}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <a href={url} download={receipt.original_name}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', fontSize: '13px', textDecoration: 'none' }}>
            <Download size={13} />
          </a>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', padding: '7px', display: 'flex', borderRadius: '8px' }}>
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Media area — position:relative so children can use inset/absolute ── */}
      <div style={{ flex: 1, position: 'relative' }}>

        {img && (
          <img
            key={receipt.id}
            src={url}
            alt={receipt.original_name}
            style={{
              position: 'absolute',
              inset: '1rem',
              width: 'calc(100% - 2rem)',
              height: 'calc(100% - 2rem)',
              objectFit: 'contain',
              objectPosition: 'center',
              borderRadius: '6px',
            }}
          />
        )}

        {pdf && (
          <iframe
            key={receipt.id}
            src={url}
            title={receipt.original_name}
            style={{
              position: 'absolute',
              inset: '1rem',
              width: 'calc(100% - 2rem)',
              height: 'calc(100% - 2rem)',
              border: 'none',
              borderRadius: '6px',
            }}
          />
        )}

        {!img && !pdf && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)', gap: '1rem',
          }}>
            <FileText size={48} />
            <div style={{ fontSize: '14px' }}>{receipt.original_name}</div>
            <a href={url} download={receipt.original_name}
              style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: '14px' }}>
              {t('downloadFile')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
