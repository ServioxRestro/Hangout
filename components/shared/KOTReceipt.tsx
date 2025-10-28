// Reusable KOT (Kitchen Order Ticket) Receipt Component

import { KOT } from "@/types/kot.types";

interface KOTReceiptProps {
  kot: KOT;
  filterType?: "veg" | "non-veg" | "all";
}

/**
 * Generate KOT receipt content for printing
 * Used in kitchen and table management
 */
export function generateKOTReceipt(
  kot: KOT,
  filterType: "veg" | "non-veg" | "all" = "all"
): string {
  // Filter items based on type
  const displayItems =
    filterType === "all"
      ? kot.items
      : kot.items.filter((item) =>
          filterType === "veg" ? item.is_veg : !item.is_veg
        );

  const stationType =
    filterType === "veg"
      ? "VEGETARIAN STATION"
      : filterType === "non-veg"
      ? "NON-VEGETARIAN STATION"
      : "ALL ITEMS";

  return `
================================
   KITCHEN ORDER TICKET (KOT)
================================

KOT #${kot.kot_number}${filterType !== "all" ? ` - ${stationType}` : ""}
${kot.order_type === "dine-in" ? `Table: ${kot.table_number}` : "TAKEAWAY"}
Time: ${new Date(kot.created_at).toLocaleTimeString("en-IN")}

--------------------------------
ITEMS TO PREPARE:
--------------------------------
${displayItems
  .map((item, idx) => {
    const vegIcon = item.is_veg ? "[VEG]" : "[NON-VEG]";
    return `${idx + 1}. ${vegIcon} ${item.menu_item_name}
   Qty: ${item.quantity}`;
  })
  .join("\n\n")}

================================
Total Items: ${displayItems.reduce((sum, item) => sum + item.quantity, 0)}
${filterType !== "all" ? `(${stationType} only)` : ""}
================================
  `;
}

/**
 * Print KOT receipt using browser print dialog
 */
export function printKOTReceipt(
  kot: KOT,
  filterType: "veg" | "non-veg" | "all" = "all"
): void {
  const receiptContent = generateKOTReceipt(kot, filterType);

  const printWindow = window.open("", "", "width=300,height=600");
  if (!printWindow) {
    alert("Please allow popups to print KOT");
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>KOT #${kot.kot_number}</title>
        <style>
          body {
            font-family: monospace;
            white-space: pre;
            font-size: 14px;
          }
          @media print {
            body { font-size: 12px; }
          }
        </style>
      </head>
      <body>${receiptContent}</body>
    </html>
  `);

  printWindow.document.close();
  printWindow.print();
}

/**
 * KOT Receipt Component (for display purposes)
 */
export function KOTReceipt({ kot }: KOTReceiptProps) {
  return (
    <div className="font-mono text-sm whitespace-pre bg-white p-4 border rounded">
      {generateKOTReceipt(kot)}
    </div>
  );
}
