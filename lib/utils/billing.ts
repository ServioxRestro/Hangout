// Billing and receipt utility functions

export interface BillItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_manual?: boolean;
}

export interface TaxSetting {
  name: string;
  rate: number;
}

export interface BillCalculation {
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  taxes: Array<{ name: string; rate: number; amount: number }>;
  tax_amount: number;
  final_amount: number;
}

/**
 * Calculate bill totals with discount and taxes
 */
export function calculateBill(
  items: BillItem[],
  discountPercentage: number,
  taxSettings: TaxSetting[]
): BillCalculation {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const discount_amount = (subtotal * discountPercentage) / 100;
  const taxable_amount = subtotal - discount_amount;

  const taxes = taxSettings.map(tax => ({
    name: tax.name,
    rate: tax.rate,
    amount: (taxable_amount * tax.rate) / 100,
  }));

  const tax_amount = taxes.reduce((sum, tax) => sum + tax.amount, 0);
  const final_amount = taxable_amount + tax_amount;

  return {
    subtotal,
    discount_amount,
    taxable_amount,
    taxes,
    tax_amount,
    final_amount,
  };
}

/**
 * Format currency for Indian Rupees
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

export interface RestaurantSettings {
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_phone?: string;
  gst_number?: string;
}

/**
 * Generate styled HTML thermal receipt (better format)
 */
export function generateHTMLReceipt(params: {
  settings?: RestaurantSettings;
  billNumber?: string;
  tableNumber?: string | null;
  orderType: 'dine-in' | 'takeaway';
  customerName?: string;
  customerPhone?: string;
  items: BillItem[];
  calculation: BillCalculation;
  paymentMethod: string;
  discountPercentage?: number;
  date?: Date;
}): string {
  const {
    settings = {},
    billNumber,
    tableNumber,
    orderType,
    customerName,
    customerPhone,
    items,
    calculation,
    paymentMethod,
    discountPercentage = 0,
    date = new Date(),
  } = params;

  return `
    <html>
      <head>
        <title>${billNumber ? `Receipt - ${billNumber}` : 'Receipt'}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Courier New', monospace;
            max-width: 300px;
            margin: 0 auto;
            padding: 15px;
            line-height: 1.4;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; margin-bottom: 10px; }
          .line { border-bottom: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 2px 0; }
          .bold { font-weight: bold; }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            padding: 2px 0;
          }
          .item-name { flex: 1; margin-right: 10px; }
          .final-total {
            font-size: 16px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 8px;
            margin-top: 8px;
          }
          @media print {
            body { margin: 0; padding: 10px; font-size: 11px; }
            @page { margin: 5mm; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="bold" style="font-size: 16px;">${settings.restaurant_name || 'HANGOUT RESTAURANT'}</div>
          ${settings.restaurant_address ? `<div>${settings.restaurant_address}</div>` : ''}
          ${settings.restaurant_phone ? `<div>Phone: ${settings.restaurant_phone}</div>` : ''}
          ${settings.gst_number ? `<div>GST: ${settings.gst_number}</div>` : ''}
        </div>
        <div class="line"></div>

        <div class="center">
          ${billNumber ? `<div class="bold">Bill No: ${billNumber}</div>` : ''}
          ${orderType === 'dine-in' && tableNumber ? `<div>Table: ${tableNumber}</div>` : '<div class="bold">TAKEAWAY</div>'}
          ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
          ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
          <div>Date: ${date.toLocaleString('en-IN')}</div>
        </div>
        <div class="line"></div>

        <div>
          <div class="bold center">ITEMS ORDERED</div>
          <div class="line" style="margin: 5px 0;"></div>
          ${items.map((item) => `
            <div class="item-row">
              <div class="item-name">${item.name}${item.is_manual ? ' *' : ''}</div>
              <div style="width: 30px; text-align: center;">${item.quantity}</div>
              <div style="width: 70px; text-align: right;">${formatCurrency(item.total_price)}</div>
            </div>
          `).join('')}
          ${items.some(i => i.is_manual) ? '<div style="font-size: 10px; margin-top: 5px;">* Manual entry</div>' : ''}
        </div>
        <div class="line"></div>

        <div class="row"><span>Subtotal:</span><span>${formatCurrency(calculation.subtotal)}</span></div>
        ${calculation.discount_amount > 0 ? `
          <div class="row"><span>Discount (${discountPercentage}%):</span><span>-${formatCurrency(calculation.discount_amount)}</span></div>
        ` : ''}
        ${calculation.taxes.map(tax =>
          `<div class="row"><span>${tax.name} @ ${tax.rate}%:</span><span>${formatCurrency(tax.amount)}</span></div>`
        ).join('')}

        <div class="row final-total">
          <span>TOTAL:</span>
          <span>${formatCurrency(calculation.final_amount)}</span>
        </div>

        <div class="line"></div>
        <div class="center">
          <div>Payment: <span class="bold">${paymentMethod.toUpperCase()}</span></div>
          <div style="margin-top: 10px;" class="bold">Thank you for dining with us!</div>
          <div>Please visit us again!</div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Print HTML receipt
 */
export function printHTMLReceipt(htmlContent: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to print receipt");
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    setTimeout(() => printWindow.close(), 1000);
  }, 500);
}
