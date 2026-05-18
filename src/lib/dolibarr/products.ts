import 'server-only';

import { DolibarrApiError, dolibarrClient, getDolibarrAuthHeaders } from './client';
import { rethrowDolibarrError } from './rethrow';
import type {
  DolibarrProduct,
  DolibarrSellingPrice,
  ProductFilters,
  ProductMutationInput
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractProductId(payload: unknown): string {
  if (typeof payload === 'number') return String(payload);
  if (typeof payload === 'string' && payload.trim().length > 0) return payload;

  if (isRecord(payload)) {
    const id = payload.id ?? payload.rowid;
    if (typeof id === 'number') return String(id);
    if (typeof id === 'string' && id.trim().length > 0) return id;
  }

  throw new DolibarrApiError(
    'Identifiant de produit introuvable apres creation',
    502,
    'DOLIBARR_PRODUCT_ID_MISSING',
    payload
  );
}

function toDolibarrProductPayload(data: ProductMutationInput) {
  return {
    ref: data.ref,
    label: data.label,
    description: data.description ?? '',
    price: data.priceHt,
    price_ht: data.priceHt,
    price_base_type: 'HT',
    tva_tx: data.tvaTx,
    status: 1,
    status_buy: 1
  };
}

/**
 * Recupere les produits Dolibarr avec filtres optionnels.
 * @example
 * const products = await getProducts({ search: 'cable', limit: 20 })
 */
export async function getProducts(
  options: ProductFilters = {},
  apiKey?: string
): Promise<DolibarrProduct[]> {
  try {
    const response = await dolibarrClient.get<DolibarrProduct[]>('/products', {
      headers: getDolibarrAuthHeaders(apiKey),
      params: {
        category: options.category,
        search: options.search,
        limit: options.limit
      }
    });
    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Recupere un produit Dolibarr par identifiant.
 * @example
 * const product = await getProductById('42')
 */
export async function getProductById(id: string, apiKey?: string): Promise<DolibarrProduct> {
  try {
    const response = await dolibarrClient.get<DolibarrProduct>(`/products/${id}`, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function createProduct(
  data: ProductMutationInput,
  apiKey?: string
): Promise<DolibarrProduct> {
  try {
    const response = await dolibarrClient.post<unknown>('/products', toDolibarrProductPayload(data), {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return getProductById(extractProductId(response.data), apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function updateProduct(
  id: string,
  data: ProductMutationInput,
  apiKey?: string
): Promise<DolibarrProduct> {
  try {
    await dolibarrClient.put(`/products/${id}`, toDolibarrProductPayload(data), {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return getProductById(id, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

interface DolibarrDocument {
  level1name?: string;
  relativename?: string;
  name?: string;
  filename?: string;
  fullname?: string;
  'content-type'?: string;
  type?: string;
  mimetype?: string;
}

interface DolibarrDocumentDownload {
  filename: string;
  'content-type': string;
  content: string;
}

export interface ProductImageResult {
  buffer: Buffer;
  contentType: string;
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  avif: 'image/avif',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp'
};

function getDocumentName(document: DolibarrDocument): string {
  return document.filename ?? document.name ?? document.relativename ?? document.fullname ?? '';
}

function getDocumentContentType(document: DolibarrDocument): string | undefined {
  return document['content-type'] ?? document.mimetype ?? document.type;
}

function getContentTypeFromFilename(filename: string): string | undefined {
  const extension = filename.split('.').pop()?.toLowerCase();
  return extension ? IMAGE_CONTENT_TYPES[extension] : undefined;
}

function isImageDocument(document: DolibarrDocument): boolean {
  const contentType = getDocumentContentType(document);

  if (contentType?.startsWith('image/')) return true;

  return Boolean(getContentTypeFromFilename(getDocumentName(document)));
}

function getOriginalFilePath(document: DolibarrDocument): string | null {
  if (document.fullname) return document.fullname;

  if (document.level1name && document.relativename) {
    const prefix = `${document.level1name}/`;
    return document.relativename.startsWith(prefix)
      ? document.relativename
      : `${document.level1name}/${document.relativename}`;
  }

  return document.relativename ?? document.filename ?? document.name ?? null;
}

interface ProductDocumentCandidate {
  document: DolibarrDocument;
  modulepart: string;
}

async function listProductDocuments(
  id: string,
  apiKey?: string
): Promise<ProductDocumentCandidate[]> {
  const candidates: Array<{ modulepart: string; id: string }> = [
    { modulepart: 'product', id },
    { modulepart: 'produit', id }
  ];

  try {
    const product = await getProductById(id, apiKey);
    if (product.ref && product.ref !== id) {
      candidates.push(
        { modulepart: 'product', id: product.ref },
        { modulepart: 'produit', id: product.ref }
      );
    }
  } catch {
    // Image lookup should still work when the product detail endpoint is unavailable.
  }

  for (const params of candidates) {
    const listResponse = await dolibarrClient.get<DolibarrDocument[]>('/documents', {
      headers: getDolibarrAuthHeaders(apiKey),
      params
    });
    const documents = listResponse.data ?? [];

    if (documents.length > 0) {
      return documents.map((document) => ({ document, modulepart: params.modulepart }));
    }
  }

  return [];
}

function decodeBase64Content(content: string): Buffer {
  const base64 = content.includes(',') ? content.split(',').pop() : content;
  return Buffer.from((base64 ?? '').replace(/\s/g, ''), 'base64');
}

/**
 * Telecharge l'image principale d'un produit Dolibarr.
 * Liste d'abord les documents puis decode le base64 du premier fichier image.
 * @example
 * const image = await getProductImage('42')
 */
export async function getProductImage(
  id: string,
  apiKey?: string
): Promise<ProductImageResult | null> {
  try {
    const documents = await listProductDocuments(id, apiKey);
    const imageCandidate = documents.find(({ document }) => isImageDocument(document));

    if (!imageCandidate) return null;

    const { document: imageDoc } = imageCandidate;
    const originalFile = getOriginalFilePath(imageDoc);
    if (!originalFile) return null;

    const moduleparts = Array.from(new Set([imageCandidate.modulepart, 'product', 'produit']));
    let download: DolibarrDocumentDownload | null = null;

    for (const modulepart of moduleparts) {
      try {
        const downloadResponse = await dolibarrClient.get<DolibarrDocumentDownload>(
          '/documents/download',
          {
            headers: getDolibarrAuthHeaders(apiKey),
            params: {
              modulepart,
              original_file: originalFile
            }
          }
        );
        download = downloadResponse.data;
        break;
      } catch {
        // Dolibarr instances differ between product/produit module parts.
      }
    }

    if (!download?.content) return null;

    const contentType =
      download['content-type'] ||
      getDocumentContentType(imageDoc) ||
      getContentTypeFromFilename(download.filename || getDocumentName(imageDoc)) ||
      'image/jpeg';
    const buffer = decodeBase64Content(download.content);

    if (buffer.length === 0) return null;

    return {
      buffer,
      contentType
    };
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Recupere le prix personnalise d'un produit pour un client Dolibarr.
 * @example
 * const price = await getProductPriceForClient('42', 128)
 */
export async function getProductPriceForClient(
  productId: string,
  thirdpartyId: number,
  apiKey?: string
): Promise<DolibarrSellingPrice> {
  try {
    const response = await dolibarrClient.get<DolibarrSellingPrice>(
      `/products/${productId}/selling_price`,
      {
        headers: getDolibarrAuthHeaders(apiKey),
        params: {
          thirdparty_id: thirdpartyId
        }
      }
    );
    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}
