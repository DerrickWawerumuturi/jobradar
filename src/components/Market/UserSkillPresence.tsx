import React from 'react'
import {SkillStat} from "@/types/jobradar";
import SkillBarChart from "@/components/Market/SkillBarChart";
import PanelHeader from "@/components/Market/PanelHeader";
import PanelNote from "@/components/Market/PanelNote";
import {formatPercent, mostDemanded} from "@/lib/market";

interface UserSkillPresenceProps {
    userSkills: SkillStat[];
    /** Used only to say how the user's best skill compares to the market's. */
    topSkills: SkillStat[];
}

/**
 * Answers: "how common are the skills I already have?"
 *
 * Deliberately a separate section from market demand rather than a second
 * series on that chart — these bars are the user's own skills, and the caption
 * is what ties them back to the wider market.
 */
const UserSkillPresence = ({userSkills, topSkills}: UserSkillPresenceProps) => {
    const mine = userSkills ?? [];
    const myBest = mostDemanded(mine);
    const marketBest = mostDemanded(topSkills ?? []);

    return (
        <section className={"chart-panel chart-panel-green flex flex-col gap-6 px-5 py-7 sm:px-8"}>
            <PanelHeader
                title={"My skills in the market"}
                qualifier={"from your CV"}
                lead={"How often the skills already on your CV appear in these job postings"}
            />

            {mine.length === 0 ? (
                <p className={"rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"}>
                    None of the skills on your CV appear in the postings analyzed. That
                    usually means the search returned a different corner of the market
                    rather than that the skills lack value.
                </p>
            ) : (
                <>
                    <SkillBarChart skills={mine} fill={"var(--chart-3)"} />

                    {myBest && marketBest && (
                        <p className={"text-sm text-muted-foreground"}>
                            Your most in-demand skill is{" "}
                            <span className={"font-medium text-foreground"}>{myBest.skill}</span>,
                            requested in {formatPercent(myBest.frequency)} of postings. The
                            market&apos;s most requested skill overall is{" "}
                            <span className={"font-medium text-foreground"}>{marketBest.skill}</span>{" "}
                            at {formatPercent(marketBest.frequency)}.
                        </p>
                    )}

                    <PanelNote
                        points={[
                            <>Every skill here is already on your CV — the chart shows how much this market wants each one.</>,
                            <>A long orange or red bar is one of your strongest cards: lots of employers ask for it and you have it.</>,
                            <>A short yellow bar just means these particular postings rarely mention it — that says more about this market than about the skill.</>,
                            <>Hover a bar for the exact number of postings.</>
                        ]}
                    />
                </>
            )}
        </section>
    )
}
export default UserSkillPresence
