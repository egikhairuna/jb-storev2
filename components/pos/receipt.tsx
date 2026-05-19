import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import type { CartItem } from "@/types/pos";

interface ReceiptProps {
  order: {
    wcOrderId: string | number;
    customerName: string | null;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    discountType: 'percent' | 'nominal' | null;
    discountValue: number;
    total: number;
    paymentMethod: string;
    cashAmount?: number;
    transferAmount?: number;
    changeAmount?: number;
    orderNote?: string | null;
    createdAt: string;
    cashierName: string;
  };
}

export const receiptPrintAreaClass = "receipt-print-area";

// ── Helpers ──────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

function formatReceiptDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ` +
    `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatRp(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}



// ── Inline style constants ───────────────────────────────

const FONT = "var(--font-receipt), 'Courier New', monospace";

const rootStyle: React.CSSProperties = {
  width: '80mm',
  fontFamily: FONT,
  fontSize: '16px',
  fontWeight: '500',
  fontStretch: 'condensed',
  letterSpacing: '0.3px',
  textTransform: 'uppercase',
  lineHeight: '1.2',
  color: '#000',
  background: '#fff',
  padding: '4mm 3mm 12mm 3mm',
  margin: '0 auto',
  boxSizing: 'border-box' as const,
};

const centerStyle: React.CSSProperties = { textAlign: 'center' };

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'baseline',
};

const solidSepStyle: React.CSSProperties = {
  margin: '3mm 0',
};

const solidSepVisibleStyle: React.CSSProperties = {
  ...solidSepStyle,
  borderTop: '1px dashed #000',
};

const dottedSepStyle: React.CSSProperties = {
  margin: '2mm 0',
};

const dottedSepVisibleStyle: React.CSSProperties = {
  ...dottedSepStyle,
  borderTop: '1px dotted #888',
};

// ── Component ────────────────────────────────────────────

export const Receipt = ({ order }: ReceiptProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const orderId = String(order.wcOrderId);

  useEffect(() => {
    if (barcodeRef.current && orderId) {
      try {
        JsBarcode(barcodeRef.current, orderId, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          background: '#ffffff',
          lineColor: '#000000',
          margin: 0,
          marginLeft: 0,
          marginRight: 0,
        });
      } catch (e) {
        console.warn('Barcode generation failed:', e);
      }
    }
  }, [orderId]);

  const showCustomer = order.customerName && order.customerName !== 'Guest';
  const showDiscount = order.discountAmount > 0;
  const showNote = order.orderNote && order.orderNote.trim().length > 0;

  return (
    <div className={receiptPrintAreaClass} style={rootStyle}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .${receiptPrintAreaClass},
          .${receiptPrintAreaClass} * { visibility: visible !important; }
          .${receiptPrintAreaClass} {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 4mm 3mm 12mm 3mm !important;
            margin: 0 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0 0 12mm 0;
          }
        }
      `}</style>

      {/* ══ STORE HEADER ══ */}
      <div style={{ ...centerStyle, marginBottom: '2mm' }}>
        <div style={{
          height: '110px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4mm',
        }}>
          <img 
            src="/Logo Bold James.png" 
            alt="Bold James Logo"
            style={{ 
              height: '110px', 
              width: 'auto', 
              objectFit: 'contain' 
            }} 
          />
        </div>
        <div style={{ fontSize: '14px', color: '#000000', lineHeight: '1.6' }}>
          Jl GAMBIR SAKETI NO.44,<br />
          40123, BANDUNG, INDONESIA<br />
          TEL: +62 851-5700-0263
        </div>
      </div>

      {/* ── separator ── */}
      <div style={solidSepStyle} />

      {/* ══ ORDER META ══ */}
      <div style={{ marginBottom: '0', fontSize: '14px' }}>
        <div style={rowStyle}>
          <span>Order ID</span>
          <span>#{orderId}</span>
        </div>
        <div style={rowStyle}>
          <span>Date</span>
          <span>{formatReceiptDate(order.createdAt)}</span>
        </div>
        {showCustomer && (
          <div style={rowStyle}>
            <span>Customer</span>
            <span>{order.customerName}</span>
          </div>
        )}
      </div>

      {/* ── separator ── */}
      <div style={solidSepStyle} />

      {/* ══ LINE ITEMS ══ */}
      <div style={{ marginBottom: '0' }}>
        {order.items.map((item, idx) => (
          <div key={idx} style={{ marginBottom: '2.5mm' }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', wordBreak: 'break-word', textTransform: 'uppercase' }}>
              {item.name}
            </div>
            {item.sku && (
              <div style={{ fontSize: '14px', color: '#000000', paddingLeft: '2mm' }}>
                {item.sku}
              </div>
            )}
            {item.variantName && (
              <div style={{ fontSize: '14px', color: '#000000', paddingLeft: '2mm', textTransform: 'uppercase' }}>
                [{item.variantName.replace(item.name, '').replace(/^[\s—\-:()\[\]]+/, '').trim() || item.variantName}]
              </div>
            )}
            <div style={{ ...rowStyle, paddingLeft: '2mm', fontSize: '14px' }}>
              <span>{item.quantity} x {formatRp(item.price)}</span>
              <span>{formatRp(item.price * item.quantity)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── separator ── */}
      <div style={solidSepVisibleStyle} />

      {/* ══ TOTALS ══ */}
      <div style={{ marginBottom: '0' }}>
        {showDiscount && (
          <>
            <div style={{ ...rowStyle, fontSize: '14px' }}>
              <span>Subtotal</span>
              <span>{formatRp(order.subtotal)}</span>
            </div>
            <div style={{ ...rowStyle, fontSize: '14px' }}>
              <span>
                Discount{order.discountType === 'percent' ? ` ${order.discountValue}%` : ''}
              </span>
              <span>-{formatRp(order.discountAmount)}</span>
            </div>
            <div style={dottedSepVisibleStyle} />
          </>
        )}
        <div style={{
          ...rowStyle,
          fontSize: '16px',
          fontWeight: 'bold',
        }}>
          <span>TOTAL</span>
          <span>{formatRp(order.total)}</span>
        </div>
      </div>

      {/* ── separator ── */}
      <div style={solidSepVisibleStyle} />

      {/* ══ PAYMENT ══ */}
      <div style={{ marginBottom: '0' }}>
        {(order.paymentMethod === 'pos_cash' || order.paymentMethod === 'cash') && (
          <>
            <div style={{ ...rowStyle, fontSize: '14px' }}>
              <span>Cash</span>
              <span>{formatRp(order.cashAmount || order.total)}</span>
            </div>
            <div style={{ ...rowStyle, fontSize: '14px' }}>
              <span>Change</span>
              <span>{formatRp(order.changeAmount || 0)}</span>
            </div>
          </>
        )}
        {(order.paymentMethod === 'pos_transfer' || order.paymentMethod === 'transfer') && (
          <div style={{ ...rowStyle, fontSize: '14px' }}>
            <span>Direct Transfer</span>
            <span>{formatRp(order.total)}</span>
          </div>
        )}
        {(order.paymentMethod === 'pos_split' || order.paymentMethod === 'split') && (
          <>
            <div style={{ ...rowStyle, fontSize: '14px' }}>
              <span>Cash</span>
              <span>{formatRp(order.cashAmount || 0)}</span>
            </div>
            <div style={{ ...rowStyle, fontSize: '14px' }}>
              <span>Transfer</span>
              <span>{formatRp(order.transferAmount || 0)}</span>
            </div>
          </>
        )}
      </div>

      {/* ══ ORDER NOTE ══ */}
      {showNote && (
        <>
          <div style={solidSepStyle} />
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            <span style={{ fontWeight: 'bold' }}>Notes: </span>
            {order.orderNote}
          </div>
        </>
      )}

      {/* ── separator ── */}
      <div style={solidSepStyle} />

      {/* ══ THANK YOU ══ */}
      <div style={{
        ...centerStyle,
        fontSize: '14px',
        fontWeight: 'bold',
        padding: '2mm 0',
      }}>
        Thank you for your valued patronage and trust <br /> 
        in James Boogie.
      </div>

      {/* ── separator ── */}
      <div style={solidSepStyle} />

      {/* ══ BARCODE ══ */}
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        margin: '8px 0 0 0',
      }}>
        <svg
          ref={barcodeRef}
          style={{
            width: '100%',
            height: '50px',
            display: 'block',
          }}
        />
        <div style={{
          fontSize: '12px',
          fontWeight: 'bold',
          marginTop: '1mm',
          letterSpacing: '1px',
        }}>
          #{orderId}
        </div>
        <div style={{ fontSize: '14px', color: '#000000', marginTop: '5mm', marginBottom: '15mm', letterSpacing: '2px', fontWeight: 'bold' }}>
          WWW.JAMESBOOGIE.COM
        </div>
        <div style={{ height: '8mm' }} />
      </div>
    </div>
  );
};
