import { useEffect, useState, type PropsWithChildren } from "react";
import { AppContext } from "./app-context";
import {
  appendAuditEntry,
  authenticateWithPin,
  deleteProduct as deleteProductInDb,
  getSettings,
  listAdjustments,
  listAuditEntries,
  listProducts,
  listSales,
  listSyncQueue,
  saveProduct as saveProductInDb,
  saveSale,
  saveSettings as saveSettingsInDb,
  saveStockAdjustment,
  seedDatabase
} from "../lib/persistence";
import { hydrateLocalFromCloud, pushSyncQueue } from "../modules/sync/services/cloud-sync";
import { scheduleSync } from "../lib/sync";
import type {
  AppSettings,
  AuditAction,
  AuditEntry,
  AuthUser,
  PaymentMethod,
  Product,
  Sale,
  StockAdjustment,
  SyncOperation
} from "../lib/types";
import { generateId } from "../lib/utils";
import { cloudApiBaseUrl } from "../shared/config/env";

type ProductInput = Omit<Product, "id" | "updatedAt" | "updatedBy"> & {
  id?: string;
};

type SaleInput = {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  amountPaid: number;
  paymentMethod: PaymentMethod;
};

const SESSION_KEY = "nexa-pdv-auth-session";

export type AppContextValue = {
  loading: boolean;
  currentUser: AuthUser | null;
  products: Product[];
  sales: Sale[];
  adjustments: StockAdjustment[];
  auditEntries: AuditEntry[];
  settings: AppSettings;
  syncQueue: SyncOperation[];
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  saveProduct: (input: ProductInput) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  adjustStock: (productId: string, delta: number, reason: string) => Promise<void>;
  createSale: (input: SaleInput) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  forceSync: () => Promise<void>;
  refresh: () => Promise<void>;
};

const emptySettings: AppSettings = {
  id: "app-settings",
  storeName: "0PDV",
  defaultMinStockQty: 5,
  lastSyncAt: null,
  operatorName: "Operador",
  operatorPin: "1234",
  managerName: "Gerente",
  managerPin: "4321"
};

function readStoredSession() {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AppProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(emptySettings);

  async function writeAudit(action: AuditAction, details: string, entityId?: string) {
    if (!currentUser) {
      return;
    }

    await appendAuditEntry({
      id: generateId("audit"),
      action,
      entityId,
      actor: currentUser,
      details,
      createdAt: new Date().toISOString()
    });
  }

  function ensureLoggedIn() {
    if (!currentUser) {
      throw new Error("Faça login para continuar.");
    }
  }

  function ensureManager() {
    ensureLoggedIn();
    if (currentUser?.role !== "manager") {
      throw new Error("Esta ação exige um usuário com perfil de gerente.");
    }
  }

  async function refresh() {
    const [nextProducts, nextSales, nextAdjustments, nextSettings, nextSyncQueue, nextAuditEntries] = await Promise.all([
      listProducts(),
      listSales(),
      listAdjustments(),
      getSettings(),
      listSyncQueue(),
      listAuditEntries()
    ]);

    setProducts(nextProducts);
    setSales(nextSales);
    setAdjustments(nextAdjustments);
    setSettings(nextSettings);
    setSyncQueue(nextSyncQueue);
    setAuditEntries(nextAuditEntries);
  }

  useEffect(() => {
    async function boot() {
      await seedDatabase();
      const pendingOperations = await listSyncQueue();
      if (cloudApiBaseUrl && navigator.onLine && pendingOperations.length === 0) {
        try {
          await hydrateLocalFromCloud();
        } catch {
          // Preserve offline-first behavior when the API is unavailable.
        }
      }

      setCurrentUser(readStoredSession());
      await refresh();
      setLoading(false);
    }

    void boot();
  }, []);

  async function login(pin: string) {
    const authUser = authenticateWithPin(settings, pin);
    if (!authUser) {
      throw new Error("PIN inválido. Verifique as credenciais e tente novamente.");
    }

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    setCurrentUser(authUser);

    await appendAuditEntry({
      id: generateId("audit"),
      action: "auth.login",
      actor: authUser,
      details: `Acesso iniciado por ${authUser.name}.`,
      createdAt: new Date().toISOString()
    });
    await refresh();
  }

  async function logout() {
    if (currentUser) {
      await appendAuditEntry({
        id: generateId("audit"),
        action: "auth.logout",
        actor: currentUser,
        details: `Sessão encerrada por ${currentUser.name}.`,
        createdAt: new Date().toISOString()
      });
    }

    window.localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    await refresh();
  }

  async function saveProduct(input: ProductInput) {
    ensureManager();

    const now = new Date().toISOString();
    const normalizedBarcode = input.barcode.trim();
    const duplicatedBarcode = products.find(
      (product) => product.barcode === normalizedBarcode && product.id !== input.id
    );

    if (duplicatedBarcode) {
      throw new Error("Já existe um produto cadastrado com este código de barras.");
    }

    const product: Product = {
      ...input,
      barcode: normalizedBarcode,
      id: input.id ?? generateId("prod"),
      updatedAt: now,
      updatedBy: currentUser as AuthUser
    };

    await saveProductInDb(product);
    await scheduleSync({
      id: generateId("sync"),
      entity: "product",
      type: input.id ? "update" : "create",
      payload: product,
      createdAt: now
    });
    await writeAudit(input.id ? "product.update" : "product.create", `Produto ${product.name} salvo.`, product.id);
    await refresh();
  }

  async function deleteProduct(productId: string) {
    ensureManager();

    if (sales.some((sale) => sale.items.some((item) => item.productId === productId))) {
      throw new Error("Este produto possui histórico de vendas e não pode ser excluído.");
    }

    if (adjustments.some((adjustment) => adjustment.productId === productId)) {
      throw new Error("Este produto possui histórico de ajustes e não pode ser excluído.");
    }

    const product = products.find((item) => item.id === productId);
    await deleteProductInDb(productId);
    await scheduleSync({
      id: generateId("sync"),
      entity: "product",
      type: "delete",
      payload: { id: productId },
      createdAt: new Date().toISOString()
    });
    await writeAudit("product.delete", `Produto ${product?.name ?? productId} excluído.`, productId);
    await refresh();
  }

  async function adjustStock(productId: string, delta: number, reason: string) {
    ensureManager();

    const adjustment: StockAdjustment = {
      id: generateId("adj"),
      productId,
      delta,
      reason,
      createdAt: new Date().toISOString(),
      createdBy: currentUser as AuthUser
    };

    await saveStockAdjustment(adjustment);
    await scheduleSync({
      id: generateId("sync"),
      entity: "stock",
      type: "update",
      payload: adjustment,
      createdAt: adjustment.createdAt
    });
    await writeAudit("stock.adjust", `Ajuste de estoque registrado para o produto ${productId}.`, productId);
    await refresh();
  }

  async function createSale(input: SaleInput) {
    ensureLoggedIn();

    const createdAt = new Date().toISOString();
    const items = input.items.map((item) => {
      const product = products.find((candidate) => candidate.id === item.productId);
      if (!product) {
        throw new Error("Produto não encontrado na venda.");
      }

      return {
        productId: product.id,
        quantity: item.quantity,
        unitPrice: product.salePrice,
        subtotal: product.salePrice * item.quantity,
        saleMode: product.saleMode
      };
    });

    const total = items.reduce((acc, item) => acc + item.subtotal, 0);
    const normalizedAmountPaid =
      input.paymentMethod === "cash" ? input.amountPaid : Math.max(input.amountPaid, total);

    if (normalizedAmountPaid < total) {
      throw new Error("O valor recebido não cobre o total da venda.");
    }

    const sale: Sale = {
      id: generateId("sale"),
      total,
      amountPaid: normalizedAmountPaid,
      change: normalizedAmountPaid - total,
      paymentMethod: input.paymentMethod,
      createdAt,
      items,
      createdBy: currentUser as AuthUser
    };

    await saveSale(sale);
    await scheduleSync({
      id: generateId("sync"),
      entity: "sale",
      type: "create",
      payload: sale,
      createdAt
    });
    await writeAudit("sale.create", `Venda ${sale.id} concluída no valor de ${sale.total.toFixed(2)}.`, sale.id);
    await refresh();
  }

  async function saveSettings(settingsInput: AppSettings) {
    ensureManager();

    if (!settingsInput.operatorName.trim() || !settingsInput.managerName.trim()) {
      throw new Error("Informe os nomes do operador e do gerente.");
    }

    if (settingsInput.operatorPin.trim().length < 4 || settingsInput.managerPin.trim().length < 4) {
      throw new Error("Os PINs de acesso devem ter ao menos 4 dígitos.");
    }

    await saveSettingsInDb(settingsInput);
    setSettings(settingsInput);
    await writeAudit("settings.update", "Configurações operacionais atualizadas.");
    await refresh();
  }

  async function forceSync() {
    ensureManager();

    if (syncQueue.length > 0) {
      if (!cloudApiBaseUrl) {
        throw new Error("Configure a variável VITE_API_BASE_URL para sincronizar com a API publicada.");
      }

      await pushSyncQueue(syncQueue);
      try {
        await hydrateLocalFromCloud();
      } catch {
        // Keep local state if pull refresh is temporarily unavailable.
      }
    }

    const nextSettings = {
      ...settings,
      lastSyncAt: new Date().toISOString()
    };

    await saveSettingsInDb(nextSettings);
    setSettings(nextSettings);
    await writeAudit("sync.run", "Sincronização manual executada.");
    await refresh();
  }

  return (
    <AppContext.Provider
      value={{
        loading,
        currentUser,
        products,
        sales,
        adjustments,
        auditEntries,
        settings,
        syncQueue,
        login,
        logout,
        saveProduct,
        deleteProduct,
        adjustStock,
        createSale,
        saveSettings,
        forceSync,
        refresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
