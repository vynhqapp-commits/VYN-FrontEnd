'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productsApi, type Product } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form } from '@/components/ui/form';
import { RHFTextField } from '@/components/fields/RHFTextField';
import { RHFTextareaField } from '@/components/fields/RHFTextareaField';
import { Pagination } from '@/components/data/Pagination';
import { type PaginationMeta } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  sku: z.string().optional(),
  cost: z.preprocess((v) => Number(v), z.number().min(0)),
  price: z.preprocess((v) => Number(v), z.number().min(0)),
  stock_quantity: z.preprocess((v) => Number(v), z.number().int().min(0)),
  low_stock_threshold: z.preprocess((v) => Number(v), z.number().int().min(0)),
  is_active: z.boolean().default(true),
});
type Values = z.infer<typeof schema>;

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      cost: 0,
      price: 0,
      stock_quantity: 0,
      low_stock_threshold: 5,
      is_active: true,
    },
  });

  const load = async (p = page) => {
    setLoading(true);
    const res = await productsApi.list({
      search: q || undefined,
      is_active: status === 'all' ? undefined : status === 'active',
      page: p,
      per_page: 20,
    });
    setLoading(false);
    if ('error' in res && res.error) toastError(res.error);
    else if (res.data?.products) {
      setProducts(res.data.products);
      setMeta((res as any).meta ?? null);
      setPage(p);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: '',
      description: '',
      sku: '',
      cost: 0,
      price: 0,
      stock_quantity: 0,
      low_stock_threshold: 5,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    form.reset({
      name: p.name ?? '',
      description: p.description ?? '',
      sku: p.sku ?? '',
      cost: Number(p.cost ?? 0),
      price: Number(p.price ?? 0),
      stock_quantity: Number(p.stock_quantity ?? 0),
      low_stock_threshold: Number(p.low_stock_threshold ?? 5),
      is_active: p.is_active ?? true,
    });
    setModalOpen(true);
  };

  const onSubmit = async (v: Values) => {
    setSaving(true);
    try {
      if (editing?.id) {
        const res = await productsApi.update(String(editing.id), v as any);
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Product updated.');
          setModalOpen(false);
          await load();
        }
      } else {
        const res = await productsApi.create(v as any);
        if ('error' in res && res.error) toastError(res.error);
        else {
          toastSuccess('Product created.');
          setModalOpen(false);
          await load();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (p: Product) => {
    const ok = window.confirm(`Delete product "${p.name}"?`);
    if (!ok) return;
    const res = await productsApi.delete(String(p.id));
    if ('error' in res && (res as any).error) toastError((res as any).error);
    else {
      toastSuccess('Product deleted.');
      await load();
    }
  };

  if (loading) return <p className="text-salon-stone">Loading products...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-salon-espresso">Products</h1>
          <p className="text-salon-stone text-sm mt-1">
            Manage product catalog and stock quantity.
          </p>
        </div>
        <Button onClick={openCreate} className="rounded-xl h-11">New product</Button>
      </div>

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm p-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-salon-stone mb-1">Search</label>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, SKU..." />
        </div>
        <div>
          <label className="block text-xs font-semibold text-salon-stone mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-salon-sand/40 shadow-sm overflow-hidden">
        {products.length === 0 ? (
          <p className="p-6 text-salon-stone text-center">No products found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku ?? '—'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{Number(p.price ?? 0).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground">{Number(p.stock_quantity ?? 0)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="outline" className="h-9 rounded-xl" onClick={() => openEdit(p)}>Edit</Button>
                      <Button variant="destructive" className="h-9 rounded-xl" onClick={() => onDelete(p)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Pagination meta={meta} onPageChange={(p) => load(p)} />

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl border border-salon-sand/40">
            <div className="p-5 border-b border-salon-sand/40 flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-salon-espresso">
                {editing ? 'Edit product' : 'New product'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>✕</Button>
            </div>
            <div className="p-5">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RHFTextField control={form.control} name="name" label="Name" placeholder="Shampoo 500ml" />
                    <RHFTextField control={form.control} name="sku" label="SKU" placeholder="SKU-12345" />
                    <RHFTextField control={form.control} name="price" label="Price" type="number" placeholder="0" inputMode="decimal" />
                    <RHFTextField control={form.control} name="cost" label="Cost" type="number" placeholder="0" inputMode="decimal" />
                    <RHFTextField control={form.control} name="stock_quantity" label="Stock quantity" type="number" placeholder="0" inputMode="numeric" />
                    <RHFTextField control={form.control} name="low_stock_threshold" label="Low-stock threshold" type="number" placeholder="5" inputMode="numeric" />
                  </div>
                  <RHFTextareaField control={form.control} name="description" label="Description" placeholder="Optional description..." rows={3} />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!form.watch('is_active')}
                      onChange={(e) => form.setValue('is_active', e.target.checked)}
                    />
                    <span>Active</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save' : 'Create'}</Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
