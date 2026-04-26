import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const apiUrl = process.env.NESTJS_API_URL || 'http://localhost:4000';

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        identifier: { label: 'Email ou Nickname', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.identifier || !credentials?.password) {
          return null;
        }

        try {
          const response = await fetch(`${apiUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: credentials.identifier,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          
          return {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            nickname: data.user.profile?.nickname || '',
            fullName: data.user.profile?.fullName || '',
            accessToken: data.accessToken,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.nickname = user.nickname;
        token.fullName = user.fullName;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          role: token.role as string,
          nickname: token.nickname as string,
          fullName: token.fullName as string,
        };
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 12 * 60 * 60,
  },
  trustHost: true,
};
