# Palette's UX Journal

This journal tracks critical UX and accessibility (a11y) learnings specific to the Sovereignty Agentic Prediction Market (SAPM) app.

## 2026-07-14 - Accessible Overlays & Search inputs in Prediction Market Dashboards
**Learning:** In highly interactive, command-driven prediction market interfaces where custom UI overlays (like the Command Palette) and dense tables are common, screen reader users face significant context loss if standard interactive buttons lack `aria-haspopup` and `aria-expanded` states. Additionally, text inputs like the global search inside the Command Palette and the market list query box must have dedicated, explicit `aria-label` attributes to ensure screen readers announce their function when no visible text labels are present.
**Action:** Always verify that custom popovers and search boxes are decorated with semantic ARIA labels, `aria-haspopup="dialog"`, and `aria-expanded={isOpen}` to prevent interactive element ambiguity.

## 2026-07-16 - Accessible Feedback & Toast Notifications in Real-time Trading Flow
**Learning:** Real-time trade transaction feedbacks and notifications (Toasts) must dynamically announce themselves to assistive technologies using standard semantic roles (`status` or `alert`) and `aria-live="polite"` attributes. Additionally, icon-only dismiss buttons (like "✕") inside highly styled inline toast banners must feature clear accessibility properties (such as an explicit `aria-label="Dismiss notification"`), minimum touch target sizes, and high-contrast, text-color-matching focus ring indicators to accommodate screen reader, keyboard, and touch users seamlessly.
**Action:** Always wrap dynamic alerts and status banners in appropriate ARIA roles, implement explicit labels for close buttons, and employ text-color-matching focus rings (`focus:ring-current`) for unified visual keyboard tracking.

## 2026-07-20 - Accessible Network Switcher Dropdowns & Custom Controls
**Learning:** In multi-network decentralized applications, custom dropdowns and toggles like the Network Switcher must explicitly support ARIA states and roles (`aria-haspopup="listbox"`, `aria-expanded={isOpen}`, `role="listbox"`, `role="option"`, and `aria-selected`) to convey dynamic connectivity states to assistive technologies. Additionally, standard keyboard focus rings (e.g., `focus-visible:ring-2`) should always be declared to avoid focus-loss for keyboard navigability across these critical network triggers.
**Action:** Declare semantic roles and selection states on connectivity controls, and accompany custom interactive triggers with highly visible, high-contrast focus rings.
