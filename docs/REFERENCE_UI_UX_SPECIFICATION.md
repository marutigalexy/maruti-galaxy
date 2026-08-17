# REFERENCE UI/UX SPECIFICATION

**Status of this document:** Extracted from the actual reference project source (layouts, CSS, reusable components, page templates). Live runtime inspection was **not** performed (environment/runtime not available in this extraction pass). Visual values below are therefore taken from implemented CSS/JSX, not from screenshots.

**Evidence labels used throughout:**

- **[OBSERVED]** Directly identified from source.
- **[INFERRED]** Reasonably inferred from repeated implementation patterns.
- **[NOT DETERMINABLE]** Not enough evidence in the implementation.

**Critical constraint:** This specification describes visual language, layout, components, and interaction behavior only. It does not describe domain meaning, business rules, or backend behavior.

---

## 0. How to use this document

This specification covers the **application shell only**: the authenticated dashboard, lists, details, forms, tables, modals, and related operational UI.

It is an operational, slate/navy, compact card-and-table interface. Use it to match that visual language in another internal tool or admin console.

---

## 1. Design philosophy

### 1.1 Overall visual character — [OBSERVED]

The application UI is a **light operational console** sitting beside a **dark navy sidebar**. Content lives on a cool slate canvas (`#f8fafc`) with white cards, thin slate borders, and restrained shadows. The personality is **professional, calm, and slightly premium**—not playful, not brutalist, not dense enterprise-gray.

### 1.2 Brand personality — [OBSERVED]

- Application: confident navy (`#083574`) as the action color; near-black slate (`#0f172a`) as the authority color for titles.
- Sidebar: deep navy (`#011938`) with muted slate labels, white on hover/active, a thin blue active indicator.

### 1.3 Density — [OBSERVED]

- **Application:** medium density. Tables use 10–16px cell padding. Page chrome is tight (`10px` content padding). Filters and search sit in one compact header row.
- **Dashboard home:** slightly airier (24px KPI card padding, 24px grid gap).

### 1.4 Formal vs friendly — [OBSERVED]

Formal-professional with small friendly moments: welcome line on the dashboard, pill chips, hover lift on KPI cards (`translateY(-4px)`). Not cute. Not cold.

### 1.5 Minimal vs information-rich — [OBSERVED]

Information-rich **inside structured containers**, not a wall of widgets. Lists are tables. Details are labeled fields in cards. Dashboards use a small set of KPI cards plus two-column panels. The UI avoids filling every region with chrome.

### 1.6 Premium vs utilitarian — [OBSERVED]

Utilitarian structure with premium finish: consistent 8/10/12/14/16px radii, navy accent, soft shadows, uppercase micro-labels. Not luxury-maximal. Not raw admin.

### 1.7 Modernity — [OBSERVED]

Modern SaaS circa 2020s: sticky white topbar, collapsible dark sidebar, pill badges, icon buttons, portal modals with blur overlay, custom filter dropdowns.

### 1.8 Visual calmness — [OBSERVED]

Calm comes from:

- One canvas color (`#f8fafc`) and one card color (`#fff`).
- One border color (`#e2e8f0`) used almost everywhere.
- Muted secondary text (`#64748b`).
- Soft, not dramatic, shadows.
- No heavy gradients on application surfaces (gradients appear only on sidebar active item, some detail-page hero panels, and skeletons).

### 1.9 Content hierarchy — [OBSERVED]

```
Topbar page title (27px / 700)
  → Page-level welcome / section title (22–24px / 700–800)
    → Card / panel title (15–16px / 700–800)
      → Uppercase micro-label (11–12px / 600–700 / letter-spacing)
        → Body / table cell (13–14px / 400–500)
          → Helper / muted meta (11–13px / 500–700 / #64748b)
```

Numeric KPIs jump the hierarchy: **32px / 700** on dashboard stat cards; **18px / 700–900** on secondary metrics.

### 1.10 How clutter is avoided — [OBSERVED]

- Page title lives in the **topbar**, not repeated as a giant in-page H1 on list pages.
- Primary create action sits on the **right of the list header**, not in the topbar (except CMS “Preview” which is injected into the topbar).
- Filters and search share **one row** with the primary action.
- Tables sit in a **single white card**; nested cards are not stacked around the table.
- Tabbed areas (production masters, website CMS, accounting) wrap the whole module in **one** outer card; inner tables drop their own shadow/border.
- Destructive actions are icon-only until confirmed in a modal.
- Empty table states are a single centered muted sentence—not illustrated empty pages (except one follow-up empty state).

---

## 2. Color system

Do not invent colors. Values below are from CSS custom properties and hardcoded rules.

### 2.1 Brand colors — [OBSERVED]

| Token | Value | Where used | Importance | Contrast | Treatment |
|---|---|---|---|---|---|
| Primary (authority) | `#0f172a` | Page titles, KPI numbers, panel titles, strong text | Highest for type | Dark on `#f8fafc` / white | Solid |
| Primary action / accent | `#083574` | Buttons, focus rings, active tabs, icon-btn edit, selected chips | Highest for actions | White text on this navy | Solid |
| Accent hover | `#0c4a9e` | Primary button hover | High | White on navy | Solid |
| Sidebar active blue | `#3b82f6` | Active nav indicator bar, glow | Medium | On `#011938` | Solid + glow shadow |
| Dashboard accent token | `#3b82f6` | `--accent` on dashboard home only | Medium | — | Solid |

**[INFERRED]** `#083574` is the true application brand accent. `#3b82f6` is a supporting “system blue” used for sidebar selection and some info pills.

### 2.2 Surface colors — [OBSERVED]

| Surface | Value | Where |
|---|---|---|
| Application background | `#f8fafc` | `body` in dashboard layout; `--bg-main` |
| Sidebar background | `#011938` | `.sidebar` |
| Header / topbar background | `#ffffff` | `.topbar` |
| Card / table / panel | `#ffffff` (`--bg-card`) | Tables, KPI cards, panels, modals |
| Card (leads token, unused visually as glass) | `rgba(255,255,255,0.8)` | `--bg-card` in some page CSS files; most surfaces are opaque white |
| Input background | `#ffffff` | Filters, search, forms |
| Modal background | `#ffffff` | `.modal-portal-card` |
| Dropdown / menu background | `#ffffff` | Filter select, status menus, action menus |
| Dropdown (defined, unused in current topbar) | `#1e293b` | `.dropdown` in Topbar.css |
| Panel header strip | `#f9fafb` / `#f8fafc` | Dashboard panel head, form panel headers, table thead |
| Soft inset wells | `#f8fafc` / `#fafbfc` | Choice panels, follow-up add forms, payment sub-sections |

### 2.3 Text colors — [OBSERVED]

| Role | Value | Where |
|---|---|---|
| Primary text | `#1e293b` (`--text-main`) or `#0f172a` | Body, table cells, titles |
| Secondary / muted | `#64748b` (`--text-muted`) | Labels, helper, table headers, subtitles |
| Placeholder | `#94a3b8` | Form placeholders; search clear icon `#9ca3af` |
| Disabled text | `#9ca3af` | Pagination disabled; some empty hints |
| Inverse (sidebar default) | `#94a3b8` | Inactive nav labels |
| Inverse hover/active | `#ffffff` | Sidebar hover/active |
| Destructive text | `#ef4444` / `#dc2626` / `#b91c1c` | Logout, errors, delete |

### 2.4 Border colors — [OBSERVED]

| State | Value | Where |
|---|---|---|
| Default | `#e2e8f0` (`--border`) | Cards, tables, inputs, tabs, buttons outline |
| Alternate default | `#e5e7eb` | Search inputs, some filter borders |
| Form input default | `#dbe3ee` | Lead modal inputs |
| Hover | `#cbd5e1` / `#dbeafe` | Icon buttons, list rows, status triggers |
| Focus | `#083574` (canonical) or `#2563eb` (some older form/search rules) | Inputs, filters |
| Selected / active tab | `#083574` (2px bottom) | Tabs |
| Sidebar hairline | `rgba(255,255,255,0.05)` | Sidebar right border, logo divider |
| Disabled | Not a dedicated border token; disabled controls use opacity `0.6` | Buttons |
| Error | `#fecaca` / `#fca5a5` / `#ef4444` | Error banners and invalid inputs |

### 2.5 Semantic colors — [OBSERVED]

| Meaning | Background | Text | Border | Typical component |
|---|---|---|---|---|
| Success | `#ecfdf5` / `#dcfce7` | `#047857` / `#15803d` / `#166534` / `#065f46` | `#d1fae5` | Pills, badges, toast-success |
| Warning | `#fff7ed` / `#fef9c3` / `#fef3c7` / `#fff7ed` | `#9a3412` / `#92400e` / `#d97706` | `#fed7aa` | Pills, CMS draft, char-count warn |
| Error / danger | `#fef2f2` / `#fee2e2` | `#b91c1c` / `#991b1b` / `#dc2626` | `#fecaca` / `#fee2e2` | Alerts, delete, toast-error |
| Information | `#eff6ff` / `#e0f2fe` / `#dbeafe` | `#1d4ed8` / `#0369a1` / `#083574` | `#dbeafe` / `#bfdbfe` | Info pills, edit buttons, tags |
| Neutral / muted | `#f1f5f9` | `#334155` / `#475569` | `#e2e8f0` | Source badges, muted pills |
| Token `--success` | — | `#10b981` | — | Declared; trend-up uses this family |
| Token `--warning` | — | `#f59e0b` | — | Declared |
| Token `--danger` | — | `#ef4444` | — | Delete icons, logout |

**Urgency coloring without a badge (list dates):** [OBSERVED] due/today `#dc2626`; within 2 days `#f97316`; else default black.

### 2.6 Overlay / scrim — [OBSERVED]

| Overlay | Value | Blur |
|---|---|---|
| Shared Modal | `rgba(15, 23, 42, 0.45)` | `blur(6px)` |
| Legacy `.modal-overlay` | `rgba(0,0,0,0.45)` or `0.4` | `blur(4px)` |
| Drawer overlay | `rgba(0,0,0,0.35)` | `blur(3px)` |

### 2.7 Gradients actually used — [OBSERVED]

- Sidebar active item: `linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))`
- Skeleton shimmer: `linear-gradient(90deg, #eef2f7 0%, #f6f8fb 40%, #eef2f7 80%)`
- Follow-up empty icon circle: `linear-gradient(135deg, #e0f2fe, #f0f9ff)`
- Customer-detail hero: white → `#fafbfc` → `#f8fafc`; metrics column `#eef2f7` → `#e8edf5` → `#f1f5f9`
- Unused text-logo gradient class `.logo` (sidebar): white → `#94a3b8` (logo is an image, not this text class)

---

## 3. Typography system

### 3.1 Font families — [OBSERVED]

| Context | Declared family | Loading | What actually happens |
|---|---|---|---|
| Root layout | Geist Sans + Geist Mono via `next/font/google`, CSS variables `--font-geist-sans` / `--font-geist-mono` | Next font, `subsets: latin` | Variables are attached to `<body>` with `antialiased` |
| Dashboard `body` | `'Inter', system-ui, -apple-system, sans-serif` | **Inter is not imported anywhere** | **[INFERRED]** Falls through to `system-ui` / `-apple-system` |

**Implementation rule:** For a target application UI, use a clean geometric sans (Inter, Geist, or system-ui).

Monospace (Geist Mono) is loaded. **[NOT DETERMINABLE]** whether it is applied to any visible UI; no `font-family: var(--font-geist-mono)` usage was found in CSS reviewed.

### 3.2 Hierarchy and exact sizes — [OBSERVED]

| Role | Size | Weight | Line-height | Letter-spacing | Transform | Color |
|---|---|---|---|---|---|---|
| Topbar page title | 27px | 700 | default | `-0.01em` | none | `#0f172a` |
| Topbar subtitle | 12px | 500 | default | — | none | `#64748b` |
| Dashboard welcome title | 24px | 700 | — | — | none | `#0f172a` |
| Dashboard welcome subtitle | 16px | 400 | — | — | none | `#64748b` |
| Accounting page title | 22px | 800 | 1.2 | — | none | `#0f172a` |
| Detail in-page H2 | 22px | 700 | — | — | none | `#0f172a` |
| Modal title (legacy) | 18px | 700 | — | — | none | — |
| Panel title | 15px | 800 | — | — | none | `#0f172a` |
| Card H3 | 16px | 700 | — | — | none | `#0f172a` |
| KPI number (dashboard) | 32px | 700 | — | — | none | `#0f172a` |
| KPI / mini value | 18px | 700–900 | — | — | none | `#0f172a` |
| KPI label | 14px | 600 | — | `0.05em` | uppercase | `#64748b` |
| Section micro-title | 11–12px | 600–700 | — | `0.04em–0.08em` | uppercase | `#64748b` |
| Nav item | 16px | 500 | — | — | none | inherit |
| Nav logout | 15px | 500 | — | — | none | `#ef4444` |
| Body / table cell (leads) | 14px | 400 | — | — | none | `#1e293b` |
| Table cell (compact lists) | 13px | 400 | 1.3 | — | none | `#1e293b` |
| Table header | 12px | 600 | — | `0.05em` | uppercase | `#64748b` |
| Form label | 12px | 600 | — | `0.03em–0.04em` | uppercase | `#64748b` |
| CMS label | 13px | 600 | — | none | none | `#1e293b` |
| Button (shared `Button`) sm/md/lg | 12px / 14px / 14px | 600 (Tailwind `font-semibold`) | — | — | none | per variant |
| Search / filter | 13px (canonical filter); 14px on some search CSS | 400 | 1.35 | — | none | `#0f172a` |
| Badge / pill | 11–12px | 600–700 | 1.2 | — | capitalize (status) | semantic |
| Helper / hint | 11–12px | 400–600 | — | — | none | `#64748b` |
| User name | 14px | 600 | 1.2 | — | none | default |
| User role | 12px | 400 | 1.2 | — | none | `#64748b` |
| Pagination | 12px | 400 | — | — | none | `--text-muted` |

### 3.3 How typography creates hierarchy — [OBSERVED]

1. **Size jump + weight** for page identity (27px/700 in topbar).
2. **Uppercase + tracking + muted color** for labels and table headers—this is the project’s signature “admin micro-label.”
3. **Weight without size** for list-row titles (`14px / 800`) versus subtitles (`13px / 400 muted`).
4. **Numeric emphasis** via size (32px, 18px) and, on some detail metrics, `font-variant-numeric: tabular-nums`.

---

## 4. Spacing system

### 4.1 Recurring values — [OBSERVED]

The project does **not** expose a named spacing scale (no `--space-1` tokens). Recurring raw values:

| Value | Typical use |
|---|---|
| 4px | Badge/chip tight padding, tiny gaps, filter menu padding |
| 6px | Icon-label gaps, compact action gaps, date input padding |
| 8px | Default control gap, icon-btn gap, chip gap, filter gap |
| 10px | Page/content padding, header-actions gap, many paddings |
| 12px | Card inner gaps, form field gaps, modal header gap, list-row padding |
| 14px | Table header/cell padding (roomier tables), panel head |
| 16px | Sidebar horizontal padding, modal body padding, card padding (detail) |
| 18px | Modal header padding, some section padding |
| 20px | Modal/form large padding, detail section padding |
| 22px | Topbar horizontal padding, topbar left gap |
| 24px | Dashboard section/KPI gap, modal action margin-top |
| 32px | Dashboard welcome margin-bottom; some empty paddings |

**[INFERRED]** Informal 4px grid. Prefer 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24.

### 4.2 Structural spacing — [OBSERVED]

| Region | Value |
|---|---|
| Application content padding | `.content { padding: 10px }` plus many pages add another `10px` (effective ~20px on dashboard home because `.dashboard-container` also pads 10px) |
| List page header row margin-bottom | 15px |
| Card / table wrapper | 0 extra; padding is internal to cells |
| Form field vertical gap | 4–5px label-to-input; 12px between fields; 12px panel body stack |
| Form group gap (CMS) | 6px label-to-control; 16px grid gap |
| Table cell | 14×16px (leads/quotations) or 10×14px (users/customers/orders compact) |
| Dialog header | 16px 18px 14px |
| Dialog body | 16px 18px |
| Button padding (shared) | sm `px-3` h-8; md `px-4` h-9; lg `px-5` h-10 |
| Icon/text gap | 8px (nav 12px; buttons 4–8px / `gap-1` to `gap-2`) |
| Sidebar menu item padding | 15px (collapsed 12px) |
| Sidebar item gap | 4px |
| Production / CMS module margin | 10px around the wrapping card |

---

## 5. Border radius system

### 5.1 Hierarchy — [OBSERVED]

| Level | Radius | Components |
|---|---|---|
| Sharp | 0 | Table internals; production/CMS inner tables; some detail key-value rows |
| Slightly rounded | 6px | Status trigger on document detail, some CMS icon buttons, filter option items, quotation status menus |
| Moderately rounded | 8px | **Default control radius:** inputs, filters, search, back button, icon buttons, shared `Button` (`rounded-lg`), form fields, CMS controls |
| Comfortably rounded | 10px | Some add-buttons, filter menus, follow-up cards, CMS panels, reports tabs |
| Cards / modules | 12–16px | Table wrappers 12px (compact) or 16px (leads/quotations); sidebar nav items 12px; production/CMS outer card 12px; dashboard cards/panels 16px |
| Dialogs | 14px | `.modal-portal-card`; mobile modal `14px 14px 10px 10px` |
| Avatars / logo | 999px / 50% | User avatar 50%; sidebar logo-circle 999px (wide pill) |
| Pill | 9999px / 999px | Status badges, dashboard pills, chips, pagination buttons, skeleton lines, progress tracks |

### 5.2 Why different radii — [INFERRED]

- **8px** = interactive controls (inputs, icon buttons, app buttons).
- **12–16px** = containers that hold content (tables, cards, nav items).
- **14px** = elevated overlays (modals).
- **Pill** = status, not structure.
- Detail document pages (`quotation-detail`, order detail) intentionally use **8px cards**—flatter, more “document/admin” than dashboard KPI cards.

**Inconsistency to standardize in a target project:** table wrappers are 16px on some list pages and 12px on others; document-detail cards are 8px while list cards are 14–16px. Pick one container radius (recommended: **12px containers, 8px controls, 999px pills**) and keep it.

---

## 6. Shadow / elevation system

### 6.1 Tokens — [OBSERVED]

| Level | Value | Use |
|---|---|---|
| None | none | Page canvas, table internals, many form fields, sidebar (depth via color contrast) |
| Hairline / topbar | `0 1px 0 rgba(15,23,42,0.06), 0 12px 32px -12px rgba(15,23,42,0.08)` | Sticky topbar—**no border-bottom** |
| Low `--shadow` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` (sometimes + `0 2px 4px -2px rgb(0 0 0 / 0.1)`) | Cards, tables, KPI cards, panels |
| Medium `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Legacy modal content |
| Dropdown | `0 14px 45px rgba(15,23,42,0.14–0.18)` | Filter menus, status menus, action menus |
| Modal | `0 24px 48px -12px rgba(15,23,42,0.22), inset 0 0 0 1px rgba(255,255,255,0.04)` | Shared Modal |
| Toast (legacy) | `0 10px 25px rgba(15,23,42,0.25)` | `.toast` |
| Drawer | `-4px 0 24px rgba(0,0,0,0.12)` | Right drawer |
| Collapsed-nav tooltip | `0 10px 20px rgba(0,0,0,0.35)` | Dark tooltip |
| Sidebar logo | `0 0 14px rgba(15,23,42,0.9)` | Logo circle |
| Active nav bar glow | `0 0 15px rgba(59,130,246,0.5)` | 4px blue rail |

### 6.2 How depth is created — [OBSERVED]

Primary tools, in order:

1. **Background contrast** (navy sidebar vs light canvas vs white card).
2. **1px borders** (`#e2e8f0`) on almost every surface.
3. **Low shadows** on cards/tables—not heavy drop shadows.
4. **Blur overlays** for modals/drawers.
5. **Layering / z-index** (see tokens).
6. Occasional **translateY** on hover (KPI −4px, list-row −1px).

**Rule:** Ordinary surfaces = border + small shadow. Modals/menus = stronger shadow + overlay. Never use modal-level shadow on table cards.

---

## 7. Icon system

### 7.1 Library and style — [OBSERVED]

- **Library:** `lucide-react`.
- **Style:** outline / stroke icons (Lucide default).
- **Stroke width:** typically default **2**. Explicit `strokeWidth={2}` on modal close.
- **Fill:** not used (stroke icons). Do not mix filled Material icons into the app chrome. MUI is used for Autocomplete/Checkbox/Chip, not as the app icon set.

### 7.2 Sizes — [OBSERVED]

| Context | Size |
|---|---|
| Sidebar nav icon | `size={20}` with CSS `min-width: 22px` on svg |
| Sidebar logout | `size={18}` |
| Sidebar toggle (Menu / ChevronLeft) | CSS box 40×40, padding 8px (icon ~24px box) |
| Topbar user avatar icon | `size={18}` in 36×36 circle |
| Dashboard stat icons | `size={18}` in 34×34 rounded container |
| Dashboard panel title icons | `size={18}` |
| Primary page-action leftIcon | `size={18}` |
| Table / row action icons | `size={16}` inside 32×32 `.icon-btn` |
| CMS table icon buttons | 30×30, icon typically 16 |
| Modal close | `size={18}` in 32×32 |
| Search clear | `size={16}` |
| Filter chevron | `size={16}` |
| Back button | `size={16}` |
| Collapsed vs expanded sidebar icon | **Same 20px**; only label hides |

### 7.3 Icon-to-text spacing — [OBSERVED]

- Sidebar: **12px** gap.
- Buttons: **4–8px** (`gap-1` / `gap-1.5` / `gap-2`).
- Panel titles: **10px**.
- Back button: **6px**.

### 7.4 Where icons are used — [OBSERVED]

- Every sidebar item.
- Table row actions (edit, delete, status, duplicate, convert).
- Dashboard KPI headers and panel titles.
- Modal close (X).
- Filter chevron, search clear.
- Empty follow-up illustration (large lucide in a 120px circle).

### 7.5 Where icons should NOT be used — [INFERRED]

- Not on every form label.
- Not on table headers.
- Not as decoration beside every body paragraph.
- List pages do not icon-decorate column values except status (text pills) and actions.

### 7.6 Color hierarchy — [OBSERVED]

| State | Color |
|---|---|
| Sidebar default | inherit `#94a3b8` |
| Sidebar hover/active | `#fff` |
| Default chrome | `#64748b` |
| Primary/edit actions | `#083574` on `#eff6ff` |
| Destructive | `#ef4444` / `#dc2626` on `#fef2f2` |
| Duplicate / positive extra action | `#15803d` on `#f0fdf4` |
| Neutral extra action | `#475569` on `#f1f5f9` |
| Disabled | parent `opacity: 0.6` or `0.7` |

### 7.7 Alignment and containers — [OBSERVED]

- Vertically centered with labels (`inline-flex` / `align-items: center`).
- Table actions: `32×32`, radius 8px, centered glyph.
- Dashboard stat icon: `34×34`, radius 12px, tinted background + 1px border.
- Customer metric icon: `30×30`, radius 8px, blue gradient wash.

### 7.8 Hover / active / disabled — [OBSERVED]

- Icon buttons change **background + border + icon color**, not size.
- Status dropdown chevron rotates **180deg** when expanded (`0.15s–0.2s`).
- Disabled: `opacity` + `not-allowed`; hover styles gated with `:not(:disabled)`.

### 7.9 Sidebar specifics — [OBSERVED]

- Expanded width 250px; collapsed 80px.
- Icon remains 20px; label `display: none` when collapsed; link becomes `justify-content: center; padding: 12px`.
- Collapsed hover shows a **CSS tooltip** (`::after` from `data-tooltip`), not a library tooltip.
- Vertical item gap **4px**; item padding **15px**; radius **12px**.
- Active: left 4px blue bar (`left: -16px` expanded, `-12px` collapsed), 70% height, 15% from top, glow.

---

## 8. Sidebar / navigation

### 8.1 Geometry — [OBSERVED]

| Property | Value |
|---|---|
| Position | Left column in a flex application shell. **Not `position: fixed`.** Sibling `.main` takes remaining width. |
| Expanded width | 250px |
| Collapsed width | 80px |
| Horizontal padding | 16px expanded; 13px collapsed |
| Background | `#011938` |
| Border | `1px solid rgba(255,255,255,0.05)` on the right |
| Shadow | none |
| z-index | 1001 |
| Transition | `all 0.3s cubic-bezier(0.4, 0, 0.2, 1)` |
| Logo area height | 90px, bottom hairline `rgba(255,255,255,0.05)` |
| Logo | Image in 120×64 pill (`border-radius: 999px`), hidden when collapsed |
| Toggle | 40×40, radius 8px, color `#64748b`; hover bg `rgba(255,255,255,0.05)` + white icon. Collapsed: Menu icon to expand. Expanded: ChevronLeft to collapse. |
| Nav item height | Not a fixed height; padding 15px + 16px type ≈ ~50px |
| Icon/text gap | 12px |
| Label | 16px / 500 / nowrap |
| Logout | `margin-top: auto`, 16px bottom, radius 12px, red |

Classes `main-collapsed` / `main-expanded` are applied in JSX. **[OBSERVED]** no CSS rules for those classes; width change is entirely from sidebar width in the flex row. Main has `transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)` but **no margin-left is set**.

### 8.2 Navigation states — [OBSERVED]

| State | Visual |
|---|---|
| Default | `#94a3b8`, no background |
| Hover | White text, `background: rgba(255,255,255,0.05)`, radius 12px |
| Active | White text; blue-tinted gradient fill; `1px solid rgba(59,130,246,0.2)`; left 4px `#3b82f6` bar with glow; **hover transition disabled** (`transition: none`) |
| Focus | **[NOT DETERMINABLE]** no custom `:focus-visible` on `.menu-link` |
| Disabled | Not implemented for nav items |
| Expanded submenu | CSS exists (`.sub-menu`, slideDown 0.2s, left rail) **but current sidebar does not render submenus**. Nested destinations use **in-page tabs** instead. |
| Collapsed | Icons only; tooltip on hover (`opacity 0 → 1` in 0.12s, slight `translateX(2px)`); tooltip dark `rgba(15,23,42,0.96)`, 12px/700, radius 10px, padding 8×10 |

### 8.3 Interaction — [OBSERVED]

| User action | Result |
|---|---|
| Click nav item | Client-side `Link` navigation; matching path gets `.active`. Dashboard root matches exactly `/dashboard` only. Nested section prefixes match (e.g. `/dashboard/production/*`, `/dashboard/website-management/*`). |
| Click parent “Master” | Navigates to first masters list; any `/dashboard/production/*` stays active. |
| Click collapse | Sidebar width 250→80; labels hide; logo hides; tooltip attributes appear. |
| Click expand | Reverse. |
| Hover collapsed item | Dark tooltip to the right (`left: calc(100% + 10px)`). |
| Click Logout | Opens **small confirmation modal** (not immediate logout). Cancel = outline button; Logout = danger button with loading spinner. Escape/overlay close blocked while loading. On confirm: request then leave the application shell. |
| Keyboard focus | **[NOT DETERMINABLE]** beyond native link focus. |

### 8.4 Mobile sidebar — [OBSERVED]

**No dashboard mobile drawer.** No media query in `Sidebar.css` converts the sidebar to an overlay. On narrow viewports the 250px (or 80px) sidebar remains in the flex row and consumes horizontal space.

**[NOT DETERMINABLE]** swipe-to-close, close-on-navigation, or a hamburger that opens a drawer—these are **not implemented** for the application shell.

---

## 9. Header / topbar

### 9.1 Geometry — [OBSERVED]

| Property | Value |
|---|---|
| Height | 72px |
| Padding | 10px 22px |
| Position | `sticky; top: 0; z-index: 99` |
| Background | `#ffffff` |
| Border | none |
| Shadow | hairline + soft (see elevation) |
| Layout | flex, space-between, center |

### 9.2 Content — [OBSERVED]

**Left**

- Optional `leftAddon` slot (used for **Back** on detail pages: outline 8px-radius button, ArrowLeft 16px + label).
- Title block: `h1.topbar-title` 27px/700.
- Optional `titleAddon` (e.g. status badge on a detail page).
- Optional subtitle (`12px / 500 / #64748b`)—wired in CSS/JSX; often empty.

Title source: last URL segment humanized, with overrides; on some detail routes the title is replaced with a **record display name** after fetch. Fallback titles like “Lead Details” appear until data arrives.

**Right**

- Optional `rightAddon` (page actions—e.g. CMS “Preview Website” outline button with ExternalLink 16px).
- User cluster: 36px navy (`#083574`) circular avatar with User icon, name 14px/600, role 12px/`#64748b`. Hover: `#f1f5f9` wash, radius 14px.
- **No notification bell is rendered.** CSS for `.icon-wrapper` + blue 6px dot and a dark dropdown menu exists in `Topbar.css` but is unused by `Topbar.tsx`.

### 9.3 Breadcrumbs — [OBSERVED]

**No breadcrumb component.** Back button in the topbar left slot is the way to return from details.

### 9.4 Responsive topbar — [NOT DETERMINABLE]

No topbar-specific breakpoints. Title can wrap (`flex-wrap` on title row). User role text does not hide via CSS at a documented breakpoint.

---

## 10. Page layout

### 10.1 Application shell — [OBSERVED]

```
.layout (flex, min-height 100vh, max-height 100vh, overflow hidden)
  Sidebar (250/80)
  .main (flex column, overflow-y auto)
    Topbar (sticky 72px)
    .content (padding 10px) → page
```

Main scrollbar: 6px wide, thumb `rgba(255,255,255,0.1)` (low-contrast on a light canvas).

### 10.2 Standard list page architecture — [OBSERVED]

```
Page container (padding 10px)
  Header row (space-between, margin-bottom 15px)
    Left: Search + FilterSelect(s) (gap 8px)
    Right: Primary Button (icon + label)
  DataTable in .table-wrapper
    thead
    tbody (spinner row | empty row | data rows)
    pagination footer if needed
  Modals portaled to document.body
```

There is **no in-page H1** on list pages; the topbar is the title.

### 10.3 Width, alignment, density — [OBSERVED]

- **No max-width** on application pages; content is full remaining width.
- Horizontal alignment: left for data, right for primary actions and user cluster.
- Vertical rhythm: 10–16px, not 32px stacks (except dashboard sections at 32px).
- Grid: dashboard KPI `auto-fit / minmax(240px, 1fr)` gap 24px; dashboard panels 2-col gap 18px collapsing at 980px.

---

## 11. Dashboard

### 11.1 Structure — [OBSERVED]

1. Welcome block (title + one-line subtitle), margin-bottom 32px.
2. Optional error banner (red, radius 14px).
3. **KPI grid:** `repeat(auto-fit, minmax(240px, 1fr))`, gap 24px, margin-bottom 32px.
4. **Two-column panel grid** (1 col ≤980px), gap 18px.

### 11.2 KPI cards — [OBSERVED]

- White, 1px `#e2e8f0`, radius **16px**, padding **24px**, low shadow.
- Layout: column, gap 8px, left aligned.
- Head: 34×34 tinted icon + uppercase 14px/600 label.
- Value: **32px / 700**.
- Supporting: pill row (gap 8px, wrap) under the number.
- Hover: `translateY(-4px)` over 0.2s.
- Entire card is a **button**; click **navigates** to the related list.

Icon tints: blue `#eff6ff/#1d4ed8`; indigo `#eef2ff/#4338ca`; green `#ecfdf5/#047857`; slate `#f1f5f9/#0f172a`.

### 11.3 Panels — [OBSERVED]

- Radius 16px, border, low shadow, overflow hidden.
- Head: `#f9fafb`, padding 14×16, space-between, 1px bottom border.
- Title: icon 18px + 15px/800.
- “View …” control: white, 1px border, radius 10px, padding 8×10, 13px/700, arrow 16px. Hover `#f8fafc`.
- Body: 12×16×14.
- Rows: bordered mini-cards, radius 14px, padding 12px, space-between. Hover: `#f8fafc`, border `#dbeafe`, `translateY(-1px)`.
- Empty: 14px muted, 18px vertical padding, sentence only.
- Footer chips: pill, 12px/800, padding 6×10.

### 11.4 Secondary metrics / quick links — [OBSERVED]

- 2×2 mini grid, 14px radius, 12px padding; uppercase 12px/900 label; 18px/900 value.
- Quick links: 2-col, 14px radius, 12px padding, 900 weight, arrow 16px.

### 11.5 Charts — [OBSERVED]

Dashboard home has **no chart library**. Reports page uses **CSS bar charts**: 10px track, pill fill, green/red translucent fills, label + value.

### 11.6 Loading — [OBSERVED]

Full dashboard replaced by skeleton: two pill shimmer lines + 2×2 skeleton cards (120px tall, radius 16px), shimmer 1.2s.

### 11.7 Prioritization — [INFERRED]

Number size first, semantic pills second, then actionable lists. Navigation is the point of the dashboard: every KPI and row is clickable.

---

## 12. Cards

### 12.1 Default card — [OBSERVED]

| Property | Typical value |
|---|---|
| Background | `#fff` |
| Border | `1px solid #e2e8f0` |
| Radius | 12–16px (dashboard 16; lists 12–16; document detail 8; info cards 14) |
| Shadow | `--shadow` |
| Padding | 12–24px depending on type |

### 12.2 Variants — [OBSERVED]

| Type | Appearance | Interaction |
|---|---|---|
| KPI card | 24px pad, 16px radius, icon + label + big number + pills | Click → navigate; hover lift |
| Information card | 16px pad, 14px radius, header with title + icon actions | Actions in header |
| List-row card | 12px pad, 14px radius, title/sub + right meta | Click → navigate |
| Form panel (inside modal) | 10px radius, header strip `#f8fafc`, 14–16px body | Static |
| Summary / metric tile | 8–10px radius on document pages; 14px on accounting | Mostly static |
| CMS panel | 10px radius, 20px pad | Forms |
| Interactive media card (CMS portfolio) | Thumb 4:3, radius 8px, hover overlay + action menu | Menu / drag |

### 12.3 When NOT to use a card — [OBSERVED]

- List **header** (search + filters + primary button) is **not** in a card.
- Topbar is not a card.
- Tab labels sit on the module chrome, not in their own cards.
- Inside a tabbed module (production, website CMS), the **outer** wrapper is the card; the inner table has **no** extra card/shadow.
- Dashboard welcome text is not carded.

---

## 13. Modals / dialogs

### 13.1 Shared `Modal` component — [OBSERVED]

| Property | Value |
|---|---|
| Position | Centered flex on viewport (`align-items: center; justify-content: center`) |
| Overlay | `rgba(15,23,42,0.45)` + `blur(6px)` |
| Padding around card | 16px (10px ≤640px) |
| Width | `width: 100%` with max-width from size map |
| Size map | sm 360, md 460, md2 560, lg 640, xl 768, 2xl 896, 3xl 1024, 4xl 1152, 5xl 1280, 6xl 1400, 7xl 1536 |
| CMS widths | confirm 400, compact 520, form/hero 720, wide 800, preview 520, previewMedia 480 |
| Max height | `min(92vh, 880px)`; mobile 94vh |
| Radius | 14px; mobile `14px 14px 10px 10px` |
| Background | `#fff` + 1px `#e2e8f0` |
| Shadow | High elevation (see §6) |
| Header | 16×18×14, bottom border `#eef2f6`, title left, close right |
| Close | 32×32, radius 8px, X 18px `#94a3b8`; hover `#f8fafc` + border `#e2e8f0` + `#475569` |
| Body | 16×18, scrollable (`overflow-y: auto`) |
| Footer | Optional slot; often `modal-actions` flex end, gap 12px |
| z-index | 1100 (above sidebar 1001) |
| Portal | `document.body` |

### 13.2 Interaction — [OBSERVED]

| Behavior | Implementation |
|---|---|
| Open | Conditional render when `open === true` |
| Close overlay click | Overlay `onClick={onClose}`; card `stopPropagation` |
| Escape | `keydown` Escape → `onClose` |
| Body scroll lock | `document.body.style.overflow = hidden` while open |
| Focus trap | **Not implemented** |
| Initial focus | **Not implemented** |
| Loading | Footer primary `Button loading`; close may be blocked (`if (loading) return`) |
| Validation errors | Inline red banner inside body (`#fef2f2`, 13px, radius 8px), not a toast-only pattern |
| Success | Typically close modal + toast via `alert()` bridge or `react-hot-toast` |
| Confirm pattern | Title question; 14px muted body; two equal-width buttons (outline Cancel, danger Confirm) |

### 13.3 Responsive — [OBSERVED]

≤640px: overlay padding 10px, **align to bottom** (`flex-end`), slightly flattened bottom radius. This is a bottom-sheet hint, not a full drawer.

Large create/edit forms (e.g. two-column lead form) collapse to one column ≤960px; footer stacks full-width buttons.

### 13.4 Legacy overlays — [OBSERVED]

Some CSS files still define `.modal-overlay` with fadeIn 0.2s and slideUp 0.2s. Runtime create/edit flows use the shared portal `Modal`.

---

## 14. Drawers

### 14.1 Follow-up drawer — [OBSERVED]

| Property | Value |
|---|---|
| Direction | Right edge |
| Width | 420px, `max-width: 95vw` |
| Height | 100vh |
| Overlay | `rgba(0,0,0,0.35)` + `blur(3px)`, z-index 900 |
| Panel z-index | 901 |
| Animation | `slideLeft` 0.25s ease-out from `translateX(100%)` + opacity 0 |
| Header | 18×20, `#f8fafc`, 15px/700 title, 12px muted subtitle, text close “×” 20px |
| Add form | 14×20, `#fafbfc`, fields then right-aligned small primary |
| List | flex 1, scroll, 14×20, 10px gap |
| Cards | 10px radius, 12×14 pad; delete icon appears on card hover (`opacity 0 → 1`) |

**[INFERRED]** Overlay click likely closes (pattern matches other overlays). Exact swipe-to-close: **not implemented**.

On lead **detail**, follow-ups are an **in-page column**, not only a drawer.

---

## 15. Forms

### 15.1 Application form anatomy — [OBSERVED]

- **Label position:** above the control.
- **Label type:** 12px / 600 / uppercase / `#64748b` / tracking ~0.03–0.04em (CMS labels are 13px/600, **not** uppercase).
- **Required:** red `*` (`#dc2626`) immediately after label.
- **Control height:** canonical **38px** (`--filter-control-height`; lead inputs `min-height: 38px`; MUI autocomplete minHeight 38). Shared Button heights 32/36/40 are **buttons**, not inputs.
- **Radius:** 8px (canonical); 10px on some older lead-form rules.
- **Border:** `#e2e8f0` / `#dbe3ee` / `#e5e7eb`.
- **Background:** `#fff`.
- **Placeholder:** `#94a3b8`.
- **Focus:** `outline: none`; border `#083574`; ring `0 0 0 2px` or `3px rgba(8,53,116,0.10–0.15)`. Some older rules still use `#2563eb`.
- **Error:** group/input border `#fca5a5`, fill `#fff5f5`; focus ring red. Banner `#fef2f2` / `#b91c1c`.
- **Disabled:** Button `opacity: 0.6`; submit buttons `disabled` during loading.
- **Helper:** 11–12px `#64748b` under field.
- **Field spacing:** 12px; CMS grid 16px.

### 15.2 Control types — [OBSERVED]

| Control | Treatment |
|---|---|
| Text / email / number | Native `<input>`, 13–14px, 8px radius, 9–12px or 11–14px padding |
| Select | Native or custom `FilterSelect`; chevron SVG 16px at right 10px; `appearance: none` |
| Combobox / multi-select | **MUI Autocomplete** + Chip + Checkbox; outline restyled to 8px / 38px / navy focus. Chips for selected services |
| Date | Native `type="date"` |
| Search | `SearchInput`: max-width 280px component default; many pages CSS `width: 320px`; clear X when non-empty |
| Textarea | min-height 64–100px; vertical resize (sometimes `none` in compact follow-up add) |
| Checkbox | MUI checkbox inside Autocomplete; choice chips use `aria-pressed` |
| Radio | **[NOT DETERMINABLE]** as a distinct styled radio system |
| Switch / toggle | CMS `.cms-toggle-row` (label + control, 13px, gap 8px). Visual switch styling **not fully tokenized** beyond the row |
| File / image | CMS upload trigger (38px button) + 160×100 preview radius 8px; 24px circular dark clear button |
| Choice chips | Pill; unselected white + `#dbe3ee`; selected filled `#083574` white text + navy shadow |

### 15.3 Complex form layout — [OBSERVED]

Lead create/edit modal: **two-column panel grid** (`1fr / 1.1fr`), each panel with icon-in-30px-blue-well + uppercase title. Inner grids 1–4 columns collapsing to 1 at 960px. Footer: hint left, Cancel + Save right.

Payment modal: 3-column row collapsing at 900px; nested well for related records.

---

## 16. Button system

### 16.1 Shared `Button` (canonical) — [OBSERVED]

Base: `inline-flex`, `rounded-lg` (8px), `font-semibold`, `transition-colors`, `focus:ring-2 focus:ring-offset-2 focus:ring-offset-white`, `disabled:opacity-60 disabled:cursor-not-allowed`, `cursor-pointer`.

| Variant | Default | Hover | Notes |
|---|---|---|---|
| **primary** | bg `#083574` text white, no border | `#0c4a9e` | Default variant |
| **outline** | white, text `#083574`, border `#e2e8f0` | bg `#eff6ff` | Cancel, secondary, Preview |
| **danger** | bg `#dc2626` text white | `#b91c1c` | Delete / logout confirm |
| **ghost** | transparent, text `#0f172a` | bg `#f1f5f9` | Rare |

| Size | Height | Padding | Type | Gap |
|---|---|---|---|---|
| sm | 32px (`h-8`) | `px-3` | 12px | 4px |
| md | 36px (`h-9`) | `px-4` | 14px | 6px |
| lg | 40px (`h-10`) | `px-5` | 14px | 8px |

- **Loading:** spinner 14px, 2px currentColor ring, `0.7s linear`, margin-right 6px; leftIcon hidden; button disabled.
- **Focus ring color:** Tailwind `focus:ring-2` without an explicit color class—**[INFERRED]** browser/Tailwind default (often blue). Not the navy token.
- **fullWidth:** `w-full`.
- Left icon sits in `-ml-1` wrapper.

### 16.2 Other button classes still in CSS — [OBSERVED]

| Class | Look | Note |
|---|---|---|
| `.add-btn` | 12×24 pad, radius 10px, `#083574`, 600, gap 8px, hover `#0c4a9e` | Many pages now use shared `Button` instead |
| `.back-btn` | 8×12, radius 8px, white, border `#e2e8f0`, hover `#f8fafc` | Topbar back |
| `.icon-btn` | 32×32, radius 8px | Table actions |
| `.secondary-btn` / `.export-btn` | 8×14, radius 8px, white border, 13px/500, hover `#f3f4f6` | Accounting |
| `.panel-link` | radius 10px, 13px/700 | Dashboard |

### 16.3 Icon buttons — [OBSERVED]

32×32 (CMS 30×30), radius 8px (CMS 6px). Semantic backgrounds:

| Action | Background | Color |
|---|---|---|
| Edit | `#eff6ff` | `#083574` |
| Delete | `#fef2f2` | `#ef4444` / `#dc2626` |
| Duplicate | `#f0fdf4` | `#15803d` |
| Status / convert | `#eff6ff` | `#083574` |
| Log / history | `#f1f5f9` + border | `#475569` (active indigo) |
| Default CMS | white + border | `#64748b` → navy on hover |

Labeled icon buttons (`.has-label`): auto width, pad 6×10, gap 6px, 12px/600.

### 16.4 Hierarchy — [INFERRED]

1. One **primary** per view (create / save / confirm).
2. **Outline** for cancel, preview, secondary.
3. **Danger** only in confirmations or destructive primary.
4. **Icon buttons** for row actions (never a full “Delete” primary in the table).
5. **Ghost** for low-emphasis.

Do not place two primary filled navy buttons in the same header.

---

## 17. Table system

### 17.1 Container — [OBSERVED]

- `.table-wrapper`: white, 1px border, radius **12px or 16px**, `--shadow`, `overflow-x: auto`.
- Nested in production/CMS card: **no** wrapper shadow/border/radius; dashed row dividers instead.

### 17.2 Header / rows — [OBSERVED]

| Part | Value |
|---|---|
| thead | `#f8fafc`, bottom border (production: white thead + 2px solid bottom) |
| th | 14×16 pad, 12px/600, `#64748b`, uppercase, tracking 0.05em, nowrap, **left** |
| td | 14×16 (roomy) or 10×14 (compact), 13–14px, `#1e293b`, bottom 1px `#e2e8f0` |
| last row | no bottom border |
| hover | `#f1f5f9` |
| selected / expanded parent | `#f8fbff` / `#eef4fc` family |
| clickable row | `cursor: pointer`; click navigates to detail (row handlers `stopPropagation` on action buttons) |
| empty | `.no-data` centered, 32–48px pad, muted sentence (`"No records found."` default) |
| loading | one row, colspan all, 20px spinner (`border 2px #e5e7eb`, top `#083574`, 0.7s) |

### 17.3 Actions column — [OBSERVED]

- Centered, nowrap, `gap: 8px`, `inline-flex`.
- Native `title` tooltips on icon buttons (“Edit …”).
- Status change often via **icon that opens a fixed-position menu**, then a **confirm modal**.

### 17.4 Sorting — [OBSERVED]

Some headers show a `ChevronsUpDown` affordance. Treat as **presentational sort indicator** where implemented. Not a universal sortable-table system.

### 17.5 Pagination — [OBSERVED]

Shown only when total > pageSize (default **10**). Footer: space-between, 12×16 pad, 12px muted.

- Left: `Showing {from}-{to} of {total}`
- Right: pill Prev / `Page n of m` / pill Next
- Pill buttons: pad 6×10, radius 9999, 1px border, white; disabled `#f9fafb` text `#9ca3af`

Supports client slice or server `page` + `totalCount`.

### 17.6 Alignment — [OBSERVED]

- Text columns: **left**.
- Actions: **center**.
- Numeric money: **right** on quotation line tables and PDF; `tabular-nums` on some customer metrics and PDF amounts.
- Status: left, as pills.

### 17.7 Responsive — [OBSERVED]

Horizontal scroll inside `.table-wrapper`. No card-stack transformation of rows on mobile was found for primary list tables.

---

## 18. Badges / status indicators

### 18.1 Shape — [OBSERVED]

- Status: **pill** (`border-radius: 9999px`), pad 4×10 or 4×12, 12px/600, `text-transform: capitalize`.
- Source / secondary: **6px radius**, 11px/500, `#f1f5f9` / muted.
- Dashboard pills: pad 4×10, 12px/700, 1px semantic border.
- CMS: pad 2×8, 11px/600, pill.
- Document status trigger: **6px radius**, not a pill (looks like a compact button).

### 18.2 Semantic pairings (examples) — [OBSERVED]

| Visual intent | Background | Text |
|---|---|---|
| New / info | `#e0f2fe` | `#0369a1` |
| In progress / contacted | `#fef9c3` | `#92400e` |
| Success / qualified / approved / active | `#dcfce7` | `#15803d` / `#166534` |
| Lost / rejected / inactive / error | `#fee2e2` | `#b91c1c` |
| Special / converted | `#ede9fe` | `#7c3aed` |
| Draft (CMS) | `#fef3c7` | `#92400e` |
| Published | `#dcfce7` | `#166534` |
| Archived / muted | `#f1f5f9` | `#64748b` |
| Sent | `#dbeafe` | `#1d4ed8` |

### 18.3 Status without relying only on color — [OBSERVED]

- **Text label** is always present (capitalize words).
- Date urgency uses **color + still-readable date string**.
- Confirm dialogs repeat the from/to labels.
- CMS published count uses a **segmented progress bar** (`role="progressbar"`) plus numeric `n / max`.
- **[INFERRED]** icons are not required inside status pills (usually text-only).

---

## 19. Dropdowns / popovers

### 19.1 Custom `FilterSelect` — [OBSERVED]

- Trigger: same height 38px, look as native filter (border, 8px radius, 13px).
- Chevron 16px `#64748b`, rotates 180deg when open (0.15s).
- Menu: **portal to `document.body`**, `position: fixed`, z-index **1300**, white, 1px `#e2e8f0`, radius **10px**, shadow `0 14px 45px rgba(15,23,42,0.14)`, padding 4px, max-height 280px, scroll.
- Flip above if not enough space; clamp to viewport with 8px padding; gap 6px.
- Option: 8×12 pad, radius 6px, 13px; hover `#f1f5f9`; selected **font-weight 500** + navy check `✓` 14px wide.
- Close: outside mousedown, Escape, select option.
- ARIA: `listbox` / `option` / `aria-expanded` / `aria-selected`.

### 19.2 Status / action menus — [OBSERVED]

Same family: white, 12px radius, 6px padding, option 8×12 radius 8px, hover `#f1f5f9`, active often green or navy wash. Portfolio action menu: 190px min, z-index 1200, destructive items styled red. Trigger often **MoreVertical 16px**.

### 19.3 Keyboard — [OBSERVED]

Escape closes. Arrow-key highlighting **not implemented** on FilterSelect (pointer + click). Focus remains on trigger.

### 19.4 Animation — [OBSERVED]

Filter menus: **no enter animation** (appear positioned). Sidebar tooltip 0.12s. Defined but unused topbar `.dropdown`: `slideDown` 0.18s from `translateY(-8px)`.

---

## 20. Tooltips

| Aspect | Observed |
|---|---|
| Library tooltip | **None** |
| Collapsed sidebar | CSS `::after` tooltip; **no delay**; appears on hover; right side; 12px/700 white on near-black; radius 10px |
| Icon actions | Native `title="…"` (browser default delay/position) |
| Mobile | Sidebar tooltips would be hover-only—**poor for touch** [INFERRED] |

---

## 21. Search and filters

### 21.1 Placement — [OBSERVED]

List pages: **left cluster** of search + filters; **right** primary action. Accounting: filters in a **12px-padded bordered panel**, 4-column grid, plus export/secondary on the right. Reports: tabs then content.

### 21.2 Behavior — [OBSERVED]

- Search: controlled input; **300ms debounce** before querying (`useDebounce`).
- Clear: X button, `aria-label="Clear search"`, color `#9ca3af`.
- Filters: `FilterSelect`; changing value immediately updates list (and often resets page).
- Persistence: some lists write filter state to `sessionStorage` so returning from detail restores search/filters.
- Active filters: the select **shows the chosen label** (no chip row of active filters, no explicit “Clear all” control on the standard list header).
- Loading: **table body replaced** by spinner row (not a skeleton overlay).
- Empty: table empty message.
- Height: filters and search intended to share **38px**. Some page CSS still sets search to padding-based ~40px / 14px type—normalize to 38px/13px in a target system.

---

## 22. Notifications / toasts

### 22.1 `react-hot-toast` (canonical) — [OBSERVED]

| Property | Value |
|---|---|
| Position | **bottom-right** |
| Font | 15px / 600 |
| Padding | 14px 18px |
| Radius | 12px |
| Min width | 260px |
| Duration | library default **[NOT DETERMINABLE in project code]** |
| Success / error | library defaults unless a call specifies otherwise |

`AlertToasterBridge` monkey-patches `window.alert`: if message matches `/success/i` → `toast.success`, else `toast.error`.

### 22.2 Legacy `.toast` CSS — [OBSERVED]

Fixed `right: 24px; bottom: 24px`; pill radius 9999; 14px/500; pad 10×16; gap 8px; z-index 1200.

- Success: `#ecfdf5` / `#065f46` / border `#22c55e33`
- Error: `#fef2f2` / `#b91c1c` / border `#ef444433`

**[INFERRED]** prefer hot-toast options from root layout for new work.

---

## 23. Loading states

| Context | Treatment | Replaces content? |
|---|---|---|
| Dashboard page | Shimmer skeletons | Yes, full page |
| Table | 20px spinner in a single row | Yes, body rows |
| Button | 14px CSS spinner + disabled | Label remains; icon swapped for spinner |
| Modal submit | Button loading; close blocked | Form stays visible |
| Reports | Spinner + 13px/700 muted text | Cell/block |
| Inline | Occasional opacity on controls | Alongside |

Skeleton: 12px-tall pills, radius 999px, gradient shimmer 1.2s; cards 120px / 16px radius.

**No full-app top progress bar. No overlay spinner on the shell.**

---

## 24. Empty states

| Context | Visual |
|---|---|
| Tables | Centered muted sentence, 32–48px padding, **no illustration** |
| Dashboard panels | `.empty` 14px muted, 18px pad |
| Follow-up empty (detail) | **Rich:** 120px gradient circle, lucide icon `#063354`, 20px/700 title, 15px muted description max-width 250px, 60px pad |
| Payment nested empty | 20px pad, centered |
| Reports | muted 14px pad text |

**Pattern to copy:** tables stay humble; a primary working area may use icon + title + description. CTA in empty states is **not** standard on tables (the page header already has Add).

---

## 25. Error states

| Type | Visual | Action |
|---|---|---|
| Inline field | Red border + optional hint | Stay on form |
| Form banner | `#fef2f2`, `#fecaca` border, `#b91c1c`, 13px/500, radius 8px | Correct and resubmit |
| Page/dashboard | `.dashboard-alert` red, 14px radius, 800 weight | Banner at top |
| API failure on action | `alert()` → toast error | Retry by repeating the action |
| Empty vs error | Empty = no rows; error = red banner or toast. They are distinct. | |

No dedicated full-page error illustration was found.

---

## 26. Click / interaction behavior

Generic interaction map (no domain meaning):

### 26.1 Primary page action (e.g. “Add …”)

- **Click:** opens a **centered modal form** (size from sm to ~7xl depending on form).
- **Hover:** navy darkens (`#0c4a9e`).
- **Focus:** ring-2 offset white.
- **Active/pressed:** no extra scale on app `Button` (color only).
- **Loading:** spinner in button; modal remains; cannot dismiss if guarded.
- **Success:** modal closes; list refreshes; toast may appear.
- **Error:** modal stays; banner or toast.

### 26.2 Table row

- **Click:** navigates to **detail page**; cursor pointer.
- **Hover:** row background `#f1f5f9`.
- Action icon click: `stopPropagation`; opens modal / menu / confirm—**does not navigate**.

### 26.3 KPI card / dashboard list row

- **Click:** `router.push` to a list or detail.
- **Hover:** lift + (rows) blue-tinted border.

### 26.4 Icon edit / delete

- Edit → modal prefilled.
- Delete → **confirm modal** (outline Cancel, danger Delete).
- Delete loading → danger button spinner.

### 26.5 Status control

- **Click:** dropdown of statuses.
- Choosing a value often opens a **confirm modal** before commit.
- Some values open a **different modal form** instead of a simple confirm.

### 26.6 Filter / search

- Type → debounce 300ms → table reloads (spinner).
- Change filter → immediate reload.
- Clear search → empty query.

### 26.7 Tabs

- **Click:** route change (Link) or local state.
- **Hover:** label → `#083574`.
- **Active:** navy label + 2px navy underline (module tabs) **or** white pill + shadow (segmented lead tabs).

### 26.8 Sidebar

See §8.3.

### 26.9 Modal overlay / Escape

Closes unless loading guard is on.

### 26.10 Back button

`router` back or to parent list. Visual: outline control, not a text link.

---

## 27. Microinteractions

| Interaction | Duration | Easing | Motion |
|---|---|---|---|
| Sidebar width | 0.3s | `cubic-bezier(0.4, 0, 0.2, 1)` | width/padding |
| Nav hover color/bg | 0.2s | ease | color, background |
| Collapsed tooltip | 0.12s | ease | opacity + 2px x |
| Submenu (CSS unused) | 0.2s | ease-out | opacity + `translateY(-4px)` |
| Toggle hover | 0.2s | — | color/bg |
| Topbar icons/user | 0.2s | — | bg/color |
| KPI hover | 0.2s | — | `translateY(-4px)` |
| List-row hover | 0.15s | — | bg, border, `translateY(-1px)` |
| Button colors | Tailwind `transition-colors` | — | no translate on shared Button |
| Modal overlay (legacy) | 0.2s | ease-out | fadeIn |
| Modal card (legacy) | 0.2s | ease-out | slideUp 12px |
| Drawer | 0.25s | ease-out | `translateX(100% → 0)` |
| Spinner | 0.7s | linear | rotate 360 |
| Shimmer | 1.2s | infinite | background-position |
| Filter chevron | 0.15s | ease | rotate 180 |
| Focus rings | 0.15–0.2s | ease | border + box-shadow |

**Do not add** bounce, large scale pops, or staggered page-load animations. The application is quiet.

---

## 28. Responsive design system

### 28.1 Breakpoints actually used — [OBSERVED]

There is **no Tailwind theme breakpoint file**. Media queries in CSS:

| Width | Use |
|---|---|
| 560px | Customer info pairs stack; some quotation UI |
| 600px | Accounting |
| 640px | Shared Modal bottom-align |
| 720px | Quotations |
| 768px | CMS form grid; quotation detail padding |
| 840px | Customer hero stacks |
| 900px | Accounting, CMS, payment modal, quotation forms |
| 960–980px | Lead form; dashboard grid; lead detail 2-col |
| 1024px | Quotation detail grid |
| 1100px | Quotations |

### 28.2 Application behavior by viewport — [OBSERVED + INFERRED]

**Large desktop / desktop**

- Sidebar + topbar + full tables.
- Dashboard 4 KPI auto-fit, 2-col panels.
- Detail: 2-col info grids.

**Tablet (~768–980px)**

- Dashboard panels → 1 column.
- Detail 2-col → 1 column.
- Tab strips **horizontal scroll**, scrollbar hidden.
- Tables **horizontal scroll**.
- Sidebar **still present** (250 or 80).

**Mobile**

- Shared modal becomes bottom-anchored.
- Forms single column; modal footers stack, buttons `flex: 1`.
- Application **does not** switch to a drawer navigation.

### 28.3 Touch targets — [INFERRED]

Icon buttons 32×32 (below WCAG 44×44). Prefer 32 minimum as this project does; 44 if the target must be stricter.

---

## 29. Accessibility

### 29.1 What exists — [OBSERVED]

- Root `<html lang="en">`.
- Modal: `role="dialog"` `aria-modal="true"`; close `aria-label="Close"`.
- FilterSelect: listbox pattern, `aria-expanded`, `aria-selected`.
- Search clear: `aria-label`.
- CMS progressbar ARIA valuemin/max/now.
- Action menus: `aria-haspopup`, `aria-expanded`, `aria-controls`.
- `antialiased` on body.
- Focus rings on shared Button and navy input rings.

### 29.2 Gaps — [OBSERVED]

- **No focus trap** in Modal.
- **No obvious `:focus-visible` ring** on sidebar links or many icon buttons.
- Icon-only table actions often rely on `title=`, not `aria-label`.
- 32px icon buttons are small for touch.
- Dashboard sidebar has **no skip link** found.
- Collapsed sidebar tooltips are **hover-only**.
- Contrast of muted `#64748b` on `#f8fafc` is a typical slate pair; **[NOT DETERMINABLE]** without a contrast audit.
- `cz-shortcut-listen="true"` is hardcoded on `<body>` in root layout (extension artifact)—do not copy.

---

## 30. Print / export UI

### 30.1 Document preview / PDF layout — [OBSERVED]

`QuotationInvoicePdf.css` describes an **A4** sheet:

| Property | Value |
|---|---|
| Page | 210mm × 297mm |
| Padding | 28px 32px |
| Color | `#0f172a` |
| Header | 2-col grid, **2px solid `#0f172a`** bottom rule |
| Company name | 26px / 700 |
| Tagline | 11px `#64748b` |
| Doc title | 20px / 800 / letter-spacing 0.18em |
| Meta | 11px, labels muted right-aligned, values 600 |
| Items table | th 10px uppercase, 2px `#cbd5e1` bottom; td 13px, 14×10, `#e5e7eb` row rules |
| Amounts | right + `tabular-nums` |

A React-PDF path (`@react-pdf/renderer`) also exists for tax documents. Treat print as: **high-contrast black/slate, strong top rule, small meta type, right-aligned numbers, generous cell padding, no navy fills, no cards, no shadows.**

On-screen document pages (quotation/order detail) echo this: 8px sections, uppercase 12px section titles with a hairline, 2-col grids, a metrics strip.

---

## 31. Visual consistency rules

Extracted from what the project **mostly** does (and where it drifts):

1. **Never introduce a second application accent.** Application actions are `#083574`.
2. **Never mix icon libraries** in chrome. Lucide outline only.
3. **Never mix icon sizes in the same row.** Table actions = 16px in 32px hits.
4. **Controls share 38px height** (filters, search, text inputs). Buttons: 32 / 36 / 40 only.
5. **Radius:** 8px controls, 12–16px containers, 14px modals, pills for status.
6. **Borders over heavy shadows** for page surfaces.
7. **Do not card the page header** (search/filter/action row).
8. **Do not double-card** tables inside an already-carded tab module.
9. **Page title belongs in the topbar**, not duplicated as a giant in-page heading on lists.
10. **One primary button per header.**
11. **Destructive actions confirm in a modal.**
12. **Uppercase micro-labels** for admin metadata; sentence case for body.
13. **Status is a pill with a word**, not a color-only dot.
14. **Row click = navigate; icon click = mutate.**
15. **Do not add a notification bell** unless implementing it; unused CSS is not part of the live language.
16. **Do not implement sidebar submenus** if in-page tabs already group children—this project chose tabs.
17. **Avoid arbitrary radii** (the live code already has 6/8/10/12/14/16—standardize rather than adding 7 or 13).
18. **Date format in UI:** `DD/MM/YYYY`.
19. **Money format in UI:** `₹` + `en-IN` grouping where currency is shown.

---

## 32. Component inventory

Reusable pieces another project should recreate. Dimensions/states are summarized; see sections above for full tokens.

### ApplicationShell
- **Purpose:** Flex viewport: sidebar + scrollable main.
- **Appearance:** `min/max-height 100vh`, overflow hidden on shell, main scrolls.
- **Responsive:** No drawer; sidebar always in-flow.
- **A11y:** No skip-link observed.

### Sidebar
- **Purpose:** Primary navigation + collapse + logout.
- **Dimensions:** 250 / 80 × full height; items ~15px pad; icons 20px.
- **States:** default / hover / active / collapsed tooltip.
- **Interaction:** Link navigate; collapse toggle; logout opens confirm modal.
- **A11y:** Native links; tooltips CSS-only when collapsed.

### Topbar
- **Purpose:** Sticky context: title, optional back/actions, user chip.
- **Dimensions:** 72px height; title 27px/700.
- **Slots:** `leftAddon`, `titleAddon`, `rightAddon`.
- **Interaction:** Back via slot; user chip hover wash only (no menu wired).

### PageHeader (list header row)
- **Purpose:** Search + filters left, primary action right.
- **Not a card.** Height driven by 38px controls + 15px below.

### BackButton
- White, 8px radius, 1px `#e2e8f0`, ArrowLeft 16px, hover `#f8fafc`.

### PrimaryButton / SecondaryButton / DangerButton / GhostButton
- Shared `Button` variants. Heights 32/36/40. Loading spinner.

### IconButton
- 32×32, 8px radius, semantic tint. `title` for name.

### SearchInput
- 38px canonical, 8px radius, clear X when filled, max-width ~280–320px.

### FilterSelect (Combobox-like select)
- 38px trigger, portal menu, checkmark selected, Escape/outside close.

### Input / Select / Textarea / DateField
- 38px / 8px / navy focus ring. Labels uppercase 12px.

### AutocompleteMultiSelect
- MUI Autocomplete restyled to match 38px/8px/navy; chips for values.

### ChoiceChip
- Pill; selected = filled navy.

### FormRow
- Optional left icon wrapper; `has-error` styles.

### FormPanel (modal subsection)
- Header strip + icon well + uppercase title + padded body.

### Card / Panel / StatCard / SummaryCard
- See §12 and §11.

### Modal
- Portal, blur overlay, 14px radius, size scale, Escape + overlay close, no focus trap.

### ConfirmModal
- Small; two equal buttons; loading on confirm.

### CmsModal
- Modal wrapper with CMS widths, optional subtitle, footer slot.

### Drawer (right)
- 420px, slide from right, header + form + list.

### DataTable
- Wrapper card, uppercase headers, hover rows, spinner/empty, optional expand rows, pagination pills.

### Pagination
- Showing x–y of z; pill prev/next.

### Badge / StatusBadge / Pill / SourceBadge / CmsStatusBadge
- Pills or small rounded tags; always include text.

### Tabs (underline)
- Horizontal scroll, 14px/600 muted, active navy + 2px underline. Used for nested modules.

### Tabs (segmented)
- Track `#f1f5f9` radius 12px; active white + shadow. Used on some detail pages.

### ReportsTabs
- Bordered 10px radius chips; active pale blue fill + navy text.

### Tooltip
- CSS collapsed-nav only; else native `title`.

### Toast
- bottom-right, 12px radius, 15px/600 (hot-toast).

### EmptyState
- Table: text. Feature: icon circle + title + description.

### LoadingState
- Page skeleton (dashboard) or spinner (tables/buttons).

### ErrorState
- Banners and toasts.

### UserChip
- 36px navy avatar + name/role.

### ProgressSegments (CMS)
- Equal segments; filled vs empty; progressbar role.

### ActionMenu
- Portal; 12px radius; items 8×12; destructive color.

### DragSortList
- GripVertical handle; list or grid; grab cursor.

### ImageUploadField
- 38px trigger + 160×100 preview + circular clear.

### DocumentHeader / MetricStrip / DefinitionTable
- Detail templates: 8px cards, uppercase section titles, 2-col grids.

---

## 33. Page template inventory

Do not bind these to domain objects; they are **layout templates**.

### 33.1 List page
```
[Topbar title]
[Search + filters ........ Primary action]
[Table card
   header row
   data | spinner | empty
   pagination]
[Modal(s)]
```
Used by most collection screens (records, users, catalog items, etc.).

### 33.2 Tabbed module list
```
[Outer card margin 10px]
  [Underline tabs, scroll]
  [Inner padding 10px]
    [List header]
    [Table with shadow removed]
```
Used when one nav item contains many peer collections.

### 33.3 Dashboard page
```
[Welcome]
[KPI grid]
[2-col panels of actionable rows]
```

### 33.4 Detail page (split)
```
[Topbar: Back | Title | optional status]
[2-col grid]
  [Info card: header actions + labeled fields]
  [Activity card: list + composer]
```
Stacks at ~980px.

### 33.5 Document detail page
```
[Optional negative margin to bleed into content padding]
[Header bar: id + muted secondary + outline actions]
[Metric strip]
[2-col 8px sections with uppercase titles]
[Full-width tables / notes]
```
Stacks grids ~1024px; header stacks ~768px.

### 33.6 Record hero detail
```
[Hero panel 2-col]
  [Toolbar + labeled field pairs]
  [2×2 metric cells on tinted column]
[Below: additional sections / tables]
```
Hero stacks ~840px.

### 33.7 Modal form page (overlay, not a route)
```
[Header title + X]
[Optional 2-col form panels]
[Footer hint + Cancel + Save]
```

### 33.8 Confirm overlay
```
[Title question]
[14px muted sentence]
[Cancel | Destructive]
```

### 33.9 Settings / CMS section
```
[Tabbed module]
[Optional metrics/progress]
[Form panel or card grid + action menus]
[Modal for create/edit; confirm for delete]
```

### 33.10 Report page
```
[Chip tabs]
[Optional CSS bar chart card]
[Table + filters]
```

### 33.11 Accounting workspace
```
[Sticky frosted header radius 15px with underline tabs]
[4 summary cards]
[Filter panel 4-col]
[Table]
```
Summary grid collapses ~900px.

### 33.12 Printable document
```
[A4, 28–32px margin]
[Strong header rule]
[Meta table]
[Line items]
[Right-aligned totals]
```

There is **no split-view master-detail** (list+detail simultaneous). Detail is always a new route. There is **no breadcrumb trail template**.

---

## 34. Design tokens (consolidated)

### COLORS — [OBSERVED]

```
--primary:            #0f172a
--primary-light:      #1e293b
--accent (app):       #083574
--accent-hover:       #0c4a9e
--accent-system-blue: #3b82f6
--success:            #10b981
--warning:            #f59e0b
--danger:             #ef4444
--bg-main:            #f8fafc
--bg-card:            #ffffff
--text-main:          #1e293b
--text-muted:         #64748b
--border:             #e2e8f0
--sidebar-bg:         #011938
--sidebar-text:       #94a3b8
--focus-ring:         rgba(8, 53, 116, 0.12–0.15)
--overlay:            rgba(15, 23, 42, 0.45)
```

### TYPOGRAPHY — [OBSERVED]

```
App intended: Inter, system-ui, -apple-system, sans-serif
App loaded:   Geist variables (not applied as font-family)

Title lg:  27px / 700 / -0.01em
Title md:  22–24px / 700–800
Panel:     15–16px / 700–800
KPI:       32px / 700
Body:      13–14px / 400
Label:     12px / 600 / uppercase / 0.04em
Table th:  12px / 600 / uppercase / 0.05em
Button:    12–14px / 600
```

### SPACING — [OBSERVED]

```
4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 32
Page padding: 10px
Header row gap: 8px
Section (dashboard): 32px
```

### RADIUS — [OBSERVED]

```
control:  8px
menu:     10px
nav item: 12px
card:     12–16px
modal:    14px
pill:     9999px
avatar:   50%
```

### SHADOWS — [OBSERVED]

```
--shadow:    0 4px 6px -1px rgb(0 0 0 / 0.1) [, 0 2px 4px -2px rgb(0 0 0 / 0.1)]
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
topbar:      0 1px 0 rgba(15,23,42,.06), 0 12px 32px -12px rgba(15,23,42,.08)
dropdown:    0 14px 45px rgba(15,23,42,.14–.18)
modal:       0 24px 48px -12px rgba(15,23,42,.22)
```

### ICON SIZES — [OBSERVED]

```
12–14  check in menus
16     table actions, chevrons, back, clear
18     logout, avatar, dashboard icons, modal close, add icons
20     sidebar nav
22     sidebar svg min-width
32     icon button box
34     KPI icon well
40     sidebar toggle box
```

### CONTROL HEIGHTS — [OBSERVED]

```
--filter-control-height: 38px
Button sm/md/lg:         32 / 36 / 40
Icon button:             32
Topbar:                  72
Sidebar header:          90
```

### BREAKPOINTS — [OBSERVED]

```
560, 600, 640, 768, 840, 900, 960, 980, 1024, 1100
```

### TRANSITIONS — [OBSERVED]

```
fast:     0.12–0.15s ease
default:  0.2s ease
sidebar:  0.3s cubic-bezier(0.4, 0, 0.2, 1)
spinner:  0.7s linear
shimmer:  1.2s infinite
```

### Z-INDEX / LAYERING — [OBSERVED]

```
Topbar                 99
Accounting sticky      50
Status menu (local)    50
Follow-up overlay      900
Follow-up drawer       901
Sidebar                1001
Modal                  1100
Toast                  1200
Action menu            1200
FilterSelect menu      1300
Collapsed nav tooltip  2000
```

---

## 35. Quality benchmark

This reference feels high quality **where it is consistent**, for concrete reasons:

1. **One canvas, one card, one border.** Almost every surface is `#f8fafc` / `#fff` / `#e2e8f0`. That restraint is the polish.
2. **Hierarchy is typographic, not chromatic.** Titles are weight and size; labels are uppercase muted; numbers are large. Color is reserved for status and the primary action.
3. **Predictable chrome.** List pages share the same header anatomy. Tables share the same hover, empty, spinner, and pagination.
4. **Actions are spatially disciplined.** Create is always top-right. Row mutations are icon-only and confirmed. Row click always feels like “open.”
5. **Navigation is obvious.** Dark rail, bright active item, left blue tick, collapse with labeled tooltips.
6. **Elevation is honest.** Cards whisper; modals shout; the topbar separates with a soft shadow instead of a hard line.
7. **Nested modules avoid double frames.** Tabs live on one card; inner tables go borderless.
8. **Motion is short and mechanical.** 150–300ms, opacity/color/translateY of a few pixels—no circus.
9. **Forms look designed:** 38px fields, navy focus, panelized groups, required asterisks, chip selectors.

Visible quality **debt** (do not blindly copy):

- Inter declared but not loaded; Geist loaded but not applied.
- Mixed table radii (12 vs 16) and mixed search heights (38 vs padding-14).
- Mixed focus blues (`#083574` vs `#2563eb`).
- Unused CSS (topbar dropdown, sidebar submenus).
- No mobile app drawer; 32px hits; no modal focus trap.

---

## 36. HOW ANOTHER PROJECT SHOULD IMPLEMENT THIS DESIGN

Copy the **application design language** below.

### What to copy

- Dark navy left rail + light slate canvas + white cards.
- Accent `#083574` for primary actions, focus, active tabs, edit tints.
- Authority text `#0f172a`, body `#1e293b`, muted `#64748b`, border `#e2e8f0`.
- Lucide outline icons at 16/18/20 with 32px action buttons.
- List template: topbar title, header row (search + filters | primary button), single table card, portal modals.
- Detail template: back in topbar, 2-col cards, labeled uppercase fields, pill status.
- Modal: blur overlay, 14px radius, header + close, scroll body, footer Cancel/Save.
- Confirm every destructive action.
- Pill statuses with text labels.
- Quiet 0.15–0.3s transitions.
- Debounced search, spinner-in-table loading, toast bottom-right.

### What to standardize (improve on the reference without changing its character)

- Load **one** sans family and use it everywhere in the app (Inter or Geist—pick one).
- **38px / 8px / 13px** for all text inputs, selects, and search.
- **12px radius** for cards/tables; **8px** for controls; **14px** for modals; **9999px** for pills.
- One focus color: `#083574` + `0 0 0 3px rgba(8,53,116,0.12)`.
- One table cell density: either 14×16/14px or 10×14/13px—not both.
- Always `aria-label` icon-only buttons.
- Add `:focus-visible` rings on nav and icon buttons.
- If the target must work on phones: **collapse the sidebar into a drawer** (the reference does not, but its collapsed 80px + overlay modal patterns are the pieces to reuse). Do not invent a different visual language for mobile.

### What to avoid

- Do not put every section in a card.
- Do not use heavy shadows on tables.
- Do not use filled icon sets or two icon libraries.
- Do not add breadcrumbs unless needed; this system uses **Back**.
- Do not add notification dots from unused CSS.
- Do not animate page transitions or bounce buttons.
- Do not color-code status without a text label.
- Do not implement business rules from this reference. Copy layout and interaction **shapes** only.

### How to structure pages

1. Shell: sidebar + sticky topbar + padded content.
2. Collections → List template.
3. Nested collections → Tabbed module list.
4. A record → Detail or Document-detail template.
5. Create/edit → Modal form (prefer overlay over a dedicated form route, matching this reference).
6. Destroy → Confirm modal.
7. Home → KPI grid + actionable panels.
8. Totals-heavy workspaces → Sticky tab header + summary cards + filter panel + table.

### How to structure components

- One `Button` with `primary | outline | danger | ghost` and `sm | md | lg`.
- One `Modal` with a size scale.
- One `DataTable` with loading/empty/pagination.
- One `FilterSelect` + `SearchInput` sharing 38px height.
- One `StatusBadge` map (bg + text + label).
- Tokens in CSS variables (`--primary`, `--accent`, `--border`, `--text-muted`, `--shadow`, `--filter-control-height`).

### How to handle interactions

- Click row → route to detail.
- Click primary → modal.
- Click icon → stop row click; open modal or menu.
- Menu choice that is destructive or status-changing → confirm.
- Submit → button spinner; on success close + toast; on error keep modal + banner.
- Escape and overlay close modals unless submitting.

### How to handle responsive behavior

- Grids 2→1 around 900–1024px.
- Tables scroll horizontally.
- Tabs scroll horizontally (hide scrollbar).
- Modals bottom-align under 640px.

### How to maintain visual consistency

- Audit radii, control heights, and icon sizes in code review.
- Forbid hex colors outside the token list except semantic badge pairs.
- Keep motion under 300ms for app chrome.
- Keep the topbar as the only large title on list pages.
- Keep a single primary action per header.

---

## 37. Source accuracy notes

| Topic | Status |
|---|---|
| Live pixel measurement in a running browser | **[NOT DETERMINABLE]** this pass |
| Exact hot-toast duration / success color of library defaults | **[NOT DETERMINABLE]** (only custom `style` was set) |
| Inter actually rendering | **[INFERRED]** no; not loaded |
| Geist actually rendering as UI type | **[INFERRED]** no; variable set but `font-family` overridden to Inter stack |
| Sidebar submenu behavior | CSS **[OBSERVED]**, runtime unused |
| Topbar notifications dropdown | CSS **[OBSERVED]**, runtime unused |
| Modal focus trap / initial focus | **[OBSERVED]** absent |
| Swipe gestures | **[OBSERVED]** absent |
| Reduced motion in the application shell | **[OBSERVED]** absent except some CMS CSS |
| Switch component visuals | **[NOT DETERMINABLE]** beyond toggle row layout |
| Dedicated Tooltip delay | **[OBSERVED]** none (CSS immediate / native title) |

---

*End of specification. Implement the visual and interaction systems above. Do not implement this reference project’s domain, data model, or business workflows.*
