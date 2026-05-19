import { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

const credentialSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function narrowUserRoleTokenCandidate(
  candidate: unknown,
): UserRole | undefined {
  return candidate === UserRole.ADMIN || candidate === UserRole.CASHIER
    ? candidate
    : undefined;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  // secret: process.env.AUTH_SECRET, // Automatically picked up by Auth.js v5
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 10,
  },
  pages: {
    signIn: "/",
  },
  providers: [
    Credentials({
      name: "POS Staff",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        const parsedCredentials = credentialSchema.safeParse(rawCredentials);
        if (!parsedCredentials.success) {
          return null;
        }

        const [{ prisma }, bcryptModule] = await Promise.all([
          import("@/lib/prisma"),
          import("bcryptjs"),
        ]);

        const normalizedUsername = parsedCredentials.data.username.trim();
        const storedUser = await prisma.user.findUnique({
          where: { username: normalizedUsername },
        });

        if (!storedUser || storedUser.isActive !== true) {
          return null;
        }

        const passwordMatches = bcryptModule.compareSync(
          parsedCredentials.data.password,
          storedUser.password,
        );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: storedUser.id,
          name: storedUser.name,
          email: storedUser.email,
          role: storedUser.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        const subjectIdentifier = token.sub;
        if (typeof subjectIdentifier === "string" && subjectIdentifier.length > 0) {
          session.user.id = subjectIdentifier;
        }
        const narrowedRoleCapturedDescriptorFinalize = narrowUserRoleTokenCandidate(
          token.role,
        );
        if (typeof narrowedRoleCapturedDescriptorFinalize !== "undefined") {
          session.user.role = narrowedRoleCapturedDescriptorFinalize;
        }
      }
      return session;
    },
  },
});
