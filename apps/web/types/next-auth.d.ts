import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      nickname: string;
      fullName: string;
    } & DefaultSession['user'];
    accessToken: string;
  }

  interface User {
    id: string;
    email: string;
    role: string;
    nickname: string;
    fullName: string;
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    nickname?: string;
    fullName?: string;
    accessToken?: string;
  }
}
