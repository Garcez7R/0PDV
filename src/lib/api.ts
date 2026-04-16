import { buildApiUrl } from "../shared/config/env";
import type {
  Product,
  Sale,
  ScannerScan,
  ScannerSession,
  StockAdjustment,
  SyncOperation,
  SyncResult
} from "./types";

async function request<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    let message = `Falha na requisição ${path}`;
    try {
      const payload = (await response.json()) as { message?: string };
      message = payload.message ?? message;
    } catch {
      // Ignore JSON parsing errors and keep the fallback message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TResponse>;
}

export function fetchProducts() {
  return request<Product[]>("/api/products");
}

export function fetchSales() {
  return request<Sale[]>("/api/sales");
}

export function createProduct(product: Product) {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(product)
  });
}

export function createSale(sale: Sale) {
  return request<Sale>("/api/sales", {
    method: "POST",
    body: JSON.stringify(sale)
  });
}

export function createAdjustment(adjustment: StockAdjustment) {
  return request<StockAdjustment>("/api/stock-adjustments", {
    method: "POST",
    body: JSON.stringify(adjustment)
  });
}

export function syncOperations(operations: SyncOperation[]) {
  return request<SyncResult>("/api/sync", {
    method: "POST",
    body: JSON.stringify({ operations })
  });
}

export function createScannerSession() {
  return request<ScannerSession>("/api/scanner/sessions", {
    method: "POST"
  });
}

export function getScannerSession(sessionId: string) {
  return request<ScannerSession>(`/api/scanner/sessions/${sessionId}`);
}

export function submitScannerScan(sessionId: string, barcode: string) {
  return request<ScannerScan>(`/api/scanner/sessions/${sessionId}/scans`, {
    method: "POST",
    body: JSON.stringify({ barcode })
  });
}

export function claimScannerScan(sessionId: string) {
  return request<ScannerScan | null>(`/api/scanner/sessions/${sessionId}/claim`, {
    method: "POST"
  });
}

export function closeScannerSession(sessionId: string) {
  return request<ScannerSession>(`/api/scanner/sessions/${sessionId}/close`, {
    method: "POST"
  });
}
