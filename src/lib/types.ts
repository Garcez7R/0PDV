export type PaymentMethod = "cash" | "debit" | "credit";
export type UserRole = "operator" | "manager";

export type AuthUser = {
  id: string;
  name: string;
  role: UserRole;
};

export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "stock.adjust"
  | "sale.create"
  | "settings.update"
  | "sync.run";

export type Product = {
  id: string;
  name: string;
  description: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  minStockQty: number;
  updatedAt: string;
  updatedBy: AuthUser;
};

export type SaleItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type Sale = {
  id: string;
  total: number;
  amountPaid: number;
  change: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  items: SaleItem[];
  createdBy: AuthUser;
};

export type StockAdjustment = {
  id: string;
  productId: string;
  delta: number;
  reason: string;
  createdAt: string;
  createdBy: AuthUser;
};

export type SyncOperation<TPayload = unknown> = {
  id: string;
  entity: "product" | "sale" | "stock";
  type: "create" | "update" | "delete";
  payload: TPayload;
  createdAt: string;
};

export type SyncResult = {
  synced: number;
  strategy: string;
};

export type ScannerSession = {
  id: string;
  pairingCode: string;
  status: "open" | "closed";
  createdAt: string;
  expiresAt: string;
};

export type ScannerScan = {
  id: string;
  sessionId: string;
  barcode: string;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: AuditAction;
  entityId?: string;
  actor: AuthUser;
  details: string;
  createdAt: string;
};

export type AppSettings = {
  id: "app-settings";
  storeName: string;
  defaultMinStockQty: number;
  lastSyncAt: string | null;
  operatorName: string;
  operatorPin: string;
  managerName: string;
  managerPin: string;
};
