// Billing and receipt utility functions

export interface BillItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_manual?: boolean;
  order_id?: string; // Track which order this item belongs to
  order_total?: number; // The total amount of the order (for combo/BOGO handling)
  order_offer_type?: string; // The offer type applied to this order
}

export interface BillItemWithTaxes extends BillItem {
  base_price: number; // Price without taxes (for tax-inclusive mode)
  item_taxes: Array<{ name: string; rate: number; amount: number }>;
}

export interface TaxSetting {
  name: string;
  rate: number;
}

export interface BillCalculation {
  items_with_taxes: BillItemWithTaxes[]; // Items with per-item tax breakdown
  subtotal: number; // Sum of base prices (tax-exclusive amount)
  taxable_subtotal: number; // Same as subtotal (before discount)
  total_gst: number; // Sum of all taxes
  subtotal_with_tax: number; // Subtotal + taxes (before discount)
  discount_amount: number; // Discount applied on final amount
  final_amount: number; // After discount
}

/**
 * Calculate bill totals with discount and taxes (NEW FORMAT)
 * @param taxInclusive - If true, menu prices already include taxes (reverse calculation)
 *
 * NEW CALCULATION FLOW (matching reference bill):
 * 1. Calculate per-item base price and taxes
 * 2. Sum to get subtotal (base prices) and total GST
 * 3. Add taxes to get total before discount
 * 4. Apply discount on final amount (LAST STEP)
 */
export function calculateBill(
  items: BillItem[],
  discountPercentage: number,
  taxSettings: TaxSetting[],
  taxInclusive: boolean = false
): BillCalculation {
  const totalTaxRate = taxSettings.reduce((sum, tax) => sum + tax.rate, 0);

  // Step 1: Calculate per-item breakdown with taxes
  const items_with_taxes: BillItemWithTaxes[] = items.map(item => {
    let base_price: number;
    let item_taxes: Array<{ name: string; rate: number; amount: number }>;

    if (taxInclusive) {
      // Tax-inclusive: Menu price includes taxes
      // Reverse calculate: base_price = display_price / (1 + tax_rate/100)
      base_price = item.total_price / (1 + totalTaxRate / 100);

      // Calculate individual tax amounts for this item
      item_taxes = taxSettings.map(tax => ({
        name: tax.name,
        rate: tax.rate,
        amount: (base_price * tax.rate) / 100,
      }));
    } else {
      // Tax-exclusive: Taxes added on top
      base_price = item.total_price;

      item_taxes = taxSettings.map(tax => ({
        name: tax.name,
        rate: tax.rate,
        amount: (base_price * tax.rate) / 100,
      }));
    }

    return {
      ...item,
      base_price: Math.round(base_price * 100) / 100, // Round to 2 decimals
      item_taxes: item_taxes.map(t => ({
        ...t,
        amount: Math.round(t.amount * 100) / 100, // Round to 2 decimals
      })),
    };
  });

  // Step 2: Calculate totals
  const subtotal = items_with_taxes.reduce((sum, item) => sum + item.base_price, 0);
  const taxable_subtotal = subtotal; // Same as subtotal (no discount applied yet)
  const total_gst = items_with_taxes.reduce(
    (sum, item) => sum + item.item_taxes.reduce((taxSum, tax) => taxSum + tax.amount, 0),
    0
  );
  const subtotal_with_tax = subtotal + total_gst; // Total before discount

  // Step 3: Apply discount on FINAL amount (after all taxes)
  const discount_amount = Math.round((subtotal_with_tax * discountPercentage) / 100);
  const final_amount = Math.round(subtotal_with_tax - discount_amount);

  return {
    items_with_taxes,
    subtotal: Math.round(subtotal * 100) / 100,
    taxable_subtotal: Math.round(taxable_subtotal * 100) / 100,
    total_gst: Math.round(total_gst * 100) / 100,
    subtotal_with_tax: Math.round(subtotal_with_tax * 100) / 100,
    discount_amount,
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
 * Generate styled HTML thermal receipt (NEW FORMAT - matches reference bill)
 */
export function generateHTMLReceipt(params: {
  settings?: RestaurantSettings;
  billNumber?: string;
  tableNumber?: string | null;
  orderType: 'dine-in' | 'takeaway';
  customerName?: string;
  customerPhone?: string;
  calculation: BillCalculation;
  paymentMethod: string;
  discountPercentage?: number;
  offerName?: string | null;
  date?: Date;
}): string {
  const {
    settings = {},
    billNumber,
    tableNumber,
    orderType,
    customerName,
    customerPhone,
    calculation,
    paymentMethod,
    discountPercentage = 0,
    offerName = null,
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
          .tax-row {
            display: flex;
            justify-content: flex-end;
            margin: 1px 0;
            padding-left: 20px;
            font-size: 11px;
            color: #333;
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
          <div class="bold" style="font-size: 16px;">${settings.restaurant_name || 'HANGOUT'}</div>
          ${settings.restaurant_address ? `<div>${settings.restaurant_address}</div>` : ''}
          ${settings.restaurant_phone ? `<div>Phone: ${settings.restaurant_phone}</div>` : ''}
          ${settings.gst_number ? `<div>GSTIN ${settings.gst_number}</div>` : ''}
          <div class="bold">CASH BILL</div>
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
          <div class="row bold">
            <span>ITEM</span>
            <span style="width: 40px; text-align: center;">QTY</span>
            <span style="width: 60px; text-align: right;">PRICE</span>
            <span style="width: 70px; text-align: right;">TOTAL</span>
          </div>
          <div class="line" style="margin: 5px 0;"></div>

          ${calculation.items_with_taxes.map((item) => `
            <div class="item-row">
              <div class="item-name">${item.name}${item.is_manual ? ' *' : ''}</div>
              <div style="width: 40px; text-align: center;">${item.quantity}</div>
              <div style="width: 60px; text-align: right;">${formatCurrency(item.base_price / item.quantity)}</div>
              <div style="width: 70px; text-align: right;">${formatCurrency(item.base_price)}</div>
            </div>
            ${item.item_taxes.map(tax => `
              <div class="tax-row">
                <span style="flex: 1;">${tax.name} @ ${tax.rate}%</span>
                <span style="width: 70px; text-align: right;">${formatCurrency(tax.amount)}</span>
              </div>
            `).join('')}
          `).join('')}

          ${calculation.items_with_taxes.some(i => i.is_manual) ? '<div style="font-size: 10px; margin-top: 5px;">* Manual entry</div>' : ''}
        </div>
        <div class="line"></div>

        <div class="row"><span>SUBTOTAL:</span><span>${formatCurrency(calculation.subtotal)}</span></div>
        <div class="line"></div>
        <div class="row"><span>TAXABLE SUBTOTAL:</span><span>${formatCurrency(calculation.taxable_subtotal)}</span></div>
        <div class="line"></div>
        <div class="row"><span>TOTAL GST</span><span>${formatCurrency(calculation.total_gst)}</span></div>
        <div class="line"></div>

        ${calculation.discount_amount > 0 ? `
          <div class="row"><span>TOTAL BEFORE DISCOUNT:</span><span>${formatCurrency(calculation.subtotal_with_tax)}</span></div>
          <div class="row">
            <span>DISCOUNT${offerName ? ` (${offerName})` : discountPercentage ? ` (${discountPercentage}%)` : ''}:</span>
            <span>-${formatCurrency(calculation.discount_amount)}</span>
          </div>
          <div class="line"></div>
        ` : ''}

        <div class="row final-total">
          <span>GRAND TOTAL: Rs</span>
          <span>${formatCurrency(calculation.final_amount)}</span>
        </div>

        <div class="line"></div>
        <div class="center">
          <div>Payment: <span class="bold">${paymentMethod.toUpperCase()}</span></div>
          <div style="margin-top: 10px;" class="bold">THANK YOU! VISIT AGAIN!</div>
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
