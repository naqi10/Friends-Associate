import Link from "next/link";
import { notFound } from "next/navigation";
import { FormError } from "@/components/FormError";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { ProductForm } from "@/components/admin/ProductForm";
import { deleteProductAction } from "@/lib/actions/products";
import { getProduct } from "@/lib/data";
import { requireAdmin } from "@/lib/permissions";

export const metadata = { title: "Edit product" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> };

export default async function EditProductPage({ params, searchParams }: Props) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const product = await getProduct(id);
  if (!product) notFound();

  return (
    <div className="px-4 py-6 sm:px-[30px] lg:py-10">
      <Link href="/admin/products" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-sm font-medium text-body hover:border-ink hover:text-ink">
        ← All products
      </Link>
      <h1 className="mt-5 text-[32px] leading-tight font-semibold tracking-tight lg:text-[44px]">{product.name}</h1>
      <p className="mt-1.5 text-[15px] text-muted">
        Web address:{" "}
        <Link href={`/products/${product.slug}`} target="_blank" className="text-teal-800 underline">
          /products/{product.slug}
        </Link>
      </p>
      <FormError code={sp.error} />
      <ProductForm product={product} />

      <form action={deleteProductAction} className="mt-6 rounded-[28px] border-2 border-red-200 bg-white p-6 shadow-[0_18px_40px_-18px_rgb(14_14_14/0.28)]">
        <input type="hidden" name="id" value={product.id} />
        <h2 className="font-semibold text-red-800">Delete this product</h2>
        <p className="mt-1 text-sm text-stone-600">It disappears from the website straight away. To hide it for now and keep the details, untick Published instead.</p>
        <ConfirmButton message={`Delete the product "${product.name}"? This cannot be undone.`} className="mt-3">
          Delete product
        </ConfirmButton>
      </form>
    </div>
  );
}
