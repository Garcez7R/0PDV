import { AlertTriangle, DatabaseZap, Receipt, WifiOff } from "lucide-react";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import { formatCurrency, formatDate } from "../lib/utils";

export function HomePage() {
  const { products, sales, syncQueue, settings } = useAppState();
  const todayKey = new Date().toDateString();
  const todaySales = sales.filter((sale) => new Date(sale.createdAt).toDateString() === todayKey);
  const todayRevenue = todaySales.reduce((acc, sale) => acc + sale.total, 0);
  const lowStockProducts = products.filter((product) => product.stockQty <= product.minStockQty);

  return (
    <div>
      <PageHeader
        eyebrow="Operação"
        title={settings.storeName}
        description="Painel executivo com indicadores de vendas, estoque crítico e sincronização operacional."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Vendas do dia" value={formatCurrency(todayRevenue)} helper={`${todaySales.length} venda(s) registradas hoje`} />
        <KpiCard label="Produtos em alerta" value={`${lowStockProducts.length} itens`} helper="Acompanhamento ativo de estoque mínimo." />
        <KpiCard label="Fila de sincronização" value={`${syncQueue.length} evento(s)`} helper="Operações locais aguardando envio para a nuvem." />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <SectionCard
          title="Saúde da operação"
          description="Indicadores úteis para abertura de caixa e acompanhamento contínuo da operação."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-3xl bg-canvas p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-900">
                <Receipt className="h-4 w-4" />
                <span className="font-semibold">Ticket médio</span>
              </div>
              <p className="text-2xl font-bold text-brand-900">
                {todaySales.length > 0 ? formatCurrency(todayRevenue / todaySales.length) : formatCurrency(0)}
              </p>
            </div>
            <div className="rounded-3xl bg-canvas p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-900">
                <DatabaseZap className="h-4 w-4" />
                <span className="font-semibold">Última sincronização</span>
              </div>
              <p className="text-sm font-semibold text-brand-900">
                {settings.lastSyncAt ? formatDate(settings.lastSyncAt) : "Sincronização ainda não executada"}
              </p>
            </div>
            <div className="rounded-3xl bg-canvas p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-900">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Itens com risco</span>
              </div>
              <p className="text-sm text-slate-600">
                {lowStockProducts.length > 0
                  ? lowStockProducts.slice(0, 3).map((product) => product.name).join(", ")
                  : "Nenhum item em nível crítico."}
              </p>
            </div>
            <div className="rounded-3xl bg-canvas p-4">
              <div className="mb-2 flex items-center gap-2 text-brand-900">
                <WifiOff className="h-4 w-4" />
                <span className="font-semibold">Modo offline</span>
              </div>
              <p className="text-sm text-slate-600">A base local permanece operacional e registra eventos para sincronização posterior.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Vendas recentes"
          description="Registros mais recentes finalizados na frente de caixa."
        >
          <div className="grid gap-3">
            {sales.slice(0, 4).map((sale) => (
              <div key={sale.id} className="rounded-2xl border border-brand-100 bg-canvas p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-brand-900">{sale.id}</p>
                    <p className="text-sm text-slate-500">{formatDate(sale.createdAt)}</p>
                  </div>
                  <strong className="text-brand-900">{formatCurrency(sale.total)}</strong>
                </div>
              </div>
            ))}
            {sales.length === 0 ? <p className="text-sm text-slate-500">Nenhuma venda registrada até o momento.</p> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
