'use client'

import React from 'react'
import {useAnalysis} from "@/lib/analysis-store";
import SkillDemandChart from "@/components/Market/SkillDemandChart";
import UserSkillPresence from "@/components/Market/UserSkillPresence";
import SkillLandscape from "@/components/Market/SkillLandscape";
import Annotation from "@/components/Annotation";

export default function DashboardSkillsPage() {
    const {analysis} = useAnalysis();
    if (!analysis) return null;

    const {market} = analysis;

    return (
        <div className={"flex flex-col gap-10"}>
            <div className={"flex flex-col gap-1"}>
                <Annotation className={"ml-3 self-start"}>these are the skills employers keep asking for</Annotation>
                <SkillDemandChart skills={market.top_skills} />
            </div>
            <div className={"flex flex-col gap-1"}>
                <Annotation flip className={"mr-8 self-end"}>and here&apos;s where you already show up</Annotation>
                <UserSkillPresence
                    userSkills={market.user_skill_presence}
                    topSkills={market.top_skills}
                />
            </div>
            <div className={"flex flex-col gap-1"}>
                <Annotation className={"ml-3 self-start"}>the full picture → you and the market, side by side</Annotation>
                <SkillLandscape
                    userSkills={market.user_skill_presence}
                    gaps={market.skill_gaps}
                />
            </div>
        </div>
    )
}
