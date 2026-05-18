export interface DolibarrProduct {
  id: string;
  ref: string;
  label: string;
  description: string;
  price?: string;
  price_ht?: string;
  price_ttc?: string;
  price_base_type?: 'HT' | 'TTC';
  tva_tx?: string;
  stock_reel?: number | string;
  fk_unit?: string;
  array_options?: Record<string, string>;
}

export interface DolibarrOrderLine {
  id: string;
  fk_product: string;
  product_ref: string;
  product_label: string;
  qty: number;
  subprice: string;
  total_ht: string;
  total_ttc: string;
  tva_tx: string;
}

export interface DolibarrOrder {
  id: string;
  ref: string;
  socid: string;
  fk_soc?: string | number | null;
  total_ht: string;
  total_ttc: string;
  statut: number;
  billed?: string | number;
  date_commande: number;
  delivery_date?: number | string | null;
  date_delivery?: number | string | null;
  date_livraison?: number | string | null;
  date_livraison_prevue?: number | string | null;
  array_options?: Record<string, number | string | null | undefined>;
  lines: DolibarrOrderLine[];
  portalWorkflow?: PortalOrderWorkflow | null;
}

export interface PortalOrderWorkflow {
  preparationStatus: string;
  driver?: string | null;
  deliveryDate?: string | null;
  deliveryNote?: string | null;
  customerMessage?: string | null;
  customerNotifiedAt?: string | null;
}

export interface DolibarrInvoice {
  id: string;
  ref: string;
  socid: string;
  fk_soc?: string | number | null;
  linked_objects?: Record<string, Record<string, string> | string[] | string | number | null>;
  linkedObjectsIds?: Record<string, string[]>;
  origin?: string | null;
  origin_id?: string | number | null;
  fk_source?: string | number | null;
  array_options?: Record<string, number | string | null | undefined>;
  total_ht: string;
  total_ttc: string;
  remaintopay: string;
  statut: number | string;
  date_lim_reglement: number | string | null;
  date: number | string | null;
}

export interface ProductFilters {
  category?: string;
  search?: string;
  limit?: number;
}

export interface ProductMutationInput {
  ref: string;
  label: string;
  description?: string;
  priceHt: number;
  tvaTx: number;
}

export interface OrderLineInput {
  productId: string;
  qty: number;
  priceHt: number;
}

export interface DolibarrSellingPrice {
  price?: string;
  price_ht?: string;
  tva_tx?: string;
}
