# Copilot Instructions

## CSS Variables

Always use the design-system CSS variables defined in `src/styles/body.css`. Never hardcode raw colour values.

### Key variables

| Purpose | Variable |
|---|---|
| Dividers / borders / `<hr>` | `var(--surface-text-color)` |
| Surface text (headings, body copy) | `var(--surface-text-color)` |
| Blog surface background | `var(--blog-surface-background)` |
| Brand accent (hover indicators etc.) | `var(--brand-100)` |
| Nav background | `var(--nav-background)` |

## Hover / transition interactions

Do **not** animate `padding`, `margin`, or any layout-shifting property on hover — this causes text jitter.
Use non-layout transitions instead:

- `background-color`
- `border-left-color` (with a fixed `border-left: N solid transparent` on the base state)
- `opacity`
- `transform` (on decorative child elements only, not on text containers)

## Tables

- Scope table styles to the component's own CSS file (e.g. `llmoptimizations.css`) using the parent layout class as a prefix (e.g. `.llm-section-view table`).
- Use `border-collapse: collapse` and `border: 1px solid color-mix(in srgb, var(--surface-text-color) 20%, transparent)` for cell borders.
- Header cells (`th`) should use `font-weight: 700`, small uppercase text (`font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.05em`), and a subtle background via `color-mix(in srgb, var(--surface-text-color) 8%, transparent)`.
- Alternate body rows with `color-mix(in srgb, var(--surface-text-color) 4%, transparent)` and add a hover highlight at 8%.
- Never hardcode colours in table styles — always use `var(--surface-text-color)` so both light and dark themes work.

## Borders

Use `var(--surface-text-color)` for all structural borders — accordion rows, cards, nav buttons, `<hr>` elements.

## General

- Always prefer CSS variables over raw values so both light and dark themes work correctly.
- Import component-specific CSS from `src/styles/` — one file per component/page.
- New blog sub-route components live in `src/blogs/<blog-slug>/` with an `index.jsx` entry point and a `sections.js` registry.
- Always use `FaArrowRight` (from `react-icons/fa6`) for **internal** navigation indicators and `LuArrowUpRight` (from `react-icons/lu`) for **external** link indicators. Never use text characters like `›`, `»`, `>`, or `→` as arrow substitutes.
