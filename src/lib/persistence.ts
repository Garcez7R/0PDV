import { openDB, type DBSchema } from "idb";
import { mockProducts, mockSales } from "../data/mock";
import type { AppSettings, AuditEntry, AuthUser, Product, Sale, StockAdjustment, SyncOperation } from "./types";

const DB_NAME = "nexa-pdv";
const DB_VERSION = 1;

const defaultSettings: AppSettings = {
  id: "app-settings",
  storeName: "0PDV",
  defaultMinStockQty: 5,
  lastSyncAt: null,
  operatorName: "Operador",
  operatorPin: "1234",
  managerName: "Gerente",
  managerPin: "4321"
};

interface ZeroPdvDatabase extends DBSchema {
  products: {
    key: string;
    value: Product;
  };
  sales: {
    key: string;
    value: Sale;
  };
  adjustments: {
    key: string;
    value: StockAdjustment;
  };
  syncQueue: {
    key: string;
    value: SyncOperation;
  };
  auditLog: {
    key: string;
    value: AuditEntry;
  };
  settings: {
    key: "app-settings";
    value: AppSettings;
  };
}

const dbPromise = openDB<ZeroPdvDatabase>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    db.createObjectStore("products", { keyPath: "id" });
    db.createObjectStore("sales", { keyPath: "id" });
    db.createObjectStore("adjustments", { keyPath: "id" });
    db.createObjectStore("syncQueue", { keyPath: "id" });
    db.createObjectStore("auditLog", { keyPath: "id" });
    db.createObjectStore("settings", { keyPath: "id" });
  }
});

export async function seedDatabase() {
  const db = await dbPromise;
  const [existingProducts, existingSales, existingSettings] = await Promise.all([
    db.count("products"),
    db.count("sales"),
    db.count("settings")
  ]);

  if (existingProducts === 0) {
    await Promise.all(mockProducts.map((product) => db.put("products", product)));
  }

  if (existingSales === 0) {
    await Promise.all(mockSales.map((sale) => db.put("sales", sale)));
  }

  if (existingSettings === 0) {
    await db.put("settings", defaultSettings);
  }
}

export async function listProducts() {
  const db = await dbPromise;
  const products = await db.getAll("products");
  return products.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function saveProduct(product: Product) {
  const db = await dbPromise;
  await db.put("products", product);
}

export async function appendAuditEntry(entry: AuditEntry) {
  const db = await dbPromise;
  await db.put("auditLog", entry);
}

export async function listAuditEntries() {
  const db = await dbPromise;
  const entries = await db.getAll("auditLog");
  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function replaceProducts(products: Product[]) {
  const db = await dbPromise;
  const tx = db.transaction("products", "readwrite");
  await tx.store.clear();
  for (const product of products) {
    await tx.store.put(product);
  }
  await tx.done;
}

export async function deleteProduct(productId: string) {
  const db = await dbPromise;
  await db.delete("products", productId);
}

export async function getProduct(productId: string) {
  const db = await dbPromise;
  return db.get("products", productId);
}

export async function listSales() {
  const db = await dbPromise;
  const sales = await db.getAll("sales");
  return sales.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveSale(sale: Sale) {
  const db = await dbPromise;
  const tx = db.transaction(["sales", "products"], "readwrite");

  await tx.objectStore("sales").put(sale);

  for (const item of sale.items) {
    const product = await tx.objectStore("products").get(item.productId);
    if (!product) {
      throw new Error("Produto da venda não encontrado.");
    }

    if (product.stockQty < item.quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}.`);
    }

    await tx.objectStore("products").put({
      ...product,
      stockQty: product.stockQty - item.quantity,
      updatedAt: sale.createdAt
    });
  }

  await tx.done;
}

export async function replaceSales(sales: Sale[]) {
  const db = await dbPromise;
  const tx = db.transaction("sales", "readwrite");
  await tx.store.clear();
  for (const sale of sales) {
    await tx.store.put(sale);
  }
  await tx.done;
}

export async function listAdjustments() {
  const db = await dbPromise;
  const adjustments = await db.getAll("adjustments");
  return adjustments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveStockAdjustment(adjustment: StockAdjustment) {
  const db = await dbPromise;
  const tx = db.transaction(["adjustments", "products"], "readwrite");
  const product = await tx.objectStore("products").get(adjustment.productId);

  if (!product) {
    throw new Error("Produto não encontrado para ajuste.");
  }

  const nextQty = product.stockQty + adjustment.delta;
  if (nextQty < 0) {
    throw new Error("O ajuste deixaria o estoque negativo.");
  }

  await tx.objectStore("adjustments").put(adjustment);
  await tx.objectStore("products").put({
    ...product,
    stockQty: nextQty,
    updatedAt: adjustment.createdAt
  });

  await tx.done;
}

export async function getSettings() {
  const db = await dbPromise;
  return (await db.get("settings", "app-settings")) ?? defaultSettings;
}

export async function saveSettings(settings: AppSettings) {
  const db = await dbPromise;
  await db.put("settings", settings);
}

export async function listSyncQueue() {
  const db = await dbPromise;
  const operations = await db.getAll("syncQueue");
  return operations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function queueSync(operation: SyncOperation) {
  const db = await dbPromise;
  await db.put("syncQueue", operation);
}

export async function clearSyncQueue() {
  const db = await dbPromise;
  await db.clear("syncQueue");
}

export function getUsersFromSettings(settings: AppSettings): AuthUser[] {
  return [
    {
      id: "user-operator",
      name: settings.operatorName,
      role: "operator"
    },
    {
      id: "user-manager",
      name: settings.managerName,
      role: "manager"
    }
  ];
}

export function authenticateWithPin(settings: AppSettings, pin: string): AuthUser | null {
  const normalized = pin.trim();
  if (normalized === settings.managerPin) {
    return {
      id: "user-manager",
      name: settings.managerName,
      role: "manager"
    };
  }

  if (normalized === settings.operatorPin) {
    return {
      id: "user-operator",
      name: settings.operatorName,
      role: "operator"
    };
  }

  return null;
}
