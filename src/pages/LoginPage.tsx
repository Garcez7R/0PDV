import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAppState } from "../context/useAppState";

export function LoginPage() {
  const { login, settings } = useAppState();
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await login(pin);
      setPin("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível iniciar a sessão.");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-brand-100 bg-white/90 p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-700">nexaPDV</p>
          <h1 className="mt-3 text-4xl font-bold text-brand-900">Acesso à operação</h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Entre com o PIN do operador ou do gerente para acessar o caixa, o estoque e o catálogo com trilha de auditoria.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] bg-canvas p-5">
              <div className="mb-2 flex items-center gap-2 text-brand-900">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-semibold">Perfis</span>
              </div>
              <p className="text-sm text-slate-600">
                Operador: <strong className="text-brand-900">{settings.operatorName}</strong>
              </p>
              <p className="text-sm text-slate-600">
                Gerente: <strong className="text-brand-900">{settings.managerName}</strong>
              </p>
            </div>

            <div className="rounded-[24px] bg-canvas p-5">
              <div className="mb-2 flex items-center gap-2 text-brand-900">
                <LockKeyhole className="h-5 w-5" />
                <span className="font-semibold">Controles</span>
              </div>
              <p className="text-sm text-slate-600">Alterações sensíveis exigem perfil de gerente.</p>
              <p className="text-sm text-slate-600">Todas as ações principais ficam registradas em auditoria.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-brand-100 bg-white/90 p-8 shadow-soft">
          <h2 className="text-2xl font-bold text-brand-900">Entrar com PIN</h2>
          <p className="mt-2 text-sm text-slate-600">Use o PIN configurado para o seu perfil.</p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              PIN de acesso
              <input
                className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                placeholder="Digite o PIN"
                required
              />
            </label>
            <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" type="submit">
              Entrar na operação
            </button>
            {message ? <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{message}</div> : null}
          </form>
        </section>
      </div>
    </div>
  );
}
