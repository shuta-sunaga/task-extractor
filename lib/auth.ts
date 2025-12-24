import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyPassword } from '@/lib/password'
import { getUserByEmail, updateLastLogin, getCompanyById } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'メールアドレス', type: 'email' },
        password: { label: 'パスワード', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await getUserByEmail(credentials.email)
        if (!user || !user.is_active) {
          return null
        }

        const isValid = await verifyPassword(credentials.password, user.password_hash)
        if (!isValid) {
          return null
        }

        await updateLastLogin(user.id)

        // 企業のslugを取得
        let companySlug: string | null = null
        if (user.company_id) {
          const company = await getCompanyById(user.company_id)
          companySlug = company?.slug || null
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          companyId: user.company_id,
          companySlug,
          userType: user.user_type,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.companyId = user.companyId
        token.companySlug = user.companySlug
        token.userType = user.userType
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.companyId = token.companyId
        session.user.companySlug = token.companySlug
        session.user.userType = token.userType
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24時間
  },
  secret: process.env.NEXTAUTH_SECRET,
}
