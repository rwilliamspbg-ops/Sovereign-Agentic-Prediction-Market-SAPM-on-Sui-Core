# Palette's UX Journal

This journal tracks critical UX and accessibility (a11y) learnings specific to the Sovereignty Agentic Prediction Market (SAPM) app.

## 2026-08-13 - Escape Key Dismissal in Configuration Panels
**Learning:** Sliding or full-page configuration panels (like SettingsPanel) must support predictable keyboard navigation, specifically Escape key listeners. This allows assistive technologies and keyboard-only navigators to seamlessly dismiss overlays without being trapped inside form elements or select options.
**Action:** Always register a global keyboard event listener for the Escape key in full-screen settings/control overlays and properly remove the listener on component unmount.

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

## 2026-08-05 - Accessible Character Counts & Constraints for Custom Inputs
**Learning:** For user input components with strict backend or on-chain payload length limitations (such as scenario description textareas in `AIAssistantPanel`), users lack visual clarity and feedback on the remaining space unless a `maxLength` and live counter are active. Furthermore, assistive technology users face context gaps unless the count element is associated via `aria-describedby` and declares `aria-live="polite"` to dynamically announce updates.
**Action:** Declare a `maxLength` limit, link description elements with `aria-describedby`, include `aria-live="polite"` on dynamic count elements, and style using standard Tailwind text utility classes (`text-xs text-right text-slate-400 mt-1 mb-2`) rather than inline styling.

## 2026-08-06 - Hiding Screen Reader Labels & Overriding `sr-only` CSS Styles
**Learning:** When rendering labels visually hidden for screen readers (using standard classes like `sr-only`), never apply styling like `display: none` or `visibility: hidden` to the label container because these declarations prevent screen readers and assistive technologies from announcing or parsing the linked text content.
**Action:** If a label is designed to be visually hidden but screen-reader accessible, use semantic absolute positioning styles (`position: absolute`, `width: 1px`, `height: 1px`, `overflow: hidden`, etc.) instead of complete visibility suppression.

## 2026-08-07 - Keyboard Focus Overlays & Suppressing Nested Interactive Tab Stops
**Learning:** Action overlays inside interactive grid/list cards that only display on hover prevent keyboard-only users from seeing these actions. Adding `group-focus-within` allows keyboard users to see the overlay when they focus the card. Additionally, setting `tabIndex={-1}` on nested decorative buttons inside the card prevents confusing, redundant double tab-stops since the entire card is already focusable and actionable.
**Action:** Always combine `group-focus-within` on card overlays and set `tabIndex={-1}` on redundant, nested buttons within interactive parents to optimize tabbing and visual accessibility.

## 2026-08-08 - Accessible Dialog Overlays & Escape Gesture Navigation in Trading Flows
**Learning:** Modals or dialog confirmation boxes inside dense trading sections of prediction markets (such as close position confirmation popovers) must explicitly support ARIA definitions (`role="dialog"`, `aria-modal="true"`, and `aria-labelledby`) to prevent context gaps for screen-reader users. Additionally, attaching global event listeners in `useEffect` hook triggers for the 'Escape' key alongside overlay backdrop clicks with proper `stopPropagation` guarantees standard-compliant modal dismiss capability.
**Action:** Always wrap dialog structures with standard backdrop-clicks, key listeners, semantic accessibility roles, and explicit target focus styles (`focus-visible`).

## 2026-08-10 - Keyboard-Bound Fee Structure Tooltips in Order Books
**Learning:** Inside dynamic trading screens, dense blocks displaying protocol/platform fee percentages (such as Maker/Taker fees) can be confusing without inline context. Using standard Tailwind CSS nested classes like `group-hover:block` and `group-focus-within:block` inside a `relative group` parent container allows hover-triggered absolute tooltips to render seamlessly for keyboard-only navigators who focus the triggers (`tabIndex={0}`) using Tab-key tracking, completely avoiding external UI dependencies or custom CSS.
**Action:** Design informational blocks with focus-visible triggers (`tabIndex={0}` and `focus-visible:ring-2`) and wrap tooltips inside a relative group utilizing purely Tailwind's `group-hover` and `group-focus-within` transitions.

## 2026-08-11 - Reusable Ticket Amount Presets in Event Contract Dashboards
**Learning:** For event contract interfaces featuring range sliders alongside numeric inputs for setting trade/order sizes, adding clearly styled, focusable preset buttons (`50 USD`, `250 USD`, `500 USD`, `1000 USD`) directly beneath the input element significantly speeds up user action selection and reduces typing friction. Visual state indicators (e.g. border and text highlighting) on the selected active preset help users visually trace active limits, while focus-visible ring styles maintain physical accessibility for keyboard navigators.
**Action:** Provide styled, keyboard-accessible preset selectors below numeric order-size inputs in prediction exchange interfaces to streamline simulated trading paths.

## 2026-08-14 - Interactive Search Inputs and Category Selectors in Prediction Markets
**Learning:** Interactive search inputs (such as the main search input inside `MarketList.tsx`) should feature a clickable clear (✕) button positioned on the right of the text (e.g., absolute positioning at `right-3`) when text is present, styled with explicit keyboard accessibility (`aria-label="Clear search query"` and visible focus states) to improve user navigation and efficiency. Additionally, category multi-option toggle arrays or filters must declare structural semantic attributes such as container `role="group"` and `aria-label="Filter markets by category"` alongside dynamic button properties like `aria-pressed={isActive}` to offer clear visual and screen-reader state contextual cues.
**Action:** Build search elements with an accessible, focus-visible clear button, and wrap filter select button bars in grouped accessibility roles with reactive `aria-pressed` state attributes.

## 2026-08-18 - Quick Redeem Percentage Presets in Position Management
**Learning:** In prediction market position management interfaces, users need precise controls to partially or fully redeem open positions. Providing 25%, 50%, 75%, and 100% quick preset buttons grouped inside `role="group"` with explicit calculated SUI amounts in `aria-label` attributes and dynamic `aria-pressed` selection states enables screen readers and keyboard users to execute position sizing adjustments seamlessly.
**Action:** Group position adjustment buttons in semantic `role="group"` containers with `aria-label`, calculate exact currency values in button ARIA labels, and supply reactive `aria-pressed` states with distinct active styling.

## 2026-08-21 - Accessible Quick Stake Amount Presets in Live Prediction Exchange Widgets
**Learning:** In prediction market stake widgets (such as `MarketCurveView`), requiring manual numeric typing for every stake amount increases user friction and risk of typographical errors. Adding quick stake preset buttons (such as `10 SUI`, `50 SUI`, `100 SUI`, `500 SUI`) directly beneath the stake input inside a `role="group"` container with `aria-label="Quick stake amount presets"`, dynamic `aria-pressed={isSelected}` states, and visible focus indicators (`focus-visible:ring-2`) allows users to rapidly adjust stake amounts while maintaining complete screen reader and keyboard accessibility.
**Action:** Enclose preset button groups in semantic `role="group"` containers with descriptive `aria-label` attributes, dynamic `aria-pressed` states, and high-contrast `focus-visible` ring styles.

## 2026-08-23 - Keyboard Focus Accessibility on Market Outcome Cards
**Learning:** Outcome cards that show interactive projected odds previews on hover (like `CardOutcome` in `MarketCurveView`) hide vital information from keyboard navigators unless `tabIndex={0}`, `onFocus`, and `onBlur` listeners are explicitly attached. Additionally, providing an `aria-label` detailing current and projected odds allows screen readers to announce odds changes seamlessly without requiring mouse interaction.
**Action:** Always decorate interactive preview cards with `tabIndex={0}`, `onFocus`/`onBlur` hover parity handlers, high-contrast `focus-visible` ring classes, and explicit `aria-label` text.
