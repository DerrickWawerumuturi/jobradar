'use client'

import React from 'react'
import {useAnalysis} from "@/lib/analysis-store";
import MarketOverview from "@/components/Market/MarketOverview";
import SkillCoverage from "@/components/Market/SkillCoverage";
import Annotation from "@/components/Annotation";

export default function AnalysisOverviewPage() {
    const {analysis} = useAnalysis();
    if (!analysis) return null;

    return (
        <div className={"flex flex-col gap-10"}>
            <div className={"flex flex-col gap-1"}>
                <Annotation className={"ml-3 self-start"}>welcome in → this is the market you&apos;re stepping into</Annotation>
                <MarketOverview market={analysis.market} />
            </div>
            <div className={"flex flex-col gap-1"}>
                <Annotation flip className={"mr-8 self-end"}>and look → you&apos;ve already got a good chunk covered</Annotation>
                <SkillCoverage coverage={analysis.market.skill_coverage} />
            </div>
        </div>
    )
}
