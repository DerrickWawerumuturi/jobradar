'use client'

import React from 'react'
import {useAnalysis} from "@/lib/analysis-store";
import {EmptyScan, PageBar} from "@/components/dashboard/bits";
import Annotation from "@/components/Annotation";
import MarketOverview from "@/components/Market/MarketOverview";
import SkillCoverage from "@/components/Market/SkillCoverage";
import SkillDemandChart from "@/components/Market/SkillDemandChart";
import UserSkillPresence from "@/components/Market/UserSkillPresence";
import SkillLandscape from "@/components/Market/SkillLandscape";
import SkillGapChart from "@/components/Market/SkillGapChart";

/** The full chart suite from the analysis section, living inside the shell. */
export default function MarketChartsPage() {
    const {analysis, hydrated, fileName} = useAnalysis();

    if (!hydrated) return null;

    const market = analysis?.market;

    return (
        <div className={"flex min-h-screen flex-col"}>
            <PageBar
                title={"Market charts"}
                meta={market
                    ? `${market.jobs_analyzed.toLocaleString()} postings analyzed${fileName ? ` · ${fileName}` : ""}`
                    : undefined}
            />

            {!market ? (
                <div className={"px-4 py-8 sm:px-8"}>
                    <EmptyScan message={"No scan yet — the charts draw themselves from real postings."} />
                </div>
            ) : (
                <div className={"mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 sm:px-8"}>
                    <div className={"flex flex-col gap-1"}>
                        <Annotation className={"ml-3 self-start"}>this is the market you&apos;re stepping into</Annotation>
                        <MarketOverview market={market} />
                    </div>
                    <SkillCoverage coverage={market.skill_coverage} />
                    <SkillDemandChart skills={market.top_skills} />
                    <UserSkillPresence
                        userSkills={market.user_skill_presence}
                        topSkills={market.top_skills}
                    />
                    <div className={"flex flex-col gap-1"}>
                        <Annotation flip className={"mr-8 self-end"}>you and the market, side by side</Annotation>
                        <SkillLandscape
                            userSkills={market.user_skill_presence}
                            gaps={market.skill_gaps}
                        />
                    </div>
                    <SkillGapChart
                        gaps={market.skill_gaps}
                        jobsAnalyzed={market.jobs_analyzed}
                    />
                </div>
            )}
        </div>
    )
}
