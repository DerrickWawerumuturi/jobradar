import {ImageResponse} from "next/og";

export const alt = "Jobradar — see where you actually stand";
export const size = {width: 1200, height: 630};
export const contentType = "image/png";

export default function OgImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: "72px 80px",
                    backgroundColor: "#131316",
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    color: "#f4f2ec",
                }}
            >
                <div style={{display: "flex", fontSize: 28, letterSpacing: 6, color: "#e8672e"}}>
                    JOB-HUNT INTELLIGENCE
                </div>

                <div style={{display: "flex", flexDirection: "column", gap: 10}}>
                    <div style={{display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02}}>
                        See where you
                    </div>
                    <div style={{display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.02}}>
                        actually stand.
                    </div>
                </div>

                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    <div style={{display: "flex", fontSize: 40, fontWeight: 800}}>
                        Jobradar<span style={{color: "#e8672e"}}>.</span>
                    </div>
                    <div
                        style={{
                            display: "flex",
                            fontSize: 24,
                            padding: "10px 22px",
                            border: "2px solid #d3f26a",
                            borderRadius: 6,
                            color: "#d3f26a",
                            transform: "rotate(-3deg)",
                        }}
                    >
                        YOUR CV · READ IN ~1 MIN
                    </div>
                </div>
            </div>
        ),
        {...size}
    );
}
