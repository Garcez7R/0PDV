import { PackagePlus, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { useAppState } from "../context/useAppState";
import type { Product } from "../lib/types";
import { formatCurrency } from "../lib/utils";

type ProductFormState = {
  id?: string;
  name: string;
  description: string;
  barcode: string;
  costPrice: string;
  salePrice: string;
  stockQty: string;
  minStockQty: string;
};

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  barcode: "",
  costPrice: "",
  salePrice: "",
  stockQty: "",
  minStockQty: ""
};

function toFormState(product: Product): ProductFormState {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    barcode: product.barcode,
    costPrice: String(product.costPrice),
    salePrice: String(product.salePrice),
    stockQty: String(product.stockQty),
    minStockQty: String(product.minStockQty)
  };
}

export function ProdutosPage() {
  const { products, settings, saveProduct, deleteProduct } = useAppState();
  const [query, setQuery] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>({
    ...emptyForm,
    minStockQty: String(settings.defaultMinStockQty)
  });

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

  function openForCreate() {
    setForm({
      ...emptyForm,
      minStockQty: String(settings.defaultMinStockQty)
    });
    setIsEditorOpen(true);
  }

  function openForEdit(product: Product) {
    setForm(toFormState(product));
    setIsEditorOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await saveProduct({
        id: form.id,
        name: form.name.trim(),
        description: form.description.trim(),
        barcode: form.barcode.trim(),
        costPrice: Number(form.costPrice),
        salePrice: Number(form.salePrice),
        stockQty: Number(form.stockQty),
        minStockQty: Number(form.minStockQty || settings.defaultMinStockQty)
      });

      openForCreate();
      setIsEditorOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível salvar o produto.");
    }
  }

  async function handleDelete(productId: string) {
    const confirmed = window.confirm("Deseja remover este produto do catálogo?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(productId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível excluir o produto.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Produtos"
        title="Cadastro e gestão do catálogo"
        description="Gestão estruturada do catálogo com persistência local e sincronização preparada para a nuvem."
      />

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard title="Lista de produtos" description="Pesquise por nome ou código de barras.">
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <input
              className="w-full rounded-2xl border border-brand-100 bg-canvas px-4 py-3"
              placeholder="Buscar produto"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 font-medium text-white" onClick={openForCreate}>
              <PackagePlus className="h-4 w-4" />
              Novo produto
            </button>
          </div>

          <div className="grid gap-3">
            {filteredProducts.map((product) => (
              <article key={product.id} className="rounded-3xl border border-brand-100 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-brand-900">{product.name}</h3>
                    <p className="text-sm text-slate-500">{product.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    <span className="rounded-full bg-brand-50 px-3 py-2">Cod: {product.barcode}</span>
                    <span className="rounded-full bg-brand-50 px-3 py-2">Custo: {formatCurrency(product.costPrice)}</span>
                    <span className="rounded-full bg-brand-50 px-3 py-2">Venda: {formatCurrency(product.salePrice)}</span>
                    <span className="rounded-full bg-brand-50 px-3 py-2">Estoque: {product.stockQty}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-brand-100 px-4 py-2 font-medium text-brand-900" onClick={() => openForEdit(product)}>
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                  <button className="inline-flex items-center gap-2 rounded-2xl border border-red-100 px-4 py-2 font-medium text-red-500" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                </div>
              </article>
            ))}
            {filteredProducts.length === 0 ? <p className="text-sm text-slate-500">Nenhum produto encontrado.</p> : null}
          </div>
        </SectionCard>

        <SectionCard
          title={form.id ? "Editar produto" : "Novo produto"}
          description="Formulário principal de cadastro e atualização do catálogo."
          className={isEditorOpen ? "" : "opacity-90"}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {form.id ? "Revise os campos e salve para atualizar o produto." : "Cadastre um item completo do catálogo."}
            </p>
            {isEditorOpen ? (
              <button className="rounded-full border border-brand-100 p-2 text-slate-500" onClick={() => setIsEditorOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nome
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Descrição
              <textarea className="min-h-24 rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Código de barras
              <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" value={form.barcode} onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Preço de custo
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => setForm((current) => ({ ...current, costPrice: event.target.value }))} required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Preço de venda
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="0.01" value={form.salePrice} onChange={(event) => setForm((current) => ({ ...current, salePrice: event.target.value }))} required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Estoque atual
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="1" value={form.stockQty} onChange={(event) => setForm((current) => ({ ...current, stockQty: event.target.value }))} required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Estoque mínimo
                <input className="rounded-2xl border border-brand-100 bg-canvas px-4 py-3" type="number" min="0" step="1" value={form.minStockQty} onChange={(event) => setForm((current) => ({ ...current, minStockQty: event.target.value }))} required />
              </label>
            </div>
            <button className="rounded-2xl bg-accent px-4 py-3 font-semibold text-brand-900" type="submit">
              {form.id ? "Salvar alterações" : "Cadastrar produto"}
            </button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
