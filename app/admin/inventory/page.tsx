import AdminShell from "@/components/admin/AdminShell";
import { products } from "@/lib/products";

export default function AdminInventoryPage() {
  return (
    <AdminShell
      title="Inventory"
      description="A visual inventory overview for future stock controls."
    >
      <div className="overflow-x-auto border border-[#f7ead2]/10 bg-[#120d08] shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#f7ead2]/10 text-[0.68rem] uppercase tracking-[0.2em] text-[#d8a344]">
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">SKU</th>
              <th className="px-5 py-4">Stock</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Location</th>
            </tr>
          </thead>
          <tbody>
            {products.slice(0, 10).map((product, index) => (
              <tr
                key={product.id}
                className="border-b border-[#f7ead2]/8 text-sm text-[#e8dcc8]/72 last:border-b-0"
              >
                <td className="px-5 py-4 font-medium text-[#f7ead2]">
                  {product.name.en}
                </td>
                <td className="px-5 py-4">SKU-{String(index + 1).padStart(4, "0")}</td>
                <td className="px-5 py-4">{index % 3 === 0 ? "8" : "12"}</td>
                <td className="px-5 py-4">
                  {product.inStock ? "Ready to Ship" : "Unavailable"}
                </td>
                <td className="px-5 py-4">Main Stockroom</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
