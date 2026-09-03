'use client'

import React from 'react'
import Link from "next/link";
import {signIn} from "next-auth/react";
import {Button} from "@/components/ui/button";
import Annotation from "@/components/Annotation";

const GoogleIcon = () => (
    <svg viewBox={"0 0 24 24"} className={"size-4"} aria-hidden>
        <path fill={"#EA4335"} d={"M12 5.04c1.68 0 3.18.58 4.36 1.71l3.24-3.24C17.62 1.67 15.02.6 12 .6 7.32.6 3.28 3.28 1.32 7.2l3.78 2.93C6.03 7.24 8.78 5.04 12 5.04z"} />
        <path fill={"#4285F4"} d={"M23.4 12.27c0-.94-.08-1.62-.26-2.33H12v4.42h6.54c-.13 1.09-.84 2.74-2.42 3.85l3.69 2.86c2.21-2.04 3.59-5.04 3.59-8.8z"} />
        <path fill={"#FBBC05"} d={"M5.1 14.27a7.18 7.18 0 0 1 0-4.54L1.32 6.8a11.94 11.94 0 0 0 0 10.8l3.78-2.93z"} />
        <path fill={"#34A853"} d={"M12 23.4c3.02 0 5.56-1 7.41-2.72l-3.69-2.86c-.99.69-2.32 1.17-3.72 1.17-3.22 0-5.97-2.2-6.9-5.12L1.32 16.8C3.28 20.72 7.32 23.4 12 23.4z"} />
    </svg>
)

const Page = () => {
    return (
        <div className={"grid min-h-[calc(100dvh-96px)] lg:grid-cols-2"}>
            {/* The pitch, in house colors */}
            <aside className={"chart-band chart-grid-paper relative hidden flex-col justify-between overflow-hidden border-0 p-10 lg:flex chart-panel-green"}>
                <svg viewBox={"0 0 200 200"} aria-hidden className={"absolute -bottom-16 -right-16 size-80 text-white/10"}>
                    <circle cx={"100"} cy={"100"} r={"95"} fill={"none"} stroke={"currentColor"} strokeWidth={"1.5"} />
                    <circle cx={"100"} cy={"100"} r={"65"} fill={"none"} stroke={"currentColor"} strokeWidth={"1"} />
                    <circle cx={"100"} cy={"100"} r={"35"} fill={"none"} stroke={"currentColor"} strokeWidth={"1"} />
                    <path d={"M100 100 L100 5 A95 95 0 0 1 172 38 Z"} fill={"currentColor"} opacity={"0.5"} />
                </svg>

                <p className={"font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground"}>
                    Job-hunt intelligence
                </p>

                <div className={"flex flex-col gap-4"}>
                    <h2 className={"font-heading text-3xl font-bold uppercase leading-[1.05] tracking-tight"}>
                        Your career,<br/>on the record.
                    </h2>
                    <p className={"max-w-sm text-sm text-muted-foreground"}>
                        Sign in and your profile and analyses stop living in one
                        browser — they follow you to any device, any time.
                    </p>
                </div>

                <Annotation hideArrow className={"self-start"}>
                    one click, and you&apos;re on the radar
                </Annotation>
            </aside>

            {/* The one decision */}
            <main className={"flex flex-col items-center justify-center px-5 py-16"}>
                <div className={"flex w-full max-w-sm flex-col gap-6"}>
                    <div className={"flex flex-col gap-2"}>
                        <h1 className={"font-heading text-2xl font-bold uppercase tracking-tight"}>
                            Welcome back<span className={"text-primary"}>.</span>
                        </h1>
                        <p className={"text-sm text-muted-foreground"}>
                            Sign in to keep your profile with you.
                        </p>
                    </div>

                    <Button
                        variant={"outline"}
                        size={"lg"}
                        className={"w-full gap-3"}
                        onClick={() => signIn("google", {redirectTo: "/"})}
                    >
                        <GoogleIcon />
                        Continue with Google
                    </Button>

                    <p className={"font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"}>
                        More sign-in options coming soon
                    </p>

                    <p className={"border-t border-border pt-5 text-sm text-muted-foreground"}>
                        First time here?{" "}
                        <Link href={"/#upload"} className={"text-foreground underline underline-offset-4 hover:text-primary"}>
                            Try it with your CV first
                        </Link>
                        {" "}— no account needed.
                    </p>
                </div>
            </main>
        </div>
    )
}
export default Page
