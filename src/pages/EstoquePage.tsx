import { AlertTriangle, ArrowUpDown } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import type { Product } from "../lib/types";
import { formatDate } from "../lib/utils";

export function EstoquePage() {
  const { products, adjustments, adjustStock } = useAppState();
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [delta, setDelta] = useState("1");
  const [reason, setReason] = useState("Reposição manual");

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) || product.barcode.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? filteredProducts[0];

  useEffect(() => {
    if (!selectedProductId && products[0]) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  async function handleAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProduct) {
      return;
    }

    try {
      await adjustStock(selectedProduct.id, Number(delta), reason.trim());
      setDelta("1");
      setReason("Reposição manual");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível aplicar o ajuste de estoque.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Estoque"
        title="Visão operacional do estoque"
        description="Controle de estoque com consulta rápida, alertas de mínimo e ajustes operacionais."
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard title="Produtos em estoque" description="Base local ativa com atualização imediata dos saldos.">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input
              className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
              placeholder="Buscar por nome ou código de barras"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900">
              <ArrowUpDown className="h-4 w-4" />
              Ajuste manual disponível
            </button>
          </div>

          <div className="overflow-hidden rounded-3xl border border-brand-100">
            <table className="min-w-full bg-white text-left text-sm">
              <thead className="bg-brand-50 text-brand-900">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Quantidade</th>
                  <th className="px-4 py-3">Mínimo</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const lowStock = product.stockQty <= product.minStockQty;
                  return (
                    <tr key={product.id} className="border-t border-brand-100 cursor-pointer hover:bg-brand-50/60" onClick={() => setSelectedProductId(product.id)}>
                      <td className="px-4 py-3 font-medium text-brand-900">{product.name}</td>
                      <td className="px-4 py-3 text-slate-500">{product.barcode}</td>
                      <td className="px-4 py-3">{product.stockQty}</td>
                      <td className="px-4 py-3">{product.minStockQty}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            lowStock
                              ? "inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-amber-800"
                              : "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-emerald-700"
                          }
                        >
                          {lowStock ? <AlertTriangle className="h-4 w-4" /> : null}
                          {lowStock ? "Atenção" : "Estável"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Ajustar estoque" description="Use valores positivos para entrada e negativos para saída.">
          <form className="grid gap-4" onSubmit={handleAdjustment}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Produto
              <select
                className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
                value={selectedProduct?.id ?? ""}
                onChange={(event) => setSelectedProductId(event.target.value)}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Quantidade a ajustar
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" step="1" value={delta} onChange={(event) => setDelta(event.target.value)} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Motivo
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={reason} onChange={(event) => setReason(event.target.value)} required />
            </label>
            {selectedProduct ? (
              <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
                <p>
                  Produto selecionado: <strong className="text-brand-900">{selectedProduct.name}</strong>
                </p>
                <p>
                  Estoque atual: <strong className="text-brand-900">{selectedProduct.stockQty}</strong>
                </p>
              </div>
            ) : null}
            <button className="rounded-2xl bg-accent px-4 py-3 font-semibold text-brand-900" type="submit">
              Confirmar ajuste
            </button>
          </form>

          <div className="mt-6 grid gap-3">
            <p className="text-sm font-semibold text-brand-900">Histórico recente</p>
            {adjustments.slice(0, 5).map((adjustment) => {
              const product = products.find((item) => item.id === adjustment.productId) as Product | undefined;
              return (
                <div key={adjustment.id} className="rounded-2xl border border-brand-100 bg-canvas p-4 text-sm">
                  <p className="font-semibold text-brand-900">{product?.name ?? "Produto removido"}</p>
                  <p className="text-slate-600">
                    Ajuste {adjustment.delta > 0 ? `+${adjustment.delta}` : adjustment.delta} • {adjustment.reason}
                  </p>
                  <p className="text-slate-500">{formatDate(adjustment.createdAt)}</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
