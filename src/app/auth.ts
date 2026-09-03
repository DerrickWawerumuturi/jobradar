import NextAuth from "next-auth";
import Google from "next-auth/providers/google"


export const {handlers,  auth } = NextAuth({
    providers: [Google],
    callbacks: {
        session({ session, token}) {
            session.user.id = token.sub!
            return session;
        }
    }
})
