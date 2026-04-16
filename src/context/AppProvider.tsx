import { useEffect, useState, type PropsWithChildren } from "react";
import { AppContext } from "./app-context";
import {
  deleteProduct as deleteProductInDb,
  getSettings,
  listAdjustments,
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
import type { AppSettings, PaymentMethod, Product, Sale, StockAdjustment, SyncOperation } from "../lib/types";
import { generateId } from "../lib/utils";
import { cloudApiBaseUrl } from "../shared/config/env";

type ProductInput = Omit<Product, "id" | "updatedAt"> & {
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

export type AppContextValue = {
  loading: boolean;
  products: Product[];
  sales: Sale[];
  adjustments: StockAdjustment[];
  settings: AppSettings;
  syncQueue: SyncOperation[];
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
  storeName: "Mercadinho Nexa",
  defaultMinStockQty: 5,
  lastSyncAt: null
};

export function AppProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncOperation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(emptySettings);

  async function refresh() {
    const [nextProducts, nextSales, nextAdjustments, nextSettings, nextSyncQueue] = await Promise.all([
      listProducts(),
      listSales(),
      listAdjustments(),
      getSettings(),
      listSyncQueue()
    ]);

    setProducts(nextProducts);
    setSales(nextSales);
    setAdjustments(nextAdjustments);
    setSettings(nextSettings);
    setSyncQueue(nextSyncQueue);
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
      await refresh();
      setLoading(false);
    }

    void boot();
  }, []);

  async function saveProduct(input: ProductInput) {
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
      updatedAt: now
    };

    await saveProductInDb(product);
    await scheduleSync({
      id: generateId("sync"),
      entity: "product",
      type: input.id ? "update" : "create",
      payload: product,
      createdAt: now
    });
    await refresh();
  }

  async function deleteProduct(productId: string) {
    if (sales.some((sale) => sale.items.some((item) => item.productId === productId))) {
      throw new Error("Este produto possui histórico de vendas e não pode ser excluído.");
    }

    if (adjustments.some((adjustment) => adjustment.productId === productId)) {
      throw new Error("Este produto possui histórico de ajustes e não pode ser excluído.");
    }

    await deleteProductInDb(productId);
    await scheduleSync({
      id: generateId("sync"),
      entity: "product",
      type: "delete",
      payload: { id: productId },
      createdAt: new Date().toISOString()
    });
    await refresh();
  }

  async function adjustStock(productId: string, delta: number, reason: string) {
    const adjustment: StockAdjustment = {
      id: generateId("adj"),
      productId,
      delta,
      reason,
      createdAt: new Date().toISOString()
    };

    await saveStockAdjustment(adjustment);
    await scheduleSync({
      id: generateId("sync"),
      entity: "stock",
      type: "update",
      payload: adjustment,
      createdAt: adjustment.createdAt
    });
    await refresh();
  }

  async function createSale(input: SaleInput) {
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
        subtotal: product.salePrice * item.quantity
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
      items
    };

    await saveSale(sale);
    await scheduleSync({
      id: generateId("sync"),
      entity: "sale",
      type: "create",
      payload: sale,
      createdAt
    });
    await refresh();
  }

  async function saveSettings(settingsInput: AppSettings) {
    await saveSettingsInDb(settingsInput);
    setSettings(settingsInput);
  }

  async function forceSync() {
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
    await refresh();
  }

  return (
    <AppContext.Provider
      value={{
        loading,
        products,
        sales,
        adjustments,
        settings,
        syncQueue,
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
