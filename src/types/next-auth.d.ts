import type { DefaultSession } from 'next-auth';

type PortalRole = 'CLIENT' | 'ADMIN';

declare module 'next-auth' {
  interface User {
    thirdpartyId: number;
    role: PortalRole;
    dolibarrApiKey?: never;
  }

  interface Session {
    user: {
      id: string;
      thirdpartyId: number;
      role: PortalRole;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    thirdpartyId: number;
    role: PortalRole;
  }
}
