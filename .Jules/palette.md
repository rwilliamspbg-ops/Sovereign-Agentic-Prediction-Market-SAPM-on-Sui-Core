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

## 2026-07-23 - Conditional Accessibility on Interactive Cards & Grid Elements
**Learning:** In dashboards with dense lists or grid elements like the Agent Health Panel, interactive card elements built with non-semantic `div` tags should only declare interactive keyboard/screen-reader roles (`role="button"`, `tabIndex={0}`, keyboard key listeners, and custom `aria-label`) conditionally if they actually possess click event handlers. Hardcoding these properties causes static or read-only display states of the card to incorrectly advertise themselves as actionable buttons to screen readers, causing user confusion.
**Action:** Always assign `role`, `tabIndex`, `onKeyDown` and `aria-label` conditionally based on the presence of an `onClick` callback, and ensure high-contrast focus indicators (`focus-visible`) are only active when interactive.

## 2026-07-24 - Nested Interactive Elements in Clickable Custom Cards
**Learning:** When custom grid card components feature an outer click action (e.g., to default-trade or navigate) and contain inner custom sub-buttons (such as YES/NO outcome panels), nesting `role="button"` and `tabIndex` triggers a nested interactive elements pattern. While standard specifications advise against nested interactive controls, custom card architectures in highly legacy layout frameworks may necessitate a pragmatic compromise where both card and sub-buttons support keyboard focus/keydown handlers to avoid regressions on existing clicks while ensuring screen reader navigability.
**Action:** For clickable cards with nested click targets, conditionally apply tabIndex/role properties and focus indicators on both parent and child containers with proper event stopPropagation() controls to prevent double keydown/click firing.

## 2026-07-25 - Unified Dialog Accessibility & Keyboard Navigation Patterns for Modals
**Learning:** For user interfaces featuring modal popovers/overlays (such as AgentInsightModal), screen reader and keyboard-only users suffer significant usability barriers when standard close gestures like the 'Escape' key or backdrop clicks are not supported, or when modal layouts lack explicit dialog roles (e.g., `role="dialog"`, `aria-modal="true"`, `aria-labelledby`). Incorporating explicit ARIA landmarks, a standard 44x44px close icon in the top-right corner, and global keyboard listeners ensures seamless accessibility across all predictive dashboards.
**Action:** Always wrap overlay cards with a backdrop dismiss event, stopPropagation on the modal content, attach an Escape key event listener to the window, and specify clear `role="dialog"` attributes alongside a visible 44x44px minimum close touch target with a focus indicator.

## 2026-07-27 - Focus Management & Graceful Dismissal of Dropdowns
**Learning:** Custom interactive dropdown triggers and menu selectors (like the compact Network Switcher) must handle click-outside events and global keyboard triggers (specifically Escape keydown listeners) to gracefully collapse open dropdown menus, preventing interface congestion and satisfying standard accessibility benchmarks.
**Action:** Ensure custom popovers and select-menus listen to click-outside/Escape gestures, and clean up active global keyboard event listeners in useEffect hook destructors to prevent memory leaks.

## 2026-07-28 - Custom Switch Toggle Accessibility & Touch Targets in Settings Pages
**Learning:** Custom binary controls (e.g. settings toggle buttons) designed from standard HTML `button` tags must declare `role="switch"` and `aria-checked` to be recognized correctly by assistive technologies. Additionally, layout close buttons (like "✕") inside modal interfaces require explicit high-contrast focus rings (`focus-visible:ring-2`) and a minimum 44x44px touch target dimension to meet standard visual tracking and physical motor accessibility guidelines.
**Action:** Always decorate custom toggles with semantic ARIA roles, pass descriptive `aria-label` properties, and specify minimum 44x44px touch targets on critical dismiss buttons.

## 2026-07-30 - Form Label Associations & Quick-Preset Buttons for Inputs
**Learning:** Form input elements (like the amount input inside `TradeForm`) must be explicitly linked to their labels using matching `id` and `htmlFor` attributes to support screen reader accessibility. Furthermore, adding styled quick-preset buttons (such as `10 SUI`, `50 SUI`, `100 SUI` presets) directly beneath numeric inputs greatly reduces typing friction, and should utilize high-contrast visible focus indicators (`focus-visible:ring-2`) to keep keyboard navigation seamless.
**Action:** Always associate labels with inputs using `id` and `htmlFor`, and accompany input fields with accessible quick-preset buttons when possible.

## 2026-08-01 - DOM Label Attribute Compilations & JSDOM Testing Assertions
**Learning:** In React/JSX environments, form labels are linked to target inputs/dropdowns using the `htmlFor` JSX prop. However, this prop compiles directly to the standard DOM attribute named `for`. Consequently, Jest/JSDOM assertions attempting to verify correct labeling associations must query `label.getAttribute('for')` instead of `htmlFor` to accurately reflect and test the compiled DOM output.
**Action:** Always assert against the compiled standard attribute `for` instead of JSX prop `htmlFor` when verifying label associations inside unit tests.

## 2026-07-31 - Accessible Tooltips & Keyboard-Bound Overlays on Grid Cards
**Learning:** Absolutely positioned hover tooltips nested within list or grid cards require both a positioned parent container (utilizing the `relative` class) and the parent `group` class to activate the child tooltip via `group-hover:block`. Additionally, to prevent accessibility barriers for keyboard-only and screen-reader users, tooltip visibility must also be bound to focus states via `group-focus-within:block` so that metadata remains readable upon tab navigation.
**Action:** Always apply `relative group` to interactive parent cards, and use `group-hover:block group-focus-within:block pointer-events-none` on nested absolute tooltips to guarantee visual and keyboard accessibility.

## 2026-08-02 - Path Alias Module Mocking & Form-Label Associations in Testing
**Learning:** Under complex compiler/transpiler environments (such as Next.js with Jest/ts-jest), path aliases like `@/` can map to absolute paths in a way that scoped module mocks (e.g. `jest.mock('@/hooks/useAgentState')` inside a test file) fail to intercept component-level imports. To bypass path alias and ESM compilation issues during testing, registering mocks globally in `jest.setup.js` is an exceptionally robust pattern.
**Action:** Register mock setups globally in `jest.setup.js` for custom state hooks or subcomponents with path aliases to ensure complete mock intercept capability.
