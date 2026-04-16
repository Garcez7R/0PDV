import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import { formatCurrency, formatDate } from "../lib/utils";

type Period = "today" | "week" | "month";

export function RelatoriosPage() {
  const { products, sales } = useAppState();
  const [period, setPeriod] = useState<Period>("today");

  const filteredSales = useMemo(() => {
    const now = Date.now();
    const start = {
      today: now - 1000 * 60 * 60 * 24,
      week: now - 1000 * 60 * 60 * 24 * 7,
      month: now - 1000 * 60 * 60 * 24 * 30
    }[period];

    return sales.filter((sale) => new Date(sale.createdAt).getTime() >= start);
  }, [period, sales]);

  const totalSales = filteredSales.reduce((acc, sale) => acc + sale.total, 0);
  const lowStock = products.filter((product) => product.stockQty <= product.minStockQty);
  const stockValue = products.reduce((acc, product) => acc + product.costPrice * product.stockQty, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Relatórios"
        title="Resumo executivo de vendas e estoque"
        description="Métricas por período para acompanhamento comercial e reposição de estoque."
      />

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Filtros e indicadores" description="Atalhos para análise diária, semanal e mensal.">
          <div className="grid gap-3">
            <button className={period === "today" ? "rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" : "rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900"} onClick={() => setPeriod("today")}>Hoje</button>
            <button className={period === "week" ? "rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" : "rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900"} onClick={() => setPeriod("week")}>Últimos 7 dias</button>
            <button className={period === "month" ? "rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" : "rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900"} onClick={() => setPeriod("month")}>Últimos 30 dias</button>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Total vendido: <strong className="text-brand-900">{formatCurrency(totalSales)}</strong>
            </div>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Valor de estoque: <strong className="text-brand-900">{formatCurrency(stockValue)}</strong>
            </div>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Produtos em alerta: <strong className="text-brand-900">{lowStock.length}</strong>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Vendas recentes" description="Movimentações registradas dentro do período selecionado.">
          <div className="grid gap-3">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-brand-100 bg-canvas p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-900">Venda {sale.id}</p>
                    <p className="text-sm text-slate-500">{formatDate(sale.createdAt)}</p>
                    <p className="text-sm text-slate-500">{sale.items.length} item(ns) • {sale.paymentMethod}</p>
                  </div>
                  <strong className="text-brand-900">{formatCurrency(sale.total)}</strong>
                </div>
              </div>
            ))}
            {filteredSales.length === 0 ? <p className="text-sm text-slate-500">Nenhuma venda no período selecionado.</p> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Produtos com estoque mínimo" description="Itens que merecem reposição rápida." className="mt-4">
        <div className="grid gap-3 md:grid-cols-2">
          {lowStock.map((product) => (
            <div key={product.id} className="rounded-2xl border border-brand-100 bg-canvas p-4">
              <p className="font-semibold text-brand-900">{product.name}</p>
              <p className="text-sm text-slate-600">
                Quantidade atual {product.stockQty} • mínimo {product.minStockQty}
              </p>
            </div>
          ))}
          {lowStock.length === 0 ? <p className="text-sm text-slate-500">Nenhum produto em risco neste momento.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
