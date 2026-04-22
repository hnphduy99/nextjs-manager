import { db } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as NextAuthOptions["adapter"],

  session: {
    strategy: "jwt", // Use JWT so Credentials provider works with PrismaAdapter
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error"
  },

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            isActive: true,
            deletedAt: true
          }
        });

        if (!user || !user.passwordHash) return null;
        if (!user.isActive || user.deletedAt) return null;

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      // Attach roles to token on every refresh
      if (token.id) {
        const userWithRoles = await db.user.findUnique({
          where: { id: token.id as string },
          select: {
            roles: {
              select: {
                role: {
                  select: {
                    name: true,
                    permissions: {
                      select: {
                        permission: { select: { action: true, subject: true } }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        token.roles = userWithRoles?.roles.map((ur) => ur.role.name) ?? [];
        token.permissions =
          userWithRoles?.roles.flatMap((ur) =>
            ur.role.permissions.map((rp) => `${rp.permission.action}:${rp.permission.subject}`)
          ) ?? [];
      }

      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
        session.user.permissions = token.permissions as string[];
      }
      return session;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
