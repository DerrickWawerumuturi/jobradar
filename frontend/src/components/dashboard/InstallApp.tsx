'use client'

import React, {useEffect, useState} from 'react'
import {ArrowDownToLineIcon, ShareIcon} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * One-tap install where the platform allows it (Android/desktop Chromium via
 * beforeinstallprompt). iOS never exposes a prompt — every browser there is
 * WebKit — so the best possible UX is a hint at the share-menu gesture.
 */
export default function InstallApp() {
    const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [platform, setPlatform] = useState<"hidden" | "ios">("hidden");

    useEffect(() => {
        if (window.matchMedia("(display-mode: standalone)").matches) return;
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) setPlatform("ios");

        const onPrompt = (event: Event) => {
            event.preventDefault();
            setPrompt(event as BeforeInstallPromptEvent);
        };
        const onInstalled = () => setPrompt(null);
        window.addEventListener("beforeinstallprompt", onPrompt);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onPrompt);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    if (prompt) {
        return (
            <button
                onClick={() => {
                    void prompt.prompt();
                    void prompt.userChoice.then(() => setPrompt(null));
                }}
                className={"flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"}
            >
                <ArrowDownToLineIcon className={"size-4 shrink-0 opacity-70"} />
                Install app
            </button>
        );
    }

    if (platform === "ios") {
        return (
            <p className={"flex items-start gap-2 px-2.5 py-1.5 text-[11px] leading-snug text-muted-foreground/80"}>
                <ShareIcon className={"mt-0.5 size-3.5 shrink-0"} />
                Install: tap Share, then &quot;Add to Home Screen&quot;
            </p>
        );
    }

    return null;
}
