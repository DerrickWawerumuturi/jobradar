import NextAuth from "next-auth";
import Google from "next-auth/providers/google"


export const {handlers,  auth } = NextAuth({
    providers: [Google],
    callbacks: {
        // Without a database adapter, NextAuth mints a RANDOM id per sign-in —
        // every login would become a different backend user. Pin the token's
        // subject to Google's stable account id instead; it's only present on
        // the initial sign-in and persists in the JWT afterwards.
        jwt({token, account, profile}) {
            const stable = account?.providerAccountId ?? profile?.sub
            if (stable) token.sub = stable
            return token
        },
        session({ session, token}) {
            session.user.id = token.sub!
            return session;
        }
    }
})
