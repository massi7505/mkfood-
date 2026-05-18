import { findPortalUserThirdpartyId } from '@/lib/dolibarr/thirdparties';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

const registerSchema = z
  .object({
    name: z.string().trim().min(2),
    companyName: z.string().trim().min(2),
    siret: z
      .string()
      .trim()
      .regex(/^\d{14}$/),
    address: z.string().trim().min(5),
    phone: z.string().trim().min(8),
    mobile: z.string().trim().optional(),
    email: z.string().trim().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    clientCode: z.string().trim().optional()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword']
  });

export async function POST(request: NextRequest) {
  const body = (await request.json()) as unknown;
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Payload invalide', code: 'VALIDATION_ERROR', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json(
      { error: 'Cet email est deja utilise', code: 'EMAIL_ALREADY_EXISTS' },
      { status: 409 }
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  const thirdpartyId =
    (await findPortalUserThirdpartyId({
      siret: parsed.data.siret,
      clientCode: parsed.data.clientCode,
      email,
      companyName: parsed.data.companyName
    }).catch(() => null)) ?? 0;

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.name,
      companyName: parsed.data.companyName,
      siret: parsed.data.siret,
      address: parsed.data.address,
      phone: parsed.data.phone,
      mobile: parsed.data.mobile || null,
      thirdpartyId,
      role: 'CLIENT',
      isActive: true
    }
  });

  return NextResponse.json({ success: true, linked: thirdpartyId > 0 }, { status: 201 });
}
