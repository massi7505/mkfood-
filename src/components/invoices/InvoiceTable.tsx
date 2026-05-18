'use client';

import { InvoiceBadge } from '@/components/invoices/InvoiceBadge';
import { PriceDisplay } from '@/components/shared/PriceDisplay';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useInvoicePDF } from '@/hooks/useInvoices';
import type { DolibarrInvoice } from '@/lib/dolibarr/types';
import { formatInvoiceDate } from '@/lib/invoices/format';
import { isInvoicePaid } from '@/lib/invoices/status';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table';
import { Download } from 'lucide-react';

function PdfButton({ invoice }: { invoice: DolibarrInvoice }) {
  const isPaid = isInvoicePaid(invoice);
  const { downloadPDF, isDownloading } = useInvoicePDF(invoice.id, invoice);

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      disabled={!isPaid}
      isLoading={isDownloading}
      onClick={downloadPDF}
      title={isPaid ? 'Telecharger la facture' : 'PDF disponible apres paiement'}
    >
      <Download className='size-4' />
      PDF
    </Button>
  );
}

const columns: ColumnDef<DolibarrInvoice>[] = [
  {
    accessorKey: 'ref',
    header: 'Reference',
    cell: ({ row }) => <span className='font-mono'>{row.original.ref}</span>
  },
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => formatInvoiceDate(row.original.date)
  },
  {
    accessorKey: 'date_lim_reglement',
    header: 'Echeance',
    cell: ({ row }) => formatInvoiceDate(row.original.date_lim_reglement)
  },
  {
    accessorKey: 'total_ht',
    header: 'Montant HT',
    cell: ({ row }) => <PriceDisplay amount={Number(row.original.total_ht)} />
  },
  {
    id: 'tva',
    header: 'TVA',
    cell: ({ row }) => (
      <PriceDisplay amount={Number(row.original.total_ttc) - Number(row.original.total_ht)} />
    )
  },
  {
    accessorKey: 'total_ttc',
    header: 'Total TTC',
    cell: ({ row }) => <PriceDisplay amount={Number(row.original.total_ttc)} />
  },
  {
    accessorKey: 'remaintopay',
    header: 'Restant du',
    cell: ({ row }) => <PriceDisplay amount={Number(row.original.remaintopay)} />
  },
  {
    id: 'status',
    header: 'Statut',
    cell: ({ row }) => <InvoiceBadge invoice={row.original} />
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <PdfButton invoice={row.original} />
  }
];

export function InvoiceTable({ invoices }: { invoices: DolibarrInvoice[] }) {
  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20
      }
    }
  });

  return (
    <div className='space-y-4'>
      <div className='space-y-3 md:hidden'>
        {table.getRowModel().rows.map((row) => {
          const invoice = row.original;
          return (
            <div className='rounded-lg border bg-card p-3' key={invoice.id}>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='truncate font-mono text-sm font-semibold'>{invoice.ref}</p>
                  <p className='text-muted-foreground text-xs'>
                    Date {formatInvoiceDate(invoice.date)} · Echeance{' '}
                    {formatInvoiceDate(invoice.date_lim_reglement)}
                  </p>
                </div>
                <InvoiceBadge invoice={invoice} />
              </div>
              <div className='mt-3 grid grid-cols-2 gap-2 text-sm'>
                <div className='rounded-md bg-muted/50 p-2'>
                  <p className='text-muted-foreground text-xs'>Total TTC</p>
                  <PriceDisplay amount={Number(invoice.total_ttc)} className='font-medium' />
                </div>
                <div className='rounded-md bg-muted/50 p-2'>
                  <p className='text-muted-foreground text-xs'>Restant du</p>
                  <PriceDisplay amount={Number(invoice.remaintopay)} className='font-medium' />
                </div>
              </div>
              <div className='mt-3 flex justify-end'>
                <PdfButton invoice={invoice} />
              </div>
            </div>
          );
        })}
      </div>
      <div className='hidden overflow-x-auto rounded-lg border md:block'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-muted-foreground text-sm'>
          Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
        </p>
        <div className='grid grid-cols-2 gap-2 sm:flex'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Precedent
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
