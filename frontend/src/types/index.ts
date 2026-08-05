export interface User {
  id: number;
  email: string;
  full_name: string;
  role_name: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Product {
  id: number;
  name: string;
  category_id?: number;
  category_name?: string;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  user_name: string;
  type: 'INGRESO' | 'SALIDA' | 'PERDIDA_ROTURA';
  quantity: number;
  reason?: string;
  created_at: string;
}

export interface PurchaseItem {
  id: number;
  product_id: number;
  product_name: string;
  unit_cost: number;
  quantity: number;
  subtotal: number;
}

export interface Purchase {
  id: number;
  user_name: string;
  total_amount: number;
  created_at: string;
  items: PurchaseItem[];
}

export interface DashboardSummary {
  total_products_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  total_inventory_value: number; // $ Invertido
  recent_products: Array<{
    id: number;
    name: string;
    category_name: string;
    cost_price: number;
    sale_price: number;
    current_stock: number;
  }>;
  restock_alert_products: Array<{
    id: number;
    name: string;
    category_name: string;
    current_stock: number;
    min_stock: number;
    is_out_of_stock: boolean;
  }>;
}
