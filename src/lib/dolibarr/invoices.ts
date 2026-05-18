import 'server-only';

import { dolibarrClient, getDolibarrAuthHeaders } from './client';
import { rethrowDolibarrError } from './rethrow';
import type { DolibarrInvoice } from './types';

function invoiceBelongsToThirdparty(invoice: DolibarrInvoice, thirdpartyId: number) {
  return Number(invoice.socid ?? invoice.fk_soc) === thirdpartyId;
}

function compareInvoicesNewestFirst(a: DolibarrInvoice, b: DolibarrInvoice): number {
  const dateDifference = Number(b.date ?? 0) - Number(a.date ?? 0);
  if (dateDifference !== 0) return dateDifference;

  return Number(b.id ?? 0) - Number(a.id ?? 0);
}

export async function getAllInvoices(
  options: { limit?: number } = {},
  apiKey?: string
): Promise<DolibarrInvoice[]> {
  try {
    const response = await dolibarrClient.get<DolibarrInvoice[]>('/invoices', {
      headers: getDolibarrAuthHeaders(apiKey),
      params: {
        limit: options.limit
      }
    });
    return response.data.toSorted(compareInvoicesNewestFirst);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Liste les factures d'un client Dolibarr.
 * @example
 * const invoices = await getInvoicesByClient(128)
 */
export async function getInvoicesByClient(
  thirdpartyId: number,
  apiKey?: string
): Promise<DolibarrInvoice[]> {
  try {
    const response = await dolibarrClient.get<DolibarrInvoice[]>('/invoices', {
      headers: getDolibarrAuthHeaders(apiKey),
      params: {
        thirdparty_id: thirdpartyId
      }
    });
    return response.data.filter((invoice) => invoiceBelongsToThirdparty(invoice, thirdpartyId));
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Liste les factures validees et non payees d'un client.
 * @example
 * const unpaid = await getUnpaidInvoices(128)
 */
export async function getUnpaidInvoices(
  thirdpartyId: number,
  apiKey?: string
): Promise<DolibarrInvoice[]> {
  try {
    const response = await dolibarrClient.get<DolibarrInvoice[]>('/invoices', {
      headers: getDolibarrAuthHeaders(apiKey),
      params: {
        thirdparty_id: thirdpartyId,
        status: 1
      }
    });
    return response.data.filter((invoice) => invoiceBelongsToThirdparty(invoice, thirdpartyId));
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Recupere une facture par identifiant.
 * @example
 * const invoice = await getInvoiceById('55')
 */
export async function getInvoiceById(invoiceId: string, apiKey?: string): Promise<DolibarrInvoice> {
  try {
    const response = await dolibarrClient.get<DolibarrInvoice>(`/invoices/${invoiceId}`, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Cree une facture Dolibarr a partir d'une commande validee.
 * Optionnellement valide la facture pour la sortir du statut brouillon.
 * @example
 * const invoice = await createInvoiceFromOrder('3', { validate: true })
 */
export async function createInvoiceFromOrder(
  orderId: string,
  options: { validate?: boolean } = {},
  apiKey?: string
): Promise<DolibarrInvoice> {
  try {
    const response = await dolibarrClient.post<DolibarrInvoice>(
      `/invoices/createfromorder/${orderId}`,
      undefined,
      { headers: getDolibarrAuthHeaders(apiKey) }
    );
    const invoice = response.data;

    if (options.validate && invoice.id) {
      await dolibarrClient.post(
        `/invoices/${invoice.id}/validate`,
        {},
        { headers: getDolibarrAuthHeaders(apiKey) }
      );
    }

    return invoice;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

interface DolibarrDocumentResult {
  filename: string;
  'content-type': string;
  content?: string;
  encoding?: string;
  fullname?: string;
  relativename?: string;
}

function decodeBase64Document(content: string): Buffer {
  const base64 = content.includes(',') ? content.split(',').pop() : content;
  return Buffer.from((base64 ?? '').replace(/\s/g, ''), 'base64');
}

async function downloadInvoiceDocument(
  originalFile: string,
  apiKey?: string
): Promise<Buffer | null> {
  const response = await dolibarrClient.get<DolibarrDocumentResult>('/documents/download', {
    headers: getDolibarrAuthHeaders(apiKey),
    params: {
      modulepart: 'facture',
      original_file: originalFile
    }
  });

  if (!response.data.content) return null;

  const pdf = decodeBase64Document(response.data.content);
  return pdf.length > 0 ? pdf : null;
}

/**
 * Telecharge ou genere le PDF d'une facture Dolibarr.
 * Utilise builddoc qui genere le PDF si absent puis renvoie le contenu encode base64.
 * @example
 * const pdf = await getInvoicePDF('55')
 */
export async function getInvoicePDF(invoiceId: string, apiKey?: string): Promise<Buffer> {
  try {
    const invoiceResponse = await dolibarrClient.get<DolibarrInvoice>(`/invoices/${invoiceId}`, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    const ref = invoiceResponse.data.ref;

    if (!ref) {
      throw new Error('Reference facture introuvable');
    }

    const buildResponse = await dolibarrClient.put<DolibarrDocumentResult>(
      '/documents/builddoc',
      {
        modulepart: 'facture',
        original_file: `${ref}/${ref}.pdf`
      },
      { headers: getDolibarrAuthHeaders(apiKey) }
    );

    if (buildResponse.data.content) {
      const builtPdf = decodeBase64Document(buildResponse.data.content);
      if (builtPdf.length > 0) return builtPdf;
    }

    const originalFiles = Array.from(
      new Set(
        [
          buildResponse.data.fullname,
          buildResponse.data.relativename,
          buildResponse.data.filename,
          `${ref}/${ref}.pdf`
        ].filter((value): value is string => Boolean(value))
      )
    );

    for (const originalFile of originalFiles) {
      const pdf = await downloadInvoiceDocument(originalFile, apiKey).catch(() => null);
      if (pdf) return pdf;
    }

    throw new Error('PDF facture vide ou introuvable');
  } catch (error) {
    rethrowDolibarrError(error);
  }
}
