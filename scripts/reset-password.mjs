import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const [, , emailArg, passwordArg] = process.argv;
const email = emailArg?.trim().toLowerCase();
const password = passwordArg;

if (!email || !password) {
  console.error('Usage: node scripts/reset-password.mjs <email> <new-password>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('Le mot de passe doit contenir au moins 8 caracteres.');
  process.exit(1);
}

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true }
  });

  if (!user) {
    console.error(`Aucun utilisateur trouve pour ${email}.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(password, 12),
      isActive: true
    }
  });

  console.log(`Mot de passe reinitialise pour ${user.email}.`);
} finally {
  await prisma.$disconnect();
}
