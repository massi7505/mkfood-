import { prisma } from '@/lib/prisma';
import { findPortalUserThirdpartyId } from '@/lib/dolibarr/thirdparties';
import { compare } from 'bcryptjs';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const authConfig = {
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  providers: [
    Credentials({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse({
          email:
            typeof credentials?.email === 'string'
              ? credentials.email.trim().toLowerCase()
              : credentials?.email,
          password: credentials?.password
        });
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            passwordHash: true,
            siret: true,
            thirdpartyId: true,
            role: true,
            isActive: true
          }
        });

        if (!user?.isActive) return null;

        const isValidPassword = await compare(parsed.data.password, user.passwordHash);
        if (!isValidPassword) return null;

        let thirdpartyId = user.thirdpartyId;
        if (thirdpartyId <= 0) {
          const linkedThirdpartyId = await findPortalUserThirdpartyId({
            siret: user.siret,
            email: user.email,
            companyName: user.companyName
          }).catch(() => null);

          if (linkedThirdpartyId) {
            thirdpartyId = linkedThirdpartyId;
            await prisma.user.update({
              where: { id: user.id },
              data: { thirdpartyId }
            });
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          thirdpartyId,
          role: user.role
        };
      }
    })
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? '';
        token.email = user.email ?? token.email;
        token.name = user.name ?? token.name;
        token.thirdpartyId = user.thirdpartyId;
        token.role = user.role;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? '';
        session.user.email = token.email ?? '';
        session.user.name = token.name ?? '';
        session.user.thirdpartyId = token.thirdpartyId ?? 0;
        session.user.role = token.role ?? 'CLIENT';
      }

      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
