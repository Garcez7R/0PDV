import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import { formatDate } from "../lib/utils";

export function ConfiguracoesPage() {
  const { settings, syncQueue, saveSettings, forceSync } = useAppState();
  const [storeName, setStoreName] = useState(settings.storeName);
  const [defaultMinStockQty, setDefaultMinStockQty] = useState(String(settings.defaultMinStockQty));
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStoreName(settings.storeName);
    setDefaultMinStockQty(String(settings.defaultMinStockQty));
  }, [settings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveSettings({
      ...settings,
      storeName: storeName.trim(),
      defaultMinStockQty: Number(defaultMinStockQty)
    });
    setMessage("Configurações salvas com sucesso.");
  }

  async function handleForceSync() {
    try {
      await forceSync();
      setMessage("Sincronização concluída com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel sincronizar agora.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Configurações"
        title="Preferências da operação"
        description="Parâmetros institucionais da operação e controle manual da sincronização."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Parâmetros gerais" description="Valores que impactam o cadastro e a operação.">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Estoque mínimo padrão
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="1" value={defaultMinStockQty} onChange={(event) => setDefaultMinStockQty(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nome da loja
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={storeName} onChange={(event) => setStoreName(event.target.value)} />
            </label>
            <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" type="submit">
              Salvar configurações
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Sincronização" description="Visão operacional da fila local e integração com a nuvem.">
          <div className="grid gap-3">
            <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" onClick={handleForceSync}>
              Forçar sincronização
            </button>
            <button className="rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900">
              Gerenciar usuários
            </button>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Estratégia inicial de conflito: <strong className="text-brand-900">last-write-wins com timestamp</strong>.
            </div>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Pendências na fila: <strong className="text-brand-900">{syncQueue.length}</strong>
            </div>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Última sincronização:{" "}
              <strong className="text-brand-900">
                {settings.lastSyncAt ? formatDate(settings.lastSyncAt) : "ainda nao realizada"}
              </strong>
            </div>
            {message ? <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{message}</div> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
