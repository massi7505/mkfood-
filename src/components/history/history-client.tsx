'use client';

import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useOrders } from '@/hooks/useOrders';
import type { DolibarrOrder } from '@/lib/dolibarr/types';
import { useCartStore } from '@/lib/store/cart';
import { format, subMonths } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';

function exportCsv(orders: DolibarrOrder[]) {
  const header = ['ref', 'date', 'statut', 'total_ht', 'total_ttc', 'nb_lignes'];
  const rows = orders.map((order) => [
    order.ref,
    new Date(order.date_commande * 1000).toISOString(),
    order.statut,
    order.total_ht,
    order.total_ttc,
    order.lines.length
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'historique-commandes.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export function HistoryClient() {
  const { orders } = useOrders();
  const [period, setPeriod] = useState('12m');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const filteredOrders = useMemo(() => {
    const months = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[period] ?? 12;
    const minDate = subMonths(new Date(), months);
    return orders.filter((order) => {
      const date = new Date(order.date_commande * 1000);
      const query = search.toLowerCase();
      const matchesDate = date >= minDate;
      const matchesSearch =
        !query ||
        order.ref.toLowerCase().includes(query) ||
        order.lines.some(
          (line) =>
            line.product_ref.toLowerCase().includes(query) ||
            line.product_label.toLowerCase().includes(query)
        );
      return matchesDate && matchesSearch;
    });
  }, [orders, period, search]);

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }).map((_, index) => {
      const date = subMonths(new Date(), 11 - index);
      const key = format(date, 'yyyy-MM');
      const total = orders
        .filter((order) => format(new Date(order.date_commande * 1000), 'yyyy-MM') === key)
        .reduce((sum, order) => sum + Number(order.total_ht || 0), 0);
      return { month: format(date, 'MM/yy'), total };
    });
  }, [orders]);

  function reorder(order: DolibarrOrder) {
    for (const line of order.lines) {
      addItem({
        productId: line.fk_product,
        ref: line.product_ref,
        label: line.product_label,
        priceHt: Number(line.subprice),
        tva: Number(line.tva_tx),
        qty: Number(line.qty)
      });
    }
    toast.success(`${order.lines.length} produits ajoutes au panier`);
    openCart();
  }

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Historique'
        description='Commandes passees, statistiques et reapprovisionnement rapide.'
        actions={
          <Button type='button' variant='outline' onClick={() => exportCsv(filteredOrders)}>
            Exporter en CSV
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className='text-base'>Depenses mensuelles HT</CardTitle>
        </CardHeader>
        <CardContent className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData}>
              <XAxis dataKey='month' tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} EUR`, 'Total HT']} />
              <Line type='monotone' dataKey='total' stroke='#2563EB' strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className='flex flex-col gap-3 md:flex-row'>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder='Reference commande ou produit'
          className='md:max-w-sm'
        />
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className='md:w-52'>
            <SelectValue placeholder='Periode' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='1m'>Ce mois</SelectItem>
            <SelectItem value='3m'>3 mois</SelectItem>
            <SelectItem value='6m'>6 mois</SelectItem>
            <SelectItem value='12m'>1 an</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 && (
        <EmptyState
          icon={History}
          title='Aucun achat'
          description='Aucune commande ne correspond aux filtres.'
        />
      )}

      <div className='space-y-3'>
        {filteredOrders.map((order) => {
          const isExpanded = expanded === order.id;
          return (
            <Card key={order.id} className='rounded-lg'>
              <CardContent className='space-y-4'>
                <button
                  type='button'
                  className='grid w-full gap-3 text-left md:grid-cols-[1fr_auto_auto_auto]'
                  onClick={() => setExpanded(isExpanded ? null : order.id)}
                >
                  <div>
                    <p className='font-mono text-sm font-semibold'>{order.ref}</p>
                    <p className='text-muted-foreground text-sm'>
                      {format(new Date(order.date_commande * 1000), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <StatusBadge type='order' status={order.statut} />
                  <PriceDisplay
                    amount={Number(order.total_ttc)}
                    className='text-sm font-semibold'
                  />
                  <span className='text-muted-foreground text-sm'>{order.lines.length} lignes</span>
                </button>

                {isExpanded && (
                  <div className='space-y-3'>
                    <div className='overflow-hidden rounded-lg border'>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ref</TableHead>
                            <TableHead>Produit</TableHead>
                            <TableHead>Qte</TableHead>
                            <TableHead>Prix unit HT</TableHead>
                            <TableHead>Total HT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className='font-mono'>{line.product_ref}</TableCell>
                              <TableCell>{line.product_label}</TableCell>
                              <TableCell>{line.qty}</TableCell>
                              <TableCell>
                                <PriceDisplay amount={Number(line.subprice)} />
                              </TableCell>
                              <TableCell>
                                <PriceDisplay amount={Number(line.total_ht)} />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      type='button'
                      onClick={() => reorder(order)}
                      className='bg-blue-600 hover:bg-blue-700'
                    >
                      <RotateCcw className='size-4' />
                      Recommander
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
