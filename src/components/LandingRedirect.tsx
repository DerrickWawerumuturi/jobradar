'use client'

import {useEffect} from 'react'
import {useRouter} from "next/navigation";
import {useSession} from "next-auth/react";

/**
 * The landing page is the front door: signed-in visitors go straight to
 * their dashboard; newcomers stay to sign in and upload a CV.
 */
export default function LandingRedirect() {
    const router = useRouter();
    const {status} = useSession();

    useEffect(() => {
        if (status === "authenticated") router.replace("/dashboard");
    }, [status, router]);

    return null;
}
