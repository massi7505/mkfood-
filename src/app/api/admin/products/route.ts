import {
  createApiErrorResponse,
  logApiRoute,
  requireDolibarrApiKey,
  requirePortalSession
} from '@/lib/api/dolibarr-route';
import { createProduct, getProducts, updateProduct } from '@/lib/dolibarr/products';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const productMutationSchema = z.object({
  id: z.string().optional(),
  ref: z.string().trim().min(1, 'Reference obligatoire'),
  label: z.string().trim().min(1, 'Libelle obligatoire'),
  description: z.string().trim().optional(),
  priceHt: z.number().nonnegative(),
  tvaTx: z.number().min(0)
});

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const { searchParams } = request.nextUrl;
    const limit = searchParams.get('limit');
    const products = await getProducts(
      {
        search: searchParams.get('search') ?? undefined,
        category: searchParams.get('category') ?? undefined,
        limit: limit ? Number(limit) : 200
      },
      apiKey
    );

    return NextResponse.json({ products });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('GET', request.nextUrl.pathname, status, startedAt);
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let status = 201;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const body = productMutationSchema.omit({ id: true }).parse(await request.json());
    const product = await createProduct(body, apiKey);

    return NextResponse.json({ product }, { status });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('POST', request.nextUrl.pathname, status, startedAt);
  }
}

export async function PATCH(request: NextRequest) {
  const startedAt = Date.now();
  let status = 200;

  try {
    const session = await requirePortalSession();
    if (session.user.role !== 'ADMIN') {
      status = 403;
      return NextResponse.json({ error: 'Acces refuse', code: 'FORBIDDEN' }, { status });
    }

    const apiKey = process.env.DOLIBARR_API_KEY ?? (await requireDolibarrApiKey(session));
    const body = productMutationSchema.required({ id: true }).parse(await request.json());
    const product = await updateProduct(
      body.id,
      {
        ref: body.ref,
        label: body.label,
        description: body.description,
        priceHt: body.priceHt,
        tvaTx: body.tvaTx
      },
      apiKey
    );

    return NextResponse.json({ product });
  } catch (error) {
    const response = createApiErrorResponse(error);
    status = response.status;
    return response;
  } finally {
    logApiRoute('PATCH', request.nextUrl.pathname, status, startedAt);
  }
}
