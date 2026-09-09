'use client'

import React from 'react'
import {ArrowRight, CheckIcon} from "lucide-react";
import {useCv} from "@/lib/cv-store";
import CVReviewForm from "@/components/Form";
import Annotation from "@/components/Annotation";
import {cn} from "@/lib/utils";

const STEPS = [
    {number: "01", label: "Upload your CV", state: "done"},
    {number: "02", label: "Review your profile", state: "current"},
    {number: "03", label: "Your personal dashboard", state: "next"},
] as const;

const Page = () => {
    const {cv} = useCv()

    return (
        <div className={"min-h-screen"}>
            {cv && (
                <div className={"relative mx-auto flex w-full max-w-2xl flex-col gap-10 px-5 py-12"}>
                    <header className={"flex flex-col gap-6"}>
                        <p className={"font-mono text-[11px] uppercase tracking-[0.2em] text-primary"}>
                            Your profile
                        </p>
                        <h1 className={"font-heading text-3xl font-bold uppercase leading-[1.05] tracking-tight sm:text-4xl"}>
                            Let&apos;s get you right.
                        </h1>
                        <p className={" text-muted-foreground text-sm"}>
                            This is what we understood from your CV. It becomes the profile we
                            build your dashboard around → <span className={"text-foreground"}>the roles you fit</span>,{" "}
                            <span className={"text-foreground"}>the skills that carry weight</span>, and{" "}
                            <span className={"text-foreground"}>the gaps worth closing</span>. Skim it, fix anything we
                            misread, and you&apos;re on your way.
                            <span className={"text-primary pl-0.5"}>You&apos;re the expert on you.</span>
                        </p>

                        <ol className={"flex flex-wrap items-center gap-3"}>
                            {STEPS.map((step, i) => (
                                <li key={step.number} className={"flex items-center gap-3"}>
                                    <span
                                        className={cn(
                                            "flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em]",
                                            step.state === "current"
                                                ? "border-primary/50 text-foreground"
                                                : "border-border text-muted-foreground"
                                        )}
                                    >
                                        {step.state === "done"
                                            ? <CheckIcon className={"size-3 text-primary"} />
                                            : <span className={cn("font-medium", step.state === "current" && "text-primary")}>{step.number}</span>}
                                        {step.label}
                                        {step.state === "next" && (
                                            <span className={"text-primary"}>(coming right up)</span>
                                        )}
                                    </span>
                                    {i < STEPS.length - 1 && (
                                        <ArrowRight aria-hidden className={"size-3.5 text-muted-foreground"} />
                                    )}
                                </li>
                            ))}
                        </ol>
                    </header>

                    <div className={"relative"}>
                        <Annotation className={"absolute -left-48 top-14 w-44 flex-col sm:hidden xl:flex"}>
                            go ahead → tap any section open
                        </Annotation>
                        <CVReviewForm />
                    </div>
                </div>
            )}
        </div>
    )
}
export default Page
