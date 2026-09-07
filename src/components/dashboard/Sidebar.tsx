'use client'

import React from 'react'
import Link from "next/link";
import {usePathname} from "next/navigation";
import {signOut, useSession} from "next-auth/react";
import {
    ActivityIcon,
    ClipboardListIcon,
    HomeIcon,
    LogOutIcon,
    PlusIcon,
    RadarIcon,
    TrendingUpIcon,
    UserIcon,
    LucideIcon
} from "lucide-react";

import {cn, initials} from "@/lib/utils";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {useApplications} from "@/lib/applications-store";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    count?: number;
}

function NavLink({item, active, compact}: { item: NavItem; active: boolean; compact?: boolean }) {
    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                compact && "shrink-0 whitespace-nowrap",
                active
                    ? "bg-foreground/8 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
        >
            <item.icon className={cn("size-4 shrink-0", active ? "text-foreground" : "opacity-70")} />
            {item.label}
            {item.count != null && item.count > 0 && (
                <span className={"ml-auto font-mono text-[10px] tabular-nums text-muted-foreground"}>
                    {item.count}
                </span>
            )}
        </Link>
    )
}

export default function Sidebar() {
    const pathname = usePathname();
    const {data: session} = useSession();
    const {analysis} = useAnalysis();
    const {cv} = useCv();
    const {apps} = useApplications();

    const workspace: NavItem[] = [
        {href: "/dashboard", label: "Overview", icon: HomeIcon},
        {href: "/dashboard/opportunities", label: "Opportunities", icon: RadarIcon, count: analysis?.ranked_jobs?.length},
        {href: "/dashboard/applications", label: "Applications", icon: ClipboardListIcon, count: apps.length},
        {href: "/dashboard/gaps", label: "Skill gaps", icon: TrendingUpIcon}
    ];

    const you: NavItem[] = [
        ...(analysis ? [{href: "/dashboard/market", label: "Market charts", icon: ActivityIcon}] : []),
        ...(cv ? [{href: "/dashboard/profile", label: "My profile", icon: UserIcon}] : []),
        {href: "/", label: "New scan", icon: PlusIcon}
    ];

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === href : pathname.startsWith(href);

    const account = session?.user ? (
        <div className={"flex items-center gap-2.5 border-t border-border px-3 py-3"}>
            <Avatar className={"size-7"}>
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback className={"bg-primary text-[10px] text-white"}>
                    {session.user.name ? initials(session.user.name) : "?"}
                </AvatarFallback>
            </Avatar>
            <div className={"min-w-0 flex-1"}>
                <p className={"truncate text-xs font-medium"}>{session.user.name}</p>
                <p className={"truncate text-[10.5px] text-muted-foreground"}>{session.user.email}</p>
            </div>
            <button
                aria-label={"Sign out"}
                title={"Sign out"}
                onClick={() => signOut({redirectTo: "/"})}
                className={"text-muted-foreground transition-colors hover:text-foreground"}
            >
                <LogOutIcon className={"size-4"} />
            </button>
        </div>
    ) : (
        <div className={"border-t border-border px-3 py-3"}>
            <Link
                href={"/sign-in"}
                className={"block rounded-md border border-border px-3 py-1.5 text-center font-mono text-xs uppercase tracking-[0.12em] transition-colors hover:border-primary/40"}
            >
                Sign in
            </Link>
        </div>
    );

    return (
        <>
            {/* Desktop: the Notion-style rail. */}
            <aside className={"sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar lg:flex"}>
                <Link href={"/"} className={"flex flex-col gap-0.5 px-4 pb-4 pt-5"}>
                    <span className={"font-heading text-lg font-bold uppercase leading-none tracking-tight"}>
                        Jobradar<span className={"text-primary"}>.</span>
                    </span>
                    <span className={"font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground"}>
                        Market intelligence
                    </span>
                </Link>

                <nav className={"flex flex-1 flex-col gap-6 overflow-y-auto px-2.5"}>
                    <div className={"flex flex-col gap-0.5"}>
                        <p className={"px-2.5 pb-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70"}>Workspace</p>
                        {workspace.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
                    </div>
                    <div className={"flex flex-col gap-0.5"}>
                        <p className={"px-2.5 pb-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70"}>You</p>
                        {you.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} />)}
                    </div>
                </nav>

                {account}
            </aside>

            {/* Mobile: wordmark row + a scrollable nav strip. */}
            <div className={"sticky top-0 z-30 border-b border-border bg-background lg:hidden"}>
                <div className={"flex items-center justify-between px-4 pt-3"}>
                    <Link href={"/"} className={"font-heading text-lg font-bold uppercase leading-none tracking-tight"}>
                        Jobradar<span className={"text-primary"}>.</span>
                    </Link>
                    {session?.user ? (
                        <Avatar className={"size-7"}>
                            <AvatarImage src={session.user.image ?? undefined} />
                            <AvatarFallback className={"bg-primary text-[10px] text-white"}>
                                {session.user.name ? initials(session.user.name) : "?"}
                            </AvatarFallback>
                        </Avatar>
                    ) : (
                        <Link href={"/sign-in"} className={"font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground"}>
                            Sign in
                        </Link>
                    )}
                </div>
                <nav className={"no-scrollbar flex gap-1 overflow-x-auto px-3 py-2"}>
                    {[...workspace, ...you].map((item) => (
                        <NavLink key={item.href} item={{...item, count: undefined}} active={isActive(item.href)} compact />
                    ))}
                </nav>
            </div>
        </>
    )
}
