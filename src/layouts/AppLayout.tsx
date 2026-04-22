import { BarChart3, Boxes, House, LogOut, Settings, ShoppingCart } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAppState } from "../context/useAppState";
import { cn } from "../lib/utils";
import { BrandWordmark } from "../shared/components/BrandWordmark";

const links = [
  { to: "/", label: "Início", icon: House },
  { to: "/caixa", label: "Caixa", icon: ShoppingCart },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/produtos", label: "Catálogo", icon: Boxes },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings }
];

export function AppLayout() {
  const { currentUser, logout } = useAppState();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(245,243,234,0.72),rgba(245,243,234,1)),radial-gradient(circle_at_top,rgba(15,118,110,0.18),transparent_42%)]" />
      <div className="fixed inset-0 -z-10 bg-grid bg-[size:22px_22px] opacity-40" />
      <header className="border-b border-brand-100/80 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <BrandWordmark size="sm" />
            <h1 className="text-xl font-bold text-brand-900">Operação de caixa, estoque e catálogo</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-sm text-brand-900">
              Operação híbrida para balcão, tablet e retaguarda
            </div>
            {currentUser ? (
              <div className="flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-2 text-sm text-brand-900">
                <span>{currentUser.name}</span>
                <span className="rounded-full bg-brand-50 px-2 py-1 text-xs uppercase tracking-[0.2em]">
                  {currentUser.role === "manager" ? "Gerente" : "Operador"}
                </span>
                <button className="inline-flex items-center gap-1 text-slate-600" onClick={() => void logout()}>
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-3xl border border-brand-100 bg-white/90 p-3 shadow-soft">
          <nav className="grid gap-2">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-brand-500 text-white shadow-soft"
                      : "text-slate-600 hover:bg-brand-50 hover:text-brand-900"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
