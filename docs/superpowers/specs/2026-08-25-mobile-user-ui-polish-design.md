# Mobile User UI Polish Design

Date: 2026-08-25
Branch: `feat/mobile-user-ui-polish`
Scope: customer-facing mobile UI only

## 1. Objective

Make the Western Armenian Translator / Tun SaaS feel intentionally designed for phones without changing desktop/laptop presentation, product behavior, billing, authentication, translation logic, streaming, voice, plan access, or any other functionality.

The work is a mobile presentation and interaction polish pass. It must preserve every existing customer capability while improving readability, touch comfort, spacing, hierarchy, responsive layout, and small-screen navigation.

## 2. Hard constraints

1. Desktop and laptop presentation is frozen. No intentional visual change above 760px.
2. Admin UI is out of scope. Do not redesign or optimize `/admin` pages.
3. Do not delete, hide, rename, or disable customer functionality.
4. Do not change translation behavior, OpenAI model selection, streaming, Supabase behavior, WooCommerce billing, Tun SSO, legacy auth, voice, feature gates, or plan logic.
5. Do not rewrite working customer pages when a targeted responsive rule is sufficient.
6. Keep dark mode and Armenian typography working.
7. Keep all existing accessibility focus behavior and improve touch accessibility rather than replacing it.
8. Every feature must remain reachable on mobile even when its layout changes.

## 3. Research basis

The design uses current platform and accessibility guidance as a floor rather than merely targeting minimum compliance.

- WCAG 2.2 SC 2.5.8 requires pointer targets of at least 24x24 CSS px unless an exception applies. For this product, the design target will be larger because this is a touch-first mobile pass.
- WCAG 2.2 SC 1.4.10 requires content to reflow without loss of information or functionality at a width equivalent to 320 CSS px, except content that inherently requires two-dimensional layout.
- Apple Human Interface Guidelines recommend a default iPhone/iPad control size of 44x44 pt and emphasize spacing between controls.
- Apple recommends approximately 17 pt as the default iOS body text size; this design therefore avoids the current 10-12px customer copy where it carries useful information.
- Android accessibility guidance recommends 48x48dp touch targets for interactive controls.
- web.dev recommends approximately 48px touch targets with about 8px spacing between neighboring touch controls.

References:
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/reflow
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.android.com/guide/topics/ui/accessibility/apps.html
- https://web.dev/articles/accessible-tap-targets
- https://web.dev/articles/responsive-web-design-basics

## 4. Existing responsive foundation

The repository already has a useful responsive layer in `src/app/responsive-polish.css`, including:

- `--tap-target: 44px`
- mobile navigation
- 16px form controls in many shared forms
- small-screen grid collapse
- horizontal overflow protection
- safe-area padding for upgrade modals
- reduced-motion handling

The home translator also has feature-specific mobile rules in `src/components/HomeTranslatorExperience.module.css`.

The main gaps are inconsistency and feature-level density. Examples include 31-38px customer controls, 10-12px customer copy, very compact action clusters, and pages whose desktop card/grid patterns collapse but are not yet optimized for touch ergonomics.

The implementation will extend the existing system instead of replacing it.

## 5. Architecture

### 5.1 Mobile-only isolation

Use a hybrid responsive approach:

- shared customer mobile rules in a dedicated `src/app/mobile-user-polish.css`, imported after the existing responsive styles;
- feature-specific CSS Module changes only inside mobile media queries where module-scoped classes cannot be safely targeted globally;
- add a non-visual user-dashboard scoping class only if needed to prevent shared dashboard selectors from affecting admin pages.

No new style in the mobile polish layer may intentionally affect widths above 760px.

Primary breakpoints:

- `max-width: 760px`: standard phone/mobile layout
- `max-width: 480px`: narrow-phone refinement
- `max-width: 359px`: 320-359px safety refinement when required
- `any-pointer: coarse`: optional touch-target enhancement only when it cannot alter desktop pointer layouts

### 5.2 Admin isolation

Admin pages must not be included in customer-specific selectors. If a generic class is shared between customer and admin pages, either:

- scope the customer selector under a customer-only wrapper; or
- leave the generic selector unchanged and place the fix in the customer page/module.

Do not add broad `.admin-*` styling as part of this project.

## 6. Mobile design tokens

For customer-facing phone layouts:

### Spacing

- standard page gutter: 16px
- narrow 320-359px gutter: 12px
- normal card padding: 16px
- dense card padding only where needed: 14px
- standard section gap: 20-24px
- card/list gap: 12-16px
- neighboring touch controls: target at least 8px visual separation where practical

The current 10px page gutter below 600px should be increased because it makes the interface feel cramped and leaves less separation between content and device edges.

### Touch targets

- primary, destructive, submit, navigation, and repeated action buttons: minimum 48px height
- icon-only buttons: 48x48px hit area on phones
- compact chips and secondary pills: minimum 44px height when they are directly interactive
- inline text links inside prose are exempt from 44-48px treatment
- checkboxes/radios may remain visually smaller, but their label row must provide a comfortable tappable area when the control is label-bound

### Typography

- body and important descriptive copy: 16px, line-height approximately 1.5-1.65
- secondary/supporting copy: 14-15px
- metadata/badges: normally 12-13px; avoid 10px except tiny nonessential badge text where legibility is still clear
- form controls: 16px minimum
- H1: approximately 28-32px on standard phones, 26-28px on narrow phones
- H2: approximately 20-22px
- H3/card title: approximately 17-18px
- Armenian translation/input text: 17-18px where space allows, with comfortable line-height

Avoid arbitrary font shrinking just to keep desktop layouts on one line. Reflow instead.

### Shape and density

- preserve the existing visual language, colors, and brand
- use 10-14px card/control radii consistently
- avoid adding decorative complexity
- prioritize clear hierarchy and whitespace over showing more controls per row

## 7. Header and global navigation

The mobile header should remain compact and familiar while making its controls easier to tap.

Changes below 760px:

- menu toggle minimum 48x48px
- keep Tun logo readable without crowding the menu
- keep the existing direct Tun login behavior
- mobile menu items minimum 48px tall
- menu uses full available width inside the page gutter and supports safe-area bottom padding
- keep premium locks/status indicators, but prevent them from compressing labels
- preserve current menu functionality and routes
- avoid horizontal header overflow at 320px

The brand strip may truncate gracefully on narrow phones rather than wrap into an excessively tall header.

## 8. Customer dashboard navigation

The user dashboard has eight destinations, so a single wrapped multi-line nav would consume too much vertical space.

Keep the existing horizontal rail behavior but polish it for mobile:

- 44-48px tall tab/pill targets
- clear active state
- comfortable horizontal padding
- 8px gaps
- scroll snapping retained
- no visible page-level horizontal overflow
- the rail may extend to the viewport edges while its content respects mobile gutters
- do not convert it into a new functional dropdown unless testing proves the rail unusable

Admin navigation remains unchanged.

## 9. Home translator experience

The translator is the highest-priority mobile surface.

### Translator panels

- input and output panels stack vertically
- panel radius and padding remain compact but not cramped
- language selectors use the available width rather than a desktop-oriented minimum width
- input/output text stays at least 16px, preferably 17px
- reduce excessive panel minimum height enough to avoid unnecessary scrolling, but keep a comfortable writing area
- the swap control remains visually centered between source and target sections and has a 48x48px touch target

### Panel actions

Current home styles include 38px action controls. On phones:

- listen/copy/secondary action hit areas become 48px
- icon-only presentation may remain, with accessible labels preserved
- action groups wrap only when required and never overlap the language selector
- speed selector receives a comfortable minimum height and readable 16px text if it behaves as a form control

### Translate action

- the mobile Translate button becomes a strong, full-width or near-full-width primary action
- minimum 48px height
- loading/disabled states remain unchanged functionally
- do not make it fixed to the viewport, because fixed controls can conflict with the mobile keyboard

### Quick actions and learning cards

- quick actions: 2-column grid on normal phones, 1 column only where width/content requires it
- learning tools: 1 or 2 columns based on readable content width; no 10px descriptive text
- cards must remain directly tappable without tiny nested target areas
- AI role-play card becomes a clean single-column card on phones with a full-width CTA
- example chips become comfortably tappable instead of the current ~31px targets
- recent-history rows stack cleanly and avoid ellipsis where it hides useful translated text

## 10. Pricing

Below 760px:

- one pricing card per row
- 16-20px internal padding
- prices scale down without losing hierarchy
- plan feature text stays at least 14-15px
- CTA button spans the card width and is at least 48px tall
- badges cannot overlap titles/prices
- card order and checkout behavior stay exactly the same
- direct TunApp checkout URLs stay unchanged

## 11. User dashboard overview

- heading and description use mobile type scale and spacing
- general account/stat cards stack or use two columns only when each card remains comfortably readable
- daily practice card must fit the viewport without clipped actions
- streak card collapses its desktop two-column layout
- streak status should remain visible without forcing the title onto an unusable line
- streak metrics prioritize readable labels/copy rather than forcing three tiny columns
- links/buttons used as actions receive 44-48px tap affordances where they are not inline prose links

## 12. Saved Phrases, Vocabulary Decks, Flashcards, History, Practice Analytics

### Shared rules

- search/filter controls full width or stack logically
- action toolbars wrap into rows with 48px controls rather than shrinking
- cards become single-column reading surfaces
- no text smaller than necessary to preserve a desktop density
- avoid nested horizontal scrolling except for content that is truly tabular or inherently two-dimensional

### Saved Phrases

- phrase text has priority over metadata
- row/card actions move below or beside content with clear separation
- long Armenian and English strings wrap normally

### Vocabulary Decks

- deck cards and phrase rows stack cleanly
- create/edit controls become full-width where helpful
- per-item action buttons become large enough for touch
- export/import controls remain fully available

### Flashcards

- flashcard occupies the mobile content width without fixed desktop dimensions
- card text is centered/readable and can grow vertically
- rating/answer controls use 48px targets
- action groups use a 2x2 or stacked layout rather than four compressed buttons when necessary
- avoid viewport-fixed heights that break with browser chrome or landscape mode

### History

- filters stack
- translation pairs become readable mobile rows/cards
- timestamps/metadata move below primary translation text
- controls do not force source/target text to ellipsize excessively

### Practice Analytics

- summary cards collapse cleanly
- charts remain responsive within their container
- any horizontally dense visualization may scroll inside its own bounded region if reflow would destroy meaning
- legends, labels, and filters remain readable and reachable

## 13. Thesaurus and Word Breakdown

- query input and action button stack or use a comfortable responsive row
- primary input/control height 48px
- results display in a single readable column
- tags/synonyms/word chips wrap naturally and use comfortable hit areas when interactive
- avoid horizontal scrolling caused by long Armenian words
- empty/loading/error states get mobile padding and readable line lengths

## 14. Role-Play and voice feedback

Role-Play is interaction-heavy and requires stronger mobile hierarchy.

- scenario cards single column
- scenario CTA/selection targets minimum 48px
- conversation messages use most of the available width but keep clear speaker distinction
- text entry/voice controls remain easy to reach above the mobile keyboard
- voice controls receive 48px hit areas
- choice/action rows wrap or stack instead of compressing
- feedback sections become single-column
- score/result cards remain readable without tiny labels
- no existing voice or role-play behavior changes

## 15. Billing and Settings

### Billing

- current plan card single column
- plan/status information remains above billing actions
- billing/portal/upgrade actions full width when appropriate
- long provider/subscription information wraps safely

### Settings

- form fields stack
- labels appear directly above controls
- inputs/selects at least 48px high and 16px text
- checkbox/toggle rows have comfortable tap space
- save/delete account actions separated visually to reduce accidental activation
- destructive controls remain clearly distinct

## 16. Authentication and account screens

The normal header login now starts Tun SSO directly, but legacy auth screens remain.

For all user auth-related screens:

- card width fits 320px without horizontal overflow
- 16px form input text
- 48px submit/SSO controls
- clear error/status wrapping
- links have enough vertical separation
- no changes to auth logic, redirects, or provider configuration

## 17. Footer and legal pages

- footer links wrap with comfortable spacing
- legal copy keeps readable line length and 16px body size
- no multi-column legal layout on phones
- preserve all current destinations and content

## 18. Modals, overlays, safe areas, and keyboard behavior

- mobile modals fit within `dvh` and support internal scrolling
- upgrade modal may continue the current bottom-sheet style on phones
- close controls use 48px hit areas
- respect `env(safe-area-inset-*)`
- primary modal actions remain visible without being obscured by the home indicator
- avoid fixed bottom action bars on text-entry pages so the software keyboard does not cover controls
- preserve focus-visible styling
- preserve reduced-motion support

## 19. Reflow and overflow requirements

Every customer page must be usable at 320 CSS px without page-level horizontal scrolling, except a deliberately bounded region whose content genuinely requires two dimensions.

Long Armenian/English content must use wrapping, min-width fixes, or contained scrolling rather than widening the page.

No customer functionality may become unreachable due to reflow.

## 20. Implementation boundaries

Likely shared files:

- `src/app/layout.tsx` only to import the new mobile stylesheet, if a new sheet is used
- `src/app/mobile-user-polish.css` for shared customer mobile rules
- `src/app/responsive-polish.css` only where an existing mobile rule is the correct single source of truth
- `src/components/DashboardShell.tsx` only if a non-visual customer/admin scoping hook is needed

Likely feature CSS files, changed only inside mobile media rules as needed:

- `src/components/HomeTranslatorExperience.module.css`
- `src/app/dashboard/dashboard-overview.module.css`
- `src/app/dashboard/history/history.css`
- `src/app/dashboard/flashcards/flashcards-mastery.css`
- `src/app/dashboard/vocabulary-decks/vocabulary-decks-polish.css`
- `src/app/dashboard/practice-analytics/practice-analytics.module.css`
- `src/app/dashboard/settings/settings.module.css`
- `src/app/thesaurus/thesaurus-upgrades.css`
- `src/app/role-play/feedback/voice-feedback.module.css`
- customer-facing global selectors in `globals.css` only when there is no safer dedicated file

The implementation should not touch Supabase functions, database migrations, WordPress plugin code, billing logic, or translation APIs.

## 21. Testing strategy

### Automated

1. Existing lint, type/build, and project verification checks must remain green.
2. Add a focused mobile UI regression test that verifies the dedicated mobile stylesheet is imported and that key mobile invariants exist.
3. Test must guard that the mobile polish stylesheet is media-scoped and does not intentionally redefine desktop layout outside mobile queries.
4. Existing critical checks must continue to confirm `gpt-5.4` and other product invariants.

### Responsive viewport matrix

Verify customer-facing screens at minimum:

- 320x568
- 360x800
- 390x844
- 393x852
- 412x915
- 430x932
- landscape phone around 844x390 where applicable

### Functional smoke checks on mobile preview

- translate and streaming output
- language selection and swap
- copy/listen/voice controls
- direct Tun login
- pricing CTAs and checkout redirects
- dashboard navigation
- saved phrases
- vocabulary decks
- flashcards
- practice analytics
- history
- role-play and voice controls
- billing
- settings
- logout
- theme toggle
- upgrade modal

No feature may regress because of the mobile layout changes.

## 22. Acceptance criteria

The mobile pass is complete when:

1. No customer page has unintended horizontal page scrolling at 320px.
2. Primary and repeated mobile actions are 48px high; compact interactive chips are at least 44px where practical.
3. Customer form controls use at least 16px text and comfortable mobile heights.
4. Useful customer copy is no longer routinely rendered at 10-12px merely to preserve desktop density.
5. Headings, card titles, and body text follow a consistent phone scale.
6. Spacing and page gutters feel consistent across customer routes.
7. Dense desktop grids reflow into readable phone layouts.
8. The translator is comfortable to use one-handed and its controls do not overlap.
9. Dashboard and learning tools remain fully functional and readable.
10. Admin pages have no intentional redesign.
11. Desktop/laptop visual layout above 760px remains unchanged.
12. Existing CI passes and a Netlify preview is used for final mobile verification before merge.

## 23. Release approach

Implement on `feat/mobile-user-ui-polish`, open a PR, run CI and Netlify preview, verify the mobile viewport matrix and functional smoke checks, then merge only after the mobile preview is acceptable.
