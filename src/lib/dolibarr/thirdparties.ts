import 'server-only';

import { dolibarrClient, getDolibarrAuthHeaders } from './client';
import { rethrowDolibarrError } from './rethrow';

interface DolibarrThirdparty {
  id?: string | number;
  rowid?: string | number;
  name?: string;
  name_alias?: string;
  code_client?: string;
  idprof1?: string;
  email?: string;
}

export interface DolibarrThirdpartyBillingPayload {
  name: string;
  contactName: string;
  email: string;
  companyName?: string | null;
  siret?: string | null;
  address?: string | null;
  phone?: string | null;
  mobile?: string | null;
  billingAddress?: string | null;
  billingEmail?: string | null;
  shippingAddress?: string | null;
  vatNumber?: string | null;
}

function emptyToUndefined(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function escapeSqlFilterValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function getThirdpartyId(thirdparty: DolibarrThirdparty): number | null {
  const id = Number(thirdparty.id ?? thirdparty.rowid);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function findThirdpartyByExactField(
  field: 'code_client' | 'idprof1' | 'email',
  value: string,
  apiKey?: string
): Promise<DolibarrThirdparty | null> {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return null;

  const response = await dolibarrClient.get<DolibarrThirdparty[]>('/thirdparties', {
    headers: getDolibarrAuthHeaders(apiKey),
    params: {
      limit: 5,
      sqlfilters: `(t.${field}:=:'${escapeSqlFilterValue(value.trim())}')`
    }
  });

  const matches = response.data.filter(
    (thirdparty) => normalize(String(thirdparty[field] ?? '')) === normalizedValue
  );

  return matches.length === 1 ? matches[0] : null;
}

async function findThirdpartyBySearchTerm(
  term: string,
  matcher: (thirdparty: DolibarrThirdparty) => boolean,
  apiKey?: string
): Promise<DolibarrThirdparty | null> {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return null;

  const response = await dolibarrClient.get<DolibarrThirdparty[]>('/thirdparties', {
    headers: getDolibarrAuthHeaders(apiKey),
    params: {
      limit: 20,
      search_all: term.trim()
    }
  });

  const matches = response.data.filter(matcher);
  return matches.length === 1 ? matches[0] : null;
}

function buildThirdpartyPayload(values: DolibarrThirdpartyBillingPayload) {
  const billingAddress =
    emptyToUndefined(values.billingAddress) ?? emptyToUndefined(values.address);
  const billingEmail = emptyToUndefined(values.billingEmail) ?? values.email;
  const companyName = emptyToUndefined(values.companyName) ?? values.name;
  const shippingAddress = emptyToUndefined(values.shippingAddress);

  return {
    name: companyName,
    name_alias: values.contactName,
    address: billingAddress,
    email: billingEmail,
    phone: emptyToUndefined(values.phone),
    phone_mobile: emptyToUndefined(values.mobile),
    idprof1: emptyToUndefined(values.siret),
    tva_intra: emptyToUndefined(values.vatNumber),
    note_private: shippingAddress ? `Adresse de livraison:\n${shippingAddress}` : undefined
  };
}

/**
 * Retrouve automatiquement la fiche client Dolibarr d'un utilisateur portail.
 * La recherche est volontairement stricte pour eviter de rattacher un compte au mauvais tiers.
 * Priorite: code client, SIRET, puis email exact.
 * @example
 * const thirdpartyId = await findPortalUserThirdpartyId({ siret: '123...', email: 'a@b.fr' })
 */
export async function findPortalUserThirdpartyId(
  values: {
    siret?: string | null;
    clientCode?: string | null;
    email?: string | null;
    companyName?: string | null;
  },
  apiKey?: string
): Promise<number | null> {
  try {
    const normalizedClientCode = normalize(values.clientCode);
    const normalizedSiret = normalize(values.siret);
    const normalizedEmail = normalize(values.email);
    const normalizedCompanyName = normalize(values.companyName);

    const thirdparty =
      (await findThirdpartyByExactField('code_client', values.clientCode ?? '', apiKey)) ??
      (await findThirdpartyByExactField('idprof1', values.siret ?? '', apiKey)) ??
      (await findThirdpartyByExactField('email', values.email ?? '', apiKey)) ??
      (await findThirdpartyBySearchTerm(
        values.clientCode ?? '',
        (candidate) => normalize(candidate.code_client) === normalizedClientCode,
        apiKey
      )) ??
      (await findThirdpartyBySearchTerm(
        values.siret ?? '',
        (candidate) => normalize(candidate.idprof1) === normalizedSiret,
        apiKey
      )) ??
      (await findThirdpartyBySearchTerm(
        values.email ?? '',
        (candidate) => normalize(candidate.email) === normalizedEmail,
        apiKey
      )) ??
      (await findThirdpartyBySearchTerm(
        values.companyName ?? '',
        (candidate) =>
          normalize(candidate.name) === normalizedCompanyName ||
          normalize(candidate.name_alias) === normalizedCompanyName,
        apiKey
      ));

    return thirdparty ? getThirdpartyId(thirdparty) : null;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}

/**
 * Met a jour la fiche tiers Dolibarr utilisee pour les factures du portail.
 * @example
 * await updateThirdpartyBillingProfile(128, values, apiKey)
 */
export async function updateThirdpartyBillingProfile(
  thirdpartyId: number,
  values: DolibarrThirdpartyBillingPayload,
  apiKey?: string
) {
  try {
    const response = await dolibarrClient.put(
      `/thirdparties/${thirdpartyId}`,
      buildThirdpartyPayload(values),
      {
        headers: getDolibarrAuthHeaders(apiKey)
      }
    );

    return response.data;
  } catch (error) {
    rethrowDolibarrError(error);
  }
}
