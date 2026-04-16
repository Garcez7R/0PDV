import { Camera, Link as LinkIcon, Minus, Plus, ScanLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import type { PaymentMethod, Product } from "../lib/types";
import { openScannerSession, pollScannerBarcode } from "../modules/scanner/services/scanner-service";
import { QrCodeCard } from "../shared/components/QrCodeCard";
import { formatCurrency } from "../lib/utils";

type CartItem = {
  productId: string;
  quantity: number;
};

type CartDetailedItem = {
  productId: string;
  quantity: number;
  product: Product;
  subtotal: number;
};

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Dinheiro" },
  { value: "debit", label: "Cartão débito" },
  { value: "credit", label: "Cartão crédito" }
];

export function CaixaPage() {
  const { products, createSale, syncQueue } = useAppState();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [message, setMessage] = useState("");
  const [scannerSessionId, setScannerSessionId] = useState("");
  const [scannerPairingCode, setScannerPairingCode] = useState("");
  const [scannerLink, setScannerLink] = useState("");

  const matchingProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products.slice(0, 6);
    }

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) || product.barcode.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  const cartDetailed: CartDetailedItem[] = cart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId) as Product | undefined;
    return product
      ? [
          {
            ...item,
            product,
            subtotal: product.salePrice * item.quantity
          }
        ]
      : [];
  });

  const total = cartDetailed.reduce((acc, item) => acc + item.subtotal, 0);
  const received = Number(amountPaid || 0);

  useEffect(() => {
    if (!scannerSessionId) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const scan = await pollScannerBarcode(scannerSessionId);
        if (!scan) {
          return;
        }

        const product = products.find((candidate) => candidate.barcode === scan.barcode);
        if (!product) {
          setMessage(`Código ${scan.barcode} recebido do celular, mas nenhum produto corresponde a ele.`);
          return;
        }

        addToCart(product);
        setMessage(`Leitura remota recebida: ${product.name}.`);
      } catch {
        // Keep polling silently while the session is active.
      }
    }, 1400);

    return () => window.clearInterval(timer);
  }, [products, scannerSessionId]);

  function addToCart(product: Product) {
    setMessage("");
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQty) }
            : item
        );
      }

      return [...current, { productId: product.id, quantity: 1 }];
    });
    setQuery("");
  }

  function changeQuantity(productId: string, nextQuantity: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity: nextQuantity } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeItem(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  async function finalizeSale() {
    if (cartDetailed.length === 0) {
      setMessage("Adicione pelo menos um item para concluir a venda.");
      return;
    }

    try {
      await createSale({
        items: cartDetailed.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        amountPaid: received,
        paymentMethod
      });

      setCart([]);
      setAmountPaid("");
      setPaymentMethod("cash");
      setMessage("Venda concluída com sucesso. Estoque atualizado localmente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel finalizar a venda.");
    }
  }

  async function startRemoteScanner() {
    try {
      const session = await openScannerSession();
      setScannerSessionId(session.id);
      setScannerPairingCode(session.pairingCode);
      setScannerLink(`${window.location.origin}/scanner?session=${session.id}`);
      setMessage("Sessão de leitor remoto pronta. Abra o link no celular e comece a escanear.");
    } catch {
      setMessage("Não foi possível abrir a sessão do leitor remoto.");
    }
  }

  async function copyScannerLink() {
    if (!scannerLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(scannerLink);
      setMessage("Link do leitor remoto copiado.");
    } catch {
      setMessage("Copie manualmente o link exibido abaixo.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Caixa"
        title="Frente de venda híbrida"
        description="Fluxo funcional para busca, lançamento de itens, pagamento e baixa automática no estoque."
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard title="Lançamento da venda" description="Busca por nome ou codigo de barras.">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3 outline-none ring-0 placeholder:text-slate-400"
                placeholder="Digite o código de barras ou nome do produto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" onClick={() => matchingProducts[0] && addToCart(matchingProducts[0])}>
                Adicionar item
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900" onClick={startRemoteScanner}>
                <Camera className="h-4 w-4" />
                Escanear
              </button>
            </div>

            {scannerSessionId ? (
              <div className="grid gap-4 rounded-3xl border border-brand-100 bg-brand-50 p-4 lg:grid-cols-[1fr_260px]">
                <div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Leitor remoto ativo</p>
                      <p className="mt-1 text-lg font-bold text-brand-900">Sessão {scannerPairingCode}</p>
                      <p className="mt-1 text-sm text-slate-600">Abra o link no celular conectado à mesma operação para enviar leituras ao caixa.</p>
                    </div>
                    <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900" onClick={copyScannerLink}>
                      <LinkIcon className="h-4 w-4" />
                      Copiar link
                    </button>
                  </div>
                  <p className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">{scannerLink}</p>
                </div>
                <QrCodeCard
                  value={scannerLink}
                  title="Abrir no celular"
                  description="Leia este QR Code com a câmera do celular para abrir o scanner remoto."
                />
              </div>
            ) : null}

            <div className="rounded-3xl border border-brand-100 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-brand-900">Sugestões para lançamento rápido</p>
              <div className="grid gap-3 md:grid-cols-2">
                {matchingProducts.slice(0, 6).map((product) => (
                  <button key={product.id} className="rounded-2xl border border-brand-100 bg-canvas p-4 text-left" onClick={() => addToCart(product)}>
                    <p className="font-semibold text-brand-900">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.barcode}</p>
                    <p className="mt-2 text-sm text-brand-900">
                      {formatCurrency(product.salePrice)} • Estoque {product.stockQty}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              {cartDetailed.map((item) => (
                <div key={item.product.id} className="grid items-center gap-3 rounded-2xl border border-brand-100 bg-canvas px-4 py-4 md:grid-cols-[1fr_auto_auto_auto]">
                  <div>
                    <p className="font-semibold text-brand-900">{item.product.name}</p>
                    <p className="text-sm text-slate-500">Saldo disponível: {item.product.stockQty}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="rounded-full border border-brand-100 p-2 text-brand-900" onClick={() => changeQuantity(item.product.id, item.quantity - 1)}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-600">{item.quantity}</span>
                    <button className="rounded-full border border-brand-100 p-2 text-brand-900" onClick={() => changeQuantity(item.product.id, Math.min(item.quantity + 1, item.product.stockQty))}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-sm font-semibold text-brand-900">{formatCurrency(item.subtotal)}</div>
                  <button className="inline-flex items-center justify-center rounded-full border border-red-100 p-2 text-red-500" onClick={() => removeItem(item.product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {cartDetailed.length === 0 ? <p className="text-sm text-slate-500">Nenhum item lançado ainda.</p> : null}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Fechamento" description="Resumo, pagamento e sincronização.">
          <div className="grid gap-4">
            <div className="rounded-3xl bg-brand-900 p-5 text-white">
              <p className="text-sm uppercase tracking-[0.2em] text-brand-100">Total da venda</p>
              <p className="mt-2 text-4xl font-bold">{formatCurrency(total)}</p>
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Forma de pagamento
              <select className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                {paymentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Valor recebido
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="0.01" value={amountPaid} onChange={(event) => setAmountPaid(event.target.value)} />
            </label>
            <div className="grid gap-2 rounded-2xl border border-brand-100 bg-canvas p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Troco</span>
                <strong>{formatCurrency(Math.max(received - total, 0))}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Pendências offline</span>
                <strong>{syncQueue.length}</strong>
              </div>
            </div>
            {message ? <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{message}</div> : null}
            <div className="grid gap-3">
              <button className="rounded-2xl bg-accent px-4 py-3 font-semibold text-brand-900" onClick={finalizeSale}>
                Finalizar venda
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-slate-700" onClick={() => setMessage("A fila local já está pronta para sincronizar automaticamente quando você quiser forçar o envio.")}>
                <ScanLine className="h-4 w-4" />
                Ver estado da sincronização
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
