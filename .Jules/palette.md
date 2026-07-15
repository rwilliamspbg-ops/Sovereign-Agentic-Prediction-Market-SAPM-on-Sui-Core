# Palette's UX Journal

This journal tracks critical UX and accessibility (a11y) learnings specific to the Sovereignty Agentic Prediction Market (SAPM) app.

## 2026-07-14 - Accessible Overlays & Search inputs in Prediction Market Dashboards
**Learning:** In highly interactive, command-driven prediction market interfaces where custom UI overlays (like the Command Palette) and dense tables are common, screen reader users face significant context loss if standard interactive buttons lack `aria-haspopup` and `aria-expanded` states. Additionally, text inputs like the global search inside the Command Palette and the market list query box must have dedicated, explicit `aria-label` attributes to ensure screen readers announce their function when no visible text labels are present.
**Action:** Always verify that custom popovers and search boxes are decorated with semantic ARIA labels, `aria-haspopup="dialog"`, and `aria-expanded={isOpen}` to prevent interactive element ambiguity.
