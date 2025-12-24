import 'next-auth'
import { UserType } from '@/lib/db'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    companyId: number | null
    companySlug: string | null
    userType: UserType
  }

  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    companyId: number | null
    companySlug: string | null
    userType: UserType
  }
}
