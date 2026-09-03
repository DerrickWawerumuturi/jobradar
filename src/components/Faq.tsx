import React from 'react'
import PanelHeader from "@/components/Market/PanelHeader";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";

const FAQS = [
    {
        q: "What do I need to start?",
        a: "Just your CV. Upload it and the analysis starts. Create a free account whenever you want to keep your results."
    },
    {
        q: "How long does it take?",
        a: "About a minute for a typical run; the first one of the day can take a little longer while the engine warms up. Leave the tab open while it works."
    },
    {
        q: "What will I actually see?",
        a: "Four views: the market's headline numbers, its most-wanted skills next to yours, the gaps worth closing, and real postings ranked by how well they fit you."
    },
    {
        q: "Do I have to re-upload every time?",
        a: "No. Your last analysis is kept on this device, and once you sign in your profile is saved to your account; so it follows you to any device."
    },
    {
        q: "Is a low score a bad sign?",
        a: "No. Scores measure overlap with one batch of postings, not your employability: read a low number as a to learn list, not a verdict."
    }
] as const;

/** Quick answers to the questions people have before uploading a CV. */
const Faq = () => (
    <section
        id={"faq"}
        aria-label={"Frequently asked questions"}
        className={"flex-1"}
    >
        <div className={"mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:py-12 lg:px-8"}>
            <PanelHeader
                title={"FAQ"}
                qualifier={""}
                lead={"The short version of everything people ask before uploading"}
            />

            <Accordion>
                {FAQS.map(({q, a}) => (
                    <AccordionItem key={q} value={q}>
                        <AccordionTrigger className={"py-4 font-heading text-sm font-bold uppercase tracking-[0.04em] hover:no-underline"}>
                            {q}
                        </AccordionTrigger>
                        <AccordionContent className={"pb-4"}>
                            <p className={"max-w-2xl text-sm leading-relaxed text-muted-foreground"}>{a}</p>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    </section>
)
export default Faq
