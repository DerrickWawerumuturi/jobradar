'use client'

import React, {useEffect, useRef, useState} from 'react'
import Link from "next/link";
import {usePathname} from "next/navigation";
import {signOut, useSession} from "next-auth/react";
import {
    ActivityIcon,
    ChevronRightIcon,
    PanelLeftCloseIcon,
    PanelLeftOpenIcon,
    ClipboardListIcon,
    HomeIcon,
    LogOutIcon,
    PlusIcon,
    RadarIcon,
    TrendingUpIcon,
    UserIcon,
    LucideIcon
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

import {cn, initials} from "@/lib/utils";
import {useAnalysis} from "@/lib/analysis-store";
import {useCv} from "@/lib/cv-store";
import {useApplications} from "@/lib/applications-store";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import InstallApp from "@/components/dashboard/InstallApp";

interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    count?: number;
}

function NavLink({item, active, compact, collapsed}: {
    item: NavItem;
    active: boolean;
    compact?: boolean;
    collapsed?: boolean;
}) {
    return (
        <Link
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
                "flex items-center gap-2.5 rounded-md py-1.5 text-[13px] transition-colors",
                collapsed ? "justify-center px-0" : "px-2.5",
                compact && "shrink-0 whitespace-nowrap",
                active
                    ? "bg-foreground/8 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            )}
        >
            <item.icon className={cn("size-4 shrink-0", active ? "text-foreground" : "opacity-70")} />
            {!collapsed && item.label}
            {!collapsed && item.count != null && item.count > 0 && (
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

    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        try { setCollapsed(localStorage.getItem("sidebar-collapsed") === "1") } catch {}
    }, []);
    const toggleCollapsed = () => setCollapsed((prev) => {
        try { localStorage.setItem("sidebar-collapsed", prev ? "0" : "1") } catch {}
        return !prev;
    });

    const stripRef = useRef<HTMLElement>(null);
    const [stripAtEnd, setStripAtEnd] = useState(false);
    const onStripScroll = () => {
        const el = stripRef.current;
        if (el) setStripAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };

    const workspace: NavItem[] = [
        {href: "/dashboard", label: "Overview", icon: HomeIcon},
        {href: "/dashboard/opportunities", label: "Opportunities", icon: RadarIcon, count: analysis?.ranked_jobs?.length},
        {href: "/dashboard/applications", label: "Applications", icon: ClipboardListIcon, count: apps.length},
        {href: "/dashboard/gaps", label: "Skill gaps", icon: TrendingUpIcon}
    ];

    const you: NavItem[] = [
        ...(analysis ? [{href: "/dashboard/market", label: "Market charts", icon: ActivityIcon}] : []),
        ...(cv ? [{href: "/dashboard/profile", label: "My profile", icon: UserIcon}] : []),
        {href: "/dashboard/scan", label: "New scan", icon: PlusIcon}
    ];

    const isActive = (href: string) =>
        href === "/dashboard" ? pathname === href : pathname.startsWith(href);

    const account = session?.user ? (
        <div className={"border-t border-border p-2"}>
            <DropdownMenu>
                <DropdownMenuTrigger render={(props) => (
                    <button
                        {...props}
                        aria-label={"Account menu"}
                        className={cn(props.className, "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-foreground/5")}
                    >
                        <Avatar className={"size-7"}>
                            <AvatarImage src={session.user?.image ?? undefined} />
                            <AvatarFallback className={"bg-primary text-[10px] text-white"}>
                                {session.user?.name ? initials(session.user.name) : "?"}
                            </AvatarFallback>
                        </Avatar>
                        {!collapsed && (
                            <span className={"min-w-0 flex-1"}>
                                <span className={"block truncate text-xs font-medium"}>{session.user?.name}</span>
                                <span className={"block truncate text-[10.5px] text-muted-foreground"}>{session.user?.email}</span>
                            </span>
                        )}
                        {!collapsed && <ChevronRightIcon className={"size-3.5 -rotate-90 text-muted-foreground"} />}
                    </button>
                )} />
                <DropdownMenuContent align={"start"} className={"w-56"}>
                    <DropdownMenuItem
                        render={(props) => (
                            <Link {...props} href={"/dashboard/profile"} className={cn(props.className, "cursor-pointer")}>
                                <UserIcon className={"size-4 opacity-70"} /> My profile
                            </Link>
                        )}
                    />
                    <InstallApp />
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => signOut({redirectTo: "/"})}
                        className={"cursor-pointer"}
                    >
                        <LogOutIcon className={"size-4 opacity-70"} /> Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    ) : (
        <div className={"border-t border-border px-3 py-3"}>
            <Link
                href={"/sign-in"}
                title={"Sign in"}
                className={cn(
                    "block rounded-md border border-border py-1.5 text-center font-mono text-xs uppercase tracking-[0.12em] transition-colors hover:border-primary/40",
                    collapsed ? "px-1" : "px-3"
                )}
            >
                {collapsed ? "→" : "Sign in"}
            </Link>
        </div>
    );

    return (
        <>
            {/* Desktop: the Notion-style rail, collapsible to icons. */}
            <aside className={cn(
                "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 lg:flex",
                collapsed ? "w-[66px]" : "w-60"
            )}>
                <div className={cn("flex items-start pb-4 pt-5", collapsed ? "justify-center px-0" : "justify-between px-4")}>
                    {!collapsed && (
                        <Link href={"/"} className={"flex flex-col gap-0.5"}>
                            <span className={"font-heading text-lg font-bold uppercase leading-none tracking-tight"}>
                                Jobradar<span className={"text-primary"}>.</span>
                            </span>
                            <span className={"font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground"}>
                                Market intelligence
                            </span>
                        </Link>
                    )}
                    <button
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand" : "Collapse"}
                        onClick={toggleCollapsed}
                        className={"mt-0.5 text-muted-foreground transition-colors hover:text-foreground"}
                    >
                        {collapsed ? <PanelLeftOpenIcon className={"size-4"} /> : <PanelLeftCloseIcon className={"size-4"} />}
                    </button>
                </div>

                <nav className={cn("flex flex-1 flex-col gap-6 overflow-y-auto pt-4", collapsed ? "px-2" : "px-2.5")}>
                    <div className={"flex flex-col gap-0.5"}>
                        {!collapsed && <p className={"px-2.5 pb-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70"}>Workspace</p>}
                        {workspace.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />)}
                    </div>
                    <div className={cn("flex flex-col gap-0.5", collapsed && "border-t border-border pt-2")}>
                        {!collapsed && <p className={"px-2.5 pb-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/70"}>You</p>}
                        {you.map((item) => <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} />)}
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
                        <DropdownMenu>
                            <DropdownMenuTrigger render={(props) => (
                                <button {...props} aria-label={"Account"}>
                                    <Avatar className={"size-7"}>
                                        <AvatarImage src={session.user?.image ?? undefined} />
                                        <AvatarFallback className={"bg-primary text-[10px] text-white"}>
                                            {session.user?.name ? initials(session.user.name) : "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            )} />
                            <DropdownMenuContent align={"end"} className={"w-56"}>
                                <div className={"flex flex-col items-start gap-0.5 px-2 py-1.5"}>
                                    <p className={"text-sm font-medium"}>{session.user.name}</p>
                                    <p className={"text-xs text-muted-foreground"}>{session.user.email}</p>
                                </div>
                                <DropdownMenuSeparator />
                                <InstallApp />
                                <DropdownMenuItem
                                    onClick={() => signOut({redirectTo: "/"})}
                                    className={"cursor-pointer"}
                                >
                                    <LogOutIcon className={"size-4 opacity-70"} /> Sign out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Link href={"/sign-in"} className={"font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground"}>
                            Sign in
                        </Link>
                    )}
                </div>
                <div className={"relative"}>
                    <nav
                        ref={stripRef}
                        onScroll={onStripScroll}
                        className={"no-scrollbar flex gap-1 overflow-x-auto px-3 py-2"}
                    >
                        {[...workspace, ...you].map((item) => (
                            <NavLink key={item.href} item={{...item, count: undefined}} active={isActive(item.href)} compact />
                        ))}
                    </nav>
                    {/* More tabs live off-screen — fade + pulse until scrolled there. */}
                    {!stripAtEnd && (
                        <div aria-hidden className={"pointer-events-none absolute inset-y-0 right-0 flex w-14 items-center justify-end bg-gradient-to-l from-background via-background/80 to-transparent pr-1"}>
                            <ChevronRightIcon className={"size-4 animate-pulse text-primary"} />
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
