import 'server-only';

import { DolibarrApiError, dolibarrClient, getDolibarrAuthHeaders } from './client';
import { rethrowDolibarrError } from './rethrow';
import type { DolibarrOrder, OrderLineInput } from './types';

interface OrderListOptions {
  limit?: number;
  offset?: number;
  page?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractCreatedOrderId(payload: unknown): string {
  if (typeof payload === 'number') return String(payload);
  if (typeof payload === 'string' && payload.trim().length > 0) return payload;

  if (isRecord(payload)) {
    const id = payload.id ?? payload.rowid;
    if (typeof id === 'number') return String(id);
    if (typeof id === 'string' && id.trim().length > 0) return id;
  }

  throw new DolibarrApiError(
    'Identifiant de commande introuvable apres creation',
    502,
    'DOLIBARR_ORDER_ID_MISSING',
    payload
  );
}

function compareOrdersNewestFirst(a: DolibarrOrder, b: DolibarrOrder): number {
  const dateDifference = Number(b.date_commande ?? 0) - Number(a.date_commande ?? 0);
  if (dateDifference !== 0) return dateDifference;

  return Number(b.id ?? 0) - Number(a.id ?? 0);
}

function orderBelongsToThirdparty(order: DolibarrOrder, thirdpartyId: number) {
  return Number(order.socid ?? order.fk_soc) === thirdpartyId;
}

/**
 * Liste les commandes d'un client Dolibarr.
 * @example
 * const orders = await getOrdersByClient(128, { limit: 10 })
 */
export async function getOrdersByClient(
  thirdpartyId: number,
  options: OrderListOptions = {},
  apiKey?: string
): Promise<DolibarrOrder[]> {
  try {
    const response = await dolibarrClient.get<DolibarrOrder[]>('/orders', {
      headers: getDolibarrAuthHeaders(apiKey),
      params: {
        thirdparty_id: thirdpartyId,
        sortfield: 'date_commande',
        sortorder: 'DESC',
        limit: options.limit,
        offset: options.offset
      }
    });
    return response.data
      .filter((order) => orderBelongsToThirdparty(order, thirdpartyId))
      .toSorted(compareOrdersNewestFirst);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Liste les commandes Dolibarr pour l'administration.
 * @example
 * const orders = await getAllOrders({ limit: 100 })
 */
export async function getAllOrders(
  options: OrderListOptions = {},
  apiKey?: string
): Promise<DolibarrOrder[]> {
  try {
    const response = await dolibarrClient.get<DolibarrOrder[]>('/orders', {
      headers: getDolibarrAuthHeaders(apiKey),
      params: {
        sortfield: 'date_commande',
        sortorder: 'DESC',
        limit: options.limit,
        page: options.page
      }
    });
    return response.data.toSorted(compareOrdersNewestFirst);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Recupere une commande Dolibarr par identifiant.
 * @example
 * const order = await getOrderById('104')
 */
export async function getOrderById(orderId: string, apiKey?: string): Promise<DolibarrOrder> {
  try {
    const response = await dolibarrClient.get<DolibarrOrder>(`/orders/${orderId}`, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Cree une commande Dolibarr pour un client.
 * @example
 * const order = await createOrder(128, [{ productId: '42', qty: 2, priceHt: 12.5 }])
 */
export async function createOrder(
  thirdpartyId: number,
  lines: OrderLineInput[],
  apiKey?: string
): Promise<DolibarrOrder> {
  try {
    const response = await dolibarrClient.post<unknown>(
      '/orders',
      {
        socid: thirdpartyId,
        date: Math.floor(Date.now() / 1000),
        lines: lines.map((line) => ({
          fk_product: line.productId,
          qty: line.qty,
          subprice: line.priceHt
        }))
      },
      {
        headers: getDolibarrAuthHeaders(apiKey)
      }
    );

    const orderId = extractCreatedOrderId(response.data);
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Valide une commande Dolibarr.
 * @example
 * await validateOrder('104')
 */
export async function validateOrder(orderId: string, apiKey?: string): Promise<DolibarrOrder> {
  try {
    const response = await dolibarrClient.post<DolibarrOrder>(
      `/orders/${orderId}/validate`,
      undefined,
      {
        headers: getDolibarrAuthHeaders(apiKey)
      }
    );
    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function closeOrder(orderId: string, apiKey?: string): Promise<DolibarrOrder> {
  try {
    await dolibarrClient.post(`/orders/${orderId}/close`, undefined, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function setOrderToDraft(orderId: string, apiKey?: string): Promise<DolibarrOrder> {
  try {
    await dolibarrClient.post(`/orders/${orderId}/settodraft`, undefined, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function markOrderInvoiced(orderId: string, apiKey?: string): Promise<DolibarrOrder> {
  try {
    await dolibarrClient.post(`/orders/${orderId}/setinvoiced`, undefined, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function deleteOrder(orderId: string, apiKey?: string): Promise<void> {
  try {
    await dolibarrClient.delete(`/orders/${orderId}`, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function updateOrderLine(
  orderId: string,
  lineId: string,
  data: { productId?: string; qty: number; priceHt: number },
  apiKey?: string
): Promise<DolibarrOrder> {
  try {
    await dolibarrClient.put(
      `/orders/${orderId}/lines/${lineId}`,
      {
        fk_product: data.productId,
        qty: data.qty,
        subprice: data.priceHt
      },
      { headers: getDolibarrAuthHeaders(apiKey) }
    );
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function addOrderLine(
  orderId: string,
  data: { productId: string; qty: number; priceHt: number },
  apiKey?: string
): Promise<DolibarrOrder> {
  try {
    await dolibarrClient.post(
      `/orders/${orderId}/lines`,
      {
        fk_product: data.productId,
        qty: data.qty,
        subprice: data.priceHt
      },
      { headers: getDolibarrAuthHeaders(apiKey) }
    );
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

export async function deleteOrderLine(
  orderId: string,
  lineId: string,
  apiKey?: string
): Promise<DolibarrOrder> {
  try {
    await dolibarrClient.delete(`/orders/${orderId}/lines/${lineId}`, {
      headers: getDolibarrAuthHeaders(apiKey)
    });
    return getOrderById(orderId, apiKey);
  } catch (error) {
    rethrowDolibarrError(error);
  }
}
