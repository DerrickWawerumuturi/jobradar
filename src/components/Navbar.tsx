'use client'

import React from 'react'
import Link from "next/link";
import {MenuIcon} from "lucide-react";
import {usePathname} from "next/navigation";
import {signOut, useSession} from "next-auth/react";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {cn} from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {initials} from "@/lib/utils";

const Navbar = () => {
    const {data: session} = useSession();
    const {analysis} = useAnalysis();
    const {cv} = useCv();
    const pathname = usePathname();

    const productLinks = [
        ...(cv ? [{href: "/onboarding", label: "Profile"}] : []),
        ...(analysis ? [{href: "/analysis", label: "Analysis"}] : []),
    ];

    // Newcomers get somewhere to go too.
    const links = productLinks.length > 0
        ? productLinks
        : [{href: "/#about", label: "About"}, {href: "/#faq", label: "FAQ"}];

    return (
        <header className={"flex items-center justify-between gap-4  px-5 py-5 lg:px-8"}>
            <div className={"flex flex-col gap-1"}>
                <Link
                    href={"/"}
                    className={"font-heading text-2xl font-bold uppercase leading-none tracking-tight"}
                >
                    Jobradar<span className={"text-primary"}>.</span>
                </Link>
                <span className={"font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"}>
                    Market intelligence
                </span>
            </div>


            <div className={"flex items-center gap-5"}>
                {links.length > 0 && (
                    <nav className={"relative hidden items-center gap-5 sm:flex"}>
                        {links.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={cn(
                                    "font-mono text-xs uppercase tracking-[0.12em] transition-colors",
                                    pathname.startsWith(link.href)
                                        ? "text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {link.label}
                            </Link>
                        ))}

                        {pathname === "/" && productLinks.length === 2 && (
                            <div
                                aria-hidden
                                className={"pointer-events-none absolute left-1/2 top-full hidden -translate-x-1/2 select-none flex-col items-center pt-1 sm:flex"}
                            >
                                <svg viewBox={"0 0 80 34"} fill={"none"} className={"h-8 w-20 text-primary/80"}>
                                    <path d={"M40 32 C 37 21, 26 13, 12 8"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} />
                                    <path d={"M11 17 L 11 7 L 21 6"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} />
                                    <path d={"M40 32 C 43 21, 54 13, 68 8"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} />
                                    <path d={"M69 17 L 69 7 L 59 6"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} />
                                </svg>
                                <span className={"-rotate-2 whitespace-nowrap font-hand text-xl leading-none text-primary/90"}>
                                    a bigger picture of you
                                </span>
                            </div>
                        )}
                    </nav>
                )}

                {links.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger render={(props) => (
                            <button {...props} aria-label={"Menu"} className={"flex text-muted-foreground hover:text-foreground sm:hidden"}>
                                <MenuIcon className={"size-5"} />
                            </button>
                        )} />
                        <DropdownMenuContent align={"end"} className={"w-44"}>
                            {links.map((link) => (
                                <DropdownMenuItem
                                    key={link.href}
                                    render={(props) => (
                                        <Link {...props} href={link.href} className={cn(props.className, "cursor-pointer")}>
                                            {link.label}
                                        </Link>
                                    )}
                                />
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                {session?.user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger render={(props) => (
                                <button {...props} aria-label={"Account"}>
                                    <Avatar>
                                        <AvatarImage src={session.user?.image ?? undefined} />
                                        <AvatarFallback className={"bg-primary text-white"}>{session.user?.name && (initials(session?.user?.name))}</AvatarFallback>
                                    </Avatar>
                                </button>
                            )}/>
                            <DropdownMenuContent align={"end"} className={"w-50"}>
                                <div className={"px-2 py-1.5 flex flex-col items-start gap-1"}>
                                    <p className={"text-sm font-medium"}>{session.user?.name}</p>
                                    <p className={"text-xs text-muted-foreground"}>{session.user?.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut({ redirectTo: "/" })} className={"hover:cursor-pointer text-white"}>
                                    Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ): (
                    <Link
                        href={"/sign-in"}
                        className={"flex shrink-0 whitespace-nowrap rounded-md border border-border " +
                            "px-3 py-1.5 font-mono font-bold text-xs uppercase tracking-[0.12em] " +
                            "text-foreground transition-colors hover:border-primary/40"}
                    >
                        Sign in
                    </Link>
                )}


            </div>
        </header>
    )
}
export default Navbar
