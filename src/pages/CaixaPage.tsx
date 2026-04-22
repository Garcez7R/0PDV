import { Camera, Link as LinkIcon, Minus, Plus, Power, RefreshCcw, ScanLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import type { PaymentMethod, Product, ScannerSession } from "../lib/types";
import {
  endScannerSession,
  loadScannerSession,
  openScannerSession,
  pollScannerBarcode
} from "../modules/scanner/services/scanner-service";
import { QrCodeCard } from "../shared/components/QrCodeCard";
import { formatCurrency, formatQuantity } from "../lib/utils";

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

function getDefaultRequestedQuantity(product: Product) {
  return product.saleMode === "weight" ? 0.1 : 1;
}

export function CaixaPage() {
  const { products, createSale, syncQueue } = useAppState();
  const [query, setQuery] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("1");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [message, setMessage] = useState("");
  const [scannerSession, setScannerSession] = useState<ScannerSession | null>(null);
  const [scannerLink, setScannerLink] = useState("");
  const [scannerTimeLeft, setScannerTimeLeft] = useState("");

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

  const highlightedProduct = matchingProducts[0];

  const cartDetailed: CartDetailedItem[] = cart.flatMap((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
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
    if (!highlightedProduct) {
      return;
    }

    setRequestedQuantity((current) => {
      if (!current.trim()) {
        return highlightedProduct.saleMode === "weight" ? "0.100" : "1";
      }

      return current;
    });
  }, [highlightedProduct]);

  useEffect(() => {
    if (!scannerSession?.id) {
      return;
    }

    const activeSessionId = scannerSession.id;

    const timer = window.setInterval(async () => {
      try {
        const latestSession = await loadScannerSession(activeSessionId);
        setScannerSession(latestSession);

        if (latestSession.status !== "open" || new Date(latestSession.expiresAt).getTime() <= Date.now()) {
          setMessage("Sessão do leitor remoto encerrada ou expirada.");
          setScannerSession(null);
          setScannerLink("");
          return;
        }

        const scan = await pollScannerBarcode(activeSessionId);
        if (!scan) {
          return;
        }

        const product = products.find((candidate) => candidate.barcode === scan.barcode);
        if (!product) {
          setMessage(`Código ${scan.barcode} recebido, mas nenhum produto corresponde a ele.`);
          return;
        }

        const quantity = getDefaultRequestedQuantity(product);
        setCart((current) => {
          const existing = current.find((item) => item.productId === product.id);
          const nextQuantity = existing ? existing.quantity + quantity : quantity;

          if (nextQuantity > product.stockQty) {
            setMessage(`Estoque insuficiente para ${product.name}.`);
            return current;
          }

          if (existing) {
            return current.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: Number(nextQuantity.toFixed(product.saleMode === "weight" ? 3 : 0)) }
                : item
            );
          }

          return [...current, { productId: product.id, quantity }];
        });
        if (product.saleMode === "weight") {
          setMessage(`Leitura remota recebida para ${product.name}. Ajuste o peso no caixa antes de concluir.`);
        } else {
          setMessage(`Leitura remota recebida: ${product.name}.`);
        }
      } catch {
        // Keep polling silently while the session is active.
      }
    }, 1400);

    return () => window.clearInterval(timer);
  }, [products, scannerSession]);

  useEffect(() => {
    if (!scannerSession) {
      setScannerTimeLeft("");
      return;
    }

    const activeExpiresAt = scannerSession.expiresAt;

    function updateTimeLeft() {
      const remainingMs = new Date(activeExpiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setScannerTimeLeft("Expirada");
        return;
      }

      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      setScannerTimeLeft(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    }

    updateTimeLeft();
    const timer = window.setInterval(updateTimeLeft, 1000);
    return () => window.clearInterval(timer);
  }, [scannerSession]);

  function getRequestedQuantity(product: Product) {
    const parsed = Number(requestedQuantity.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    if (product.saleMode === "weight") {
      return Number(parsed.toFixed(3));
    }

    return Math.max(1, Math.round(parsed));
  }

  function addToCart(product: Product, explicitQuantity?: number) {
    setMessage("");
    const quantity = explicitQuantity ?? getRequestedQuantity(product);
    if (!quantity || quantity <= 0) {
      setMessage(product.saleMode === "weight" ? "Informe um peso válido em quilogramas." : "Informe uma quantidade válida.");
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const nextQuantity = existing ? existing.quantity + quantity : quantity;

      if (nextQuantity > product.stockQty) {
        setMessage(`Estoque insuficiente para ${product.name}.`);
        return current;
      }

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Number(nextQuantity.toFixed(product.saleMode === "weight" ? 3 : 0)) }
            : item
        );
      }

      return [...current, { productId: product.id, quantity }];
    });

    setQuery("");
    setRequestedQuantity(product.saleMode === "weight" ? "0.100" : "1");
  }

  function changeQuantity(product: Product, nextQuantity: number) {
    if (nextQuantity <= 0) {
      removeItem(product.id);
      return;
    }

    if (nextQuantity > product.stockQty) {
      setMessage(`Estoque insuficiente para ${product.name}.`);
      return;
    }

    setCart((current) =>
      current.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: Number(nextQuantity.toFixed(product.saleMode === "weight" ? 3 : 0)) }
          : item
      )
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
      setMessage("Venda concluída com sucesso. Estoque atualizado na base local.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a venda.");
    }
  }

  async function startRemoteScanner() {
    try {
      if (scannerSession) {
        await endScannerSession(scannerSession.id);
      }
      const session = await openScannerSession();
      setScannerSession(session);
      setScannerLink(`${window.location.origin}/scanner?session=${session.id}`);
      setMessage("Sessão do leitor remoto iniciada. Abra o link no dispositivo móvel e inicie a leitura.");
    } catch {
      setMessage("Não foi possível abrir a sessão do leitor remoto.");
    }
  }

  async function refreshRemoteScanner() {
    await startRemoteScanner();
  }

  async function closeRemoteScanner() {
    if (!scannerSession) {
      return;
    }

    try {
      await endScannerSession(scannerSession.id);
      setScannerSession(null);
      setScannerLink("");
      setScannerTimeLeft("");
      setMessage("Sessão do leitor remoto encerrada.");
    } catch {
      setMessage("Não foi possível encerrar a sessão agora.");
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
        title="Frente de caixa"
        description="Operação de venda com busca de itens, pagamento, leitura remota e baixa automática no estoque."
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard title="Lançamento da venda" description="Pesquise por nome ou código de barras.">
          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
              <input
                className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3 outline-none ring-0 placeholder:text-slate-400"
                placeholder="Digite o código de barras ou nome do produto"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <input
                className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3 outline-none ring-0"
                placeholder={highlightedProduct?.saleMode === "weight" ? "Peso em kg" : "Quantidade"}
                value={requestedQuantity}
                onChange={(event) => setRequestedQuantity(event.target.value)}
              />
              <button className="rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" onClick={() => highlightedProduct && addToCart(highlightedProduct)}>
                Adicionar item
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900" onClick={startRemoteScanner}>
                <Camera className="h-4 w-4" />
                Escanear
              </button>
            </div>

            {highlightedProduct ? (
              <div className="rounded-2xl bg-canvas p-4 text-sm text-slate-600">
                Produto em foco: <strong className="text-brand-900">{highlightedProduct.name}</strong> •{" "}
                {highlightedProduct.saleMode === "weight"
                  ? "Informe o peso em quilogramas. Exemplo: 135 g = 0,135 kg."
                  : "Lançamento por unidade."}
              </div>
            ) : null}

            {scannerSession ? (
              <div className="grid gap-4 rounded-3xl border border-brand-100 bg-brand-50 p-4 lg:grid-cols-[1fr_260px]">
                <div>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Leitor remoto ativo</p>
                      <p className="mt-1 text-lg font-bold text-brand-900">Sessão {scannerSession.pairingCode}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        No celular, abra o 0PDV em <strong>/scanner</strong> e leia o QR Code abaixo para parear com este caixa.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-white px-3 py-2 font-medium text-brand-900">
                          Status: {scannerSession.status === "open" ? "Ativa" : "Encerrada"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-2 font-medium text-brand-900">
                          Tempo restante: {scannerTimeLeft || "--:--"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900" onClick={copyScannerLink}>
                        <LinkIcon className="h-4 w-4" />
                        Copiar link
                      </button>
                      <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-brand-900" onClick={refreshRemoteScanner}>
                        <RefreshCcw className="h-4 w-4" />
                        Renovar
                      </button>
                      <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-3 font-medium text-red-600" onClick={closeRemoteScanner}>
                        <Power className="h-4 w-4" />
                        Encerrar
                      </button>
                    </div>
                  </div>
                  <p className="mt-3 break-all rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">{scannerLink}</p>
                </div>
                <QrCodeCard
                  value={scannerLink}
                  title="Parear no celular"
                  description="Abra o 0PDV no celular, entre em /scanner e use a opção de leitura de QR para conectar este caixa ao leitor remoto."
                />
              </div>
            ) : null}

            <div className="rounded-3xl border border-brand-100 bg-white p-4">
              <p className="mb-3 text-sm font-semibold text-brand-900">Sugestões para lançamento rápido</p>
              <div className="grid gap-3 md:grid-cols-2">
                {matchingProducts.slice(0, 6).map((product) => (
                  <button key={product.id} className="rounded-2xl border border-brand-100 bg-canvas p-4 text-left" onClick={() => addToCart(product, getDefaultRequestedQuantity(product))}>
                    <p className="font-semibold text-brand-900">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.barcode}</p>
                    <p className="mt-2 text-sm text-brand-900">
                      {formatCurrency(product.salePrice)}
                      {product.saleMode === "weight" ? "/kg" : ""} • {formatQuantity(product.stockQty, product.saleMode)}
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
                    <p className="text-sm text-slate-500">
                      Saldo disponível: {formatQuantity(item.product.stockQty, item.product.saleMode)}
                    </p>
                  </div>
                  {item.product.saleMode === "weight" ? (
                    <input
                      className="rounded-2xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                      type="number"
                      min="0.001"
                      max={item.product.stockQty}
                      step="0.001"
                      value={item.quantity}
                      onChange={(event) => changeQuantity(item.product, Number(event.target.value))}
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <button className="rounded-full border border-brand-100 p-2 text-brand-900" onClick={() => changeQuantity(item.product, item.quantity - 1)}>
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-600">{item.quantity}</span>
                      <button className="rounded-full border border-brand-100 p-2 text-brand-900" onClick={() => changeQuantity(item.product, item.quantity + 1)}>
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  )}
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

        <SectionCard title="Fechamento" description="Resumo financeiro, pagamento e sincronização.">
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
                <span>Pendências de sincronização</span>
                <strong>{syncQueue.length}</strong>
              </div>
            </div>
            {message ? <div className="rounded-2xl bg-brand-50 p-4 text-sm text-brand-900">{message}</div> : null}
            <div className="grid gap-3">
              <button className="rounded-2xl bg-accent px-4 py-3 font-semibold text-brand-900" onClick={finalizeSale}>
                Finalizar venda
              </button>
              <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-100 bg-white px-4 py-3 font-medium text-slate-700" onClick={() => setMessage("As operações locais seguem registradas e podem ser sincronizadas manualmente a qualquer momento.")}>
                <ScanLine className="h-4 w-4" />
                Revisar sincronização
              </button>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
