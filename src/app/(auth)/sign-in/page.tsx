'use client'

import React from 'react'
import {Button} from "@/components/ui/button";
import {signIn} from "next-auth/react";

const Page = () => {
    return (
        <div className={"flex flex-col items-center justify-center min-h-screen gap-4"}>
            <h2 className={"text-lg"}>Sign in</h2>
            <Button
                variant="secondary"
                size="lg"
                onClick={
                    () => signIn("google", {
                        redirectTo: "/analysis"
                    })}
            >
                Sign in with Google
            </Button>
        </div>
    )
}
export default Page
