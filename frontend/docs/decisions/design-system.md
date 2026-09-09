# Decision: design system

**Files:** `src/app/globals.css`, `src/app/layout.tsx`

## Direction

Dark editorial data-visualization: near-black ground, one vivid accent, bold
tight display type against monospace captions, hairline rules.

Chosen from two references. The rejected alternative was a warm off-white SaaS
analysis; density and card-layering ideas were borrowed from it, but the ground
and the type treatment come from the editorial reference.

## Tokens live in CSS, not a config file

Tailwind v4 is CSS-first. **There is no `tailwind.config`.** Every token is
declared in `src/app/globals.css`:

- `@theme inline` — maps tokens to utility names. A `--color-foo` here generates
  `bg-foo`, `text-foo`, `ring-foo`.
- `:root` — light values (kept coherent, but not what ships).
- `.dark` — the shipping palette.

The app is **locked to dark** via `className="dark"` on `<html>` in
`layout.tsx`. `next-themes` is installed but only referenced by `ui/sonner.tsx`;
there is no toggle, deliberately — committing to one look means it can be good,
rather than acceptable in two.

## The palette

| Role | Value |
|---|---|
| Ground | `oklch(0.155 0.004 260)` — near-black |
| Surfaces | three raised steps: card → popover → muted |
| Hairline | `oklch(1 0 0 / 8%)` |
| Text | warm white, plus a muted step |
| **Accent** | **`#f5532a`** orange-red |

The accent drives `--primary` **and** the whole `--chart-*` ramp. That single
decision is why the entire analysis repainted from green to orange-red in one
edit — no component holds a colour.

Accent use is restricted to: data marks, the primary CTA, the active-tab
indicator, section heading ticks, and small numerals. Everywhere else is
foreground/muted ink. **Text wears text tokens, never the series colour.**

## Charts must read tokens

```tsx
fill="var(--chart-3)"      // correct
fill="#f5532a"             // never
```

Recharts accepts CSS custom properties directly. Hard-coding a colour in a chart
breaks the one-place-to-change property that makes this system worth having.

## Typography

- **Space Grotesk** (`font-space`, `font-heading`) — display and body. Bold,
  tight, uppercase for headings.
- **JetBrains Mono** (`font-mono`) — every number, axis tick, unit, percent
  label, legend entry and small-caps label.

Numbers are treated as the hero. The mono/display contrast is most of what makes
the reference read as technical rather than generic.

## A bug worth remembering

`--font-sans` was previously defined as `var(--font-sans)` — self-referential,
so it resolved to nothing and the whole `font-sans` stack silently fell back to
the browser default. `--font-mono` was never mapped at all despite the font
being loaded.

Both are fixed. Self-referential CSS custom properties fail silently: no
console error, no build failure, just a font that is quietly wrong.

## Working within this

- Add tokens to `globals.css`; do not introduce component-level colour.
- New shadcn components are built on `@base-ui/react`, not Radix — `render`
  props rather than `asChild`, `Backdrop`/`Popup` rather than `Overlay`/
  `Content`, `data-open:`/`data-closed:` state variants.
- Layered surfaces, not borders, carry hierarchy. Borders are hairlines.

## Not verified

None of this has been looked at in a browser. It is compiler-verified only.
Outstanding visual checks: the hero image against the near-black card (a
light-toned illustration may fight it), the donut's centred label, legend
placement on the landscape chart, and the 375px breakpoint where the compact
axis engages.
