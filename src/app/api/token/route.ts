import {auth} from "@/app/auth";
import {SignJWT} from "jose";

const secret = new TextEncoder().encode(process.env.API_JWT_SECRET)

export async function GET() {
    const session  = await auth()
    if (!session?.user) {
        return Response.json({error : "unauthorized"}, {status: 401})
    }

    const token = await new SignJWT({email: session.user.email, name: session.user.name})
        .setProtectedHeader({alg: "HS256"})
        .setSubject(session.user.id!)
        .setIssuedAt()
        .sign(secret)

    return Response.json({token});
}