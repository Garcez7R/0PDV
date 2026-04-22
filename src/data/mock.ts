import type { AuthUser, Product, Sale } from "../lib/types";

const seedManager: AuthUser = {
  id: "user-manager-seed",
  name: "Gerente",
  role: "manager"
};

export const mockProducts: Product[] = [
  {
    id: "prod-arroz",
    name: "Arroz Tipo 1 5kg",
    description: "Pacote premium para reposição semanal.",
    barcode: "789100000001",
    saleMode: "unit",
    costPrice: 21.5,
    salePrice: 29.9,
    stockQty: 18,
    minStockQty: 6,
    updatedAt: new Date().toISOString(),
    updatedBy: seedManager
  },
  {
    id: "prod-feijao",
    name: "Feijão Carioca 1kg",
    description: "Pacote tradicional.",
    barcode: "789100000002",
    saleMode: "unit",
    costPrice: 6.2,
    salePrice: 8.9,
    stockQty: 9,
    minStockQty: 8,
    updatedAt: new Date().toISOString(),
    updatedBy: seedManager
  },
  {
    id: "prod-cafe",
    name: "Café Torrado 500g",
    description: "Café moído extra forte.",
    barcode: "789100000003",
    saleMode: "unit",
    costPrice: 11.4,
    salePrice: 15.9,
    stockQty: 22,
    minStockQty: 7,
    updatedAt: new Date().toISOString(),
    updatedBy: seedManager
  },
  {
    id: "prod-queijo",
    name: "Queijo Mussarela Fatiado",
    description: "Item vendido por peso, com preço por quilograma.",
    barcode: "289100000004",
    saleMode: "weight",
    costPrice: 31.9,
    salePrice: 49.9,
    stockQty: 4.85,
    minStockQty: 1.2,
    updatedAt: new Date().toISOString(),
    updatedBy: seedManager
  }
];

export const mockSales: Sale[] = [
  {
    id: "sale-001",
    total: 54.7,
    amountPaid: 60,
    change: 5.3,
    paymentMethod: "cash",
    createdAt: new Date().toISOString(),
    createdBy: seedManager,
    items: [
      {
        productId: "prod-arroz",
        quantity: 1,
        unitPrice: 29.9,
        subtotal: 29.9,
        saleMode: "unit"
      },
      {
        productId: "prod-cafe",
        quantity: 1,
        unitPrice: 15.9,
        subtotal: 15.9,
        saleMode: "unit"
      },
      {
        productId: "prod-feijao",
        quantity: 1,
        unitPrice: 8.9,
        subtotal: 8.9,
        saleMode: "unit"
      }
    ]
  }
];
