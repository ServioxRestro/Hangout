// Shared types for KOT (Kitchen Order Ticket) system

export type KOTStatus = 'placed' | 'preparing' | 'ready' | 'served';

export type OrderType = 'dine-in' | 'takeaway';

export interface KOTItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  status: KOTStatus;
  menu_item_name: string;
  is_veg: boolean;
}

export interface KOT {
  kot_number: number;
  kot_batch_id: string;
  table_number: string | null;
  table_veg_only?: boolean;
  customer_name?: string | null;
  takeaway_qr_is_veg_only?: boolean;
  order_id: string;
  order_type: OrderType;
  kot_status: KOTStatus;
  created_at: string;
  items: KOTItem[];
}

export interface KOTBatch {
  kot_number: number;
  kot_batch_id: string;
  items: KOTItem[];
}
