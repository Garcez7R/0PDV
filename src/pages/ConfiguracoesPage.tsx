import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import { formatDate } from "../lib/utils";

export function ConfiguracoesPage() {
  const { settings, syncQueue, saveSettings, forceSync, auditEntries, currentUser } = useAppState();
  const isManager = currentUser?.role === "manager";
  const [storeName, setStoreName] = useState(settings.storeName);
  const [defaultMinStockQty, setDefaultMinStockQty] = useState(String(settings.defaultMinStockQty));
  const [operatorName, setOperatorName] = useState(settings.operatorName);
  const [operatorPin, setOperatorPin] = useState(settings.operatorPin);
  const [managerName, setManagerName] = useState(settings.managerName);
  const [managerPin, setManagerPin] = useState(settings.managerPin);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStoreName(settings.storeName);
    setDefaultMinStockQty(String(settings.defaultMinStockQty));
    setOperatorName(settings.operatorName);
    setOperatorPin(settings.operatorPin);
    setManagerName(settings.managerName);
    setManagerPin(settings.managerPin);
  }, [settings]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveSettings({
        ...settings,
        storeName: storeName.trim(),
        defaultMinStockQty: Number(defaultMinStockQty),
        operatorName: operatorName.trim(),
        operatorPin: operatorPin.trim(),
        managerName: managerName.trim(),
        managerPin: managerPin.trim()
      });
      setMessage("Configurações salvas com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar as configurações.");
    }
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
            {!isManager ? (
              <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">
                Apenas usuários com perfil de gerente podem alterar as configurações da operação.
              </div>
            ) : null}
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Estoque mínimo padrão
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="1" value={defaultMinStockQty} onChange={(event) => setDefaultMinStockQty(event.target.value)} disabled={!isManager} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nome da loja
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={storeName} onChange={(event) => setStoreName(event.target.value)} disabled={!isManager} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome do operador
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={operatorName} onChange={(event) => setOperatorName(event.target.value)} disabled={!isManager} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                PIN do operador
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="password" inputMode="numeric" value={operatorPin} onChange={(event) => setOperatorPin(event.target.value)} disabled={!isManager} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome do gerente
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={managerName} onChange={(event) => setManagerName(event.target.value)} disabled={!isManager} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                PIN do gerente
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="password" inputMode="numeric" value={managerPin} onChange={(event) => setManagerPin(event.target.value)} disabled={!isManager} />
              </label>
            </div>
            <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
              Perfil atual: <strong className="text-brand-900">{currentUser?.name}</strong> ({currentUser?.role === "manager" ? "Gerente" : "Operador"})
            </div>
            <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={!isManager}>
              Salvar configurações
            </button>
          </form>
        </SectionCard>

        <SectionCard title="Sincronização" description="Visão operacional da fila local e integração com a nuvem.">
          <div className="grid gap-3">
            <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60" onClick={handleForceSync} disabled={!isManager}>
              Forçar sincronização
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

      <SectionCard title="Trilha de auditoria" description="Eventos recentes relacionados a autenticação, catálogo, estoque, vendas e sincronização." className="mt-4">
        <div className="grid gap-3">
          {auditEntries.slice(0, 12).map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-brand-100 bg-canvas p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-brand-900">{entry.details}</p>
                  <p className="text-sm text-slate-500">
                    {entry.actor.name} • {entry.actor.role === "manager" ? "Gerente" : "Operador"} • {entry.action}
                  </p>
                </div>
                <p className="text-sm text-slate-500">{formatDate(entry.createdAt)}</p>
              </div>
            </div>
          ))}
          {auditEntries.length === 0 ? <p className="text-sm text-slate-500">Nenhum evento de auditoria registrado até o momento.</p> : null}
        </div>
      </SectionCard>
    </div>
  );
}
