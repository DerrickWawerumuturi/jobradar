'use client'

import React from 'react'
import Sidebar from "@/components/dashboard/Sidebar";
import {ApplicationsProvider} from "@/lib/applications-store";

/**
 * The workspace shell: sidebar left, content center-right, solid ground —
 * the blueprint grid stays off in here so the tables own the page.
 */
export default function DashboardLayout({children}: LayoutProps<"/dashboard">) {
    return (
        <ApplicationsProvider>
            <div className={"flex min-h-screen flex-col bg-background lg:flex-row"}>
                <Sidebar />
                {/* Table pages go full-bleed; Overview centers itself. Wide
                    content must scroll inside its own container, never the page. */}
                <div className={"min-w-0 flex-1 overflow-x-clip"}>
                    {children}
                </div>
            </div>
        </ApplicationsProvider>
    )
}
