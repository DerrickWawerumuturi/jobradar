import Hero from "@/components/Hero";
import Annotation from "@/components/Annotation";
import LandscapePreview from "@/components/LandscapePreview";
import About from "@/components/About";
import Faq from "@/components/Faq";

export default function Home() {
  return (
      <div className={"flex min-h-screen flex-col overflow-x-clip"}>
        <main className={"flex flex-1 flex-col gap-14"}>
          <Hero />
          <div className={"flex flex-col gap-1"}>
            <Annotation flip className={"mr-10 self-end"}>
              a peek at what&apos;s waiting for you inside
            </Annotation>
            <LandscapePreview />
          </div>
         <div className={"flex flex-1 flex-col"}>
            <About />
            <Faq />
          </div>

          <section aria-label={"Get started"} className={"chart-band chart-panel-green"}>
            <div className={"mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 py-14 text-center lg:px-8"}>
              <Annotation hideArrow className={"self-center"}>
                still here? that&apos;s a yes.
              </Annotation>
              <h2 className={"font-heading text-3xl font-bold uppercase leading-[1.05] tracking-tight sm:text-4xl"}>
                Your market report is<br/>a minute away.
              </h2>
              <p className={"max-w-md text-sm text-muted-foreground"}>
                One PDF in, a full read on your market out — what they want,
                what you have, and what to learn next.
              </p>
              <a
                href={"#upload"}
                className={"rounded-md bg-accent-lime px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accent-lime-ink transition-opacity hover:opacity-90"}
              >
                Upload your CV
              </a>
            </div>
          </section>
        </main>

        {/* The footer lives inside the green band, closing the page. */}
        <footer className={"chart-band chart-panel-green flex flex-wrap items-center justify-between gap-3 border-b-0 px-5 py-6 lg:px-8"}>
          <span className={"font-heading text-sm font-bold uppercase tracking-tight"}>
            Jobradar<span className={"text-primary"}>.</span>
          </span>
          <span className={"font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"}>
            Upload a CV · read the market · close the gap
          </span>
        </footer>
      </div>
  )
}
