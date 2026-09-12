# Automobile Dealership Loyalty Program — Design System

**Target Environment:** Sales floor / dealership POS counter
**Target Users:** Cashiers and counter staff — standing, glancing quickly between customer interactions, using touchscreens or standard desktop monitors under bright showroom lighting
**Primary Goal:** Maximum speed of reading, zero visual confusion, low cognitive load, and minimum input error rate. **Not** a marketing interface.

> **Rules for contributors:** Do not introduce new colors, fonts, spacing values, or animation effects beyond what is listed here. Do not use inline styles to override system values. This document is the source of truth.

---

## 1. Color Palette — Light Theme Only

No dark mode. No decorative gradients. No low-contrast grays for primary text.

### 1.1 Action Colors

Three semantic action colors are defined. Use each **only** for its assigned role — nowhere else.

| Role | Name | Hex | Tailwind equivalent | Tailwind token |
|---|---|---|---|---|
| Primary action | `action.primary` | `#1E40AF` | `blue-800` | `bg-action-primary` |
| Primary hover | `action.primary-hover` | `#1D4ED8` | `blue-700` | `hover:bg-action-primary-hover` |
| Primary active/pressed | `action.primary-active` | `#172554` | `blue-950` | `active:bg-action-primary-active` |
| Primary light fill | `action.primary-light` | `#EFF6FF` | `blue-50` | `bg-action-primary-light` |
| Danger/destructive | `action.danger` | `#B91C1C` | `red-700` | `bg-action-danger` |
| Danger hover | `action.danger-hover` | `#991B1B` | `red-800` | `hover:bg-action-danger-hover` |
| Danger light fill | `action.danger-light` | `#FEF2F2` | `red-50` | `bg-action-danger-light` |
| Success confirmation | `action.success` | `#15803D` | `green-700` | `bg-action-success` |
| Success hover | `action.success-hover` | `#166534` | `green-800` | `hover:bg-action-success-hover` |
| Success light fill | `action.success-light` | `#F0FDF4` | `green-50` | `bg-action-success-light` |

**Primary (blue):** Buttons for main actions (Search, Save, Add Points), active navigation tab highlight.
**Danger (red):** Buttons for destructive or irreversible actions only — reversing a redemption, rejecting a referral, deleting a record. Also used for error messages and invalid field borders.
**Success (green):** Confirmation states only — completed redemptions, approved referrals, success toasts.

### 1.2 Surface Colors

| Role | Token | Hex |
|---|---|---|
| Screen background | `surface.screen` | `#F8FAFC` (`slate-50`) |
| Card / panel background | `surface.card` | `#FFFFFF` |
| Border | `surface.border` | `#CBD5E1` (`slate-300`) |
| Divider (row, section) | `surface.divider` | `#E2E8F0` (`slate-200`) |

### 1.3 Text (Ink) Colors

| Role | Token | Hex |
|---|---|---|
| Primary text | `ink.primary` | `#0F172A` (`slate-950`) |
| Secondary text / labels | `ink.secondary` | `#334155` (`slate-700`) |
| Muted / helper text | `ink.muted` | `#475569` (`slate-600`) |

No text below `#475569` for any informational text. Placeholder text uses `ink.muted`.

### 1.4 Sidebar Colors

The sidebar uses Tailwind's native `slate-900` / `slate-950` palette:

| Role | Class |
|---|---|
| Sidebar background | `bg-slate-900` |
| Sidebar header | `bg-slate-950` |
| Inactive nav item text | `text-slate-300` |
| Inactive nav item hover | `hover:bg-slate-800` |
| Active nav item | `bg-action-primary text-white` |
| Footer area | `bg-slate-950 border-t border-slate-800` |
| Admin badge | `bg-amber-500 text-slate-950 font-bold` |

---

## 2. Typography

Font stack: System font stack (no external font dependency, for offline POS environments).
```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
```

### 2.1 Scale

| Role | Size | Leading | Weight | Class |
|---|---|---|---|---|
| Body text (strict minimum) | 16px | 24px | medium | `text-base font-medium` |
| Labels, table headers | 18px | 26px | semibold | `text-lg font-semibold` |
| Screen/section titles | 24px | 32px | bold | `text-2xl font-bold` |
| Key numbers (balances, amounts) | 24–30px | 32–36px | extrabold | `text-2xl`–`text-3xl font-extrabold` |
| Customer ID badge | 18px | — | bold, monospace | `text-lg font-mono font-bold` |
| Small metadata / tags | 14px | — | medium | `text-sm font-medium` |

**Key numbers rule:** Point balances, rupee amounts, and redemption codes must always be `text-2xl` or larger, bold, and use `tabular-nums` (`font-mono` or `tabular-nums`) so digits don't shift while reading.

---

## 3. Spacing Scale

Spacing follows Tailwind's default 4px base. Key values:

| Token | Value | Use |
|---|---|---|
| `p-4` | 16px | Compact card padding, table cell padding |
| `p-6` | 24px | Standard card / section padding |
| `p-8` | 32px | Large section separation |
| `gap-2` | 8px | Tight inline groupings (badge + text) |
| `gap-3` | 12px | Button icon + label, form label rows |
| `gap-4` | 16px | Button groups, field rows |
| `gap-6` | 24px | Card sections, content block separation |

---

## 4. Touch Target Sizes

Minimum height for **all interactive elements** (buttons, inputs, nav items, table rows): **44px**.

| Element | Height | Class |
|---|---|---|
| Primary buttons | 44–48px | `min-h-[44px] h-11` or `h-12` |
| Large buttons | 48px | `h-12` |
| Input fields | 48px | `h-12` |
| Nav items (sidebar) | 44px | `min-h-[44px] h-12` |
| Table data rows | 48px | `h-12` (minimum) |
| Table header row | 44px | `h-12` |

---

## 5. Focus & Accessibility

All interactive elements must show a **visible focus ring** when tabbed to (keyboard and POS navigation):
```css
*:focus-visible {
  outline: 2px solid #1E40AF;
  outline-offset: 2px;
}
```
Do not suppress outlines except on clearly non-interactive elements.

---

## 6. Animation Rules

**No decorative animations.** No page transition effects, entrance animations, loading skeletons, or hover scale transforms.

The only permitted transitions:
- `transition-colors duration-150` on buttons and nav items (color feedback only, not position/size)
- Modal backdrop fade-in via `animate-in fade-in` (system default, keeps orientation for fast glancers)

---

## 7. Component Library

### 7.1 `SidebarLayout`

**File:** `src/components/layout/SidebarLayout.jsx`

Fixed left sidebar, 256px wide (`w-64`). Main content scrolls independently.

**Sidebar tabs (in order):**

| Tab ID | Label | Icon | Visibility |
|---|---|---|---|
| `search` | Search | `Search` | cashier + admin |
| `dashboard` | Cashier Dashboard | `LayoutDashboard` | cashier + admin |
| `redemptions` | Redemptions | `Gift` | cashier + admin |
| `referrals` | Referrals | `Users` | cashier + admin |
| `admin` | Admin | `ShieldCheck` | **admin only** — hidden for cashier role |

The Admin tab is conditionally rendered based on `user.role === 'admin'`. It also carries an amber `ADMIN` badge.

**Footer:** Displays terminal username, role label (amber), branch code, and a Logout button. The Logout button switches to `bg-action-danger` on hover.

**Top bar:** Page title (derived from active tab), tenant ID badge, and connection status indicator.

---

### 7.2 `Button`

**File:** `src/components/ui/Button.jsx`

Props: `variant`, `size`, `type`, `disabled`, `fullWidth`, `onClick`, `icon`, `className`

| Variant | Background | Text | Use |
|---|---|---|---|
| `primary` | `bg-action-primary` | white | Main actions: Search, Save, Submit |
| `danger` | `bg-action-danger` | white | Destructive actions only |
| `success` | `bg-action-success` | white | Confirmation actions |
| `secondary` | `bg-slate-800` | white | Secondary actions |
| `outline` | `bg-white border-surface-border` | `ink.primary` | Cancel, back, neutral |

| Size | Height | Font |
|---|---|---|
| `sm` | `h-10` (40px) | `text-base` |
| `md` (default) | `min-h-[44px] h-11` | `text-base font-bold` |
| `lg` | `min-h-[48px] h-12` | `text-lg font-bold` |

---

### 7.3 `Input`

**File:** `src/components/ui/Input.jsx`

Props: `label`, `id`, `type`, `value`, `onChange`, `placeholder`, `error`, `helperText`, `required`, `disabled`, `icon`, `className`

- Height: `min-h-[44px] h-12`
- Font: `text-base font-medium`
- Normal border: `border-surface-border` → focuses to `border-action-primary` with `ring-2 ring-action-primary/20`
- Error state: `border-action-danger bg-action-danger-light`
- Error message: `text-sm font-semibold text-action-danger` below field
- Required indicator: red asterisk (`text-action-danger`) inline in label
- Disabled: `bg-slate-100 text-ink-muted cursor-not-allowed`
- Optional leading icon support via `icon` prop (positioned `left-3.5` with `pl-11` padding)

---

### 7.4 `StatusBadge`

**File:** `src/components/ui/StatusBadge.jsx`

Props: `value`, `type` (`'tier'` | `'status'`), `className`

**Tier badges** (`type="tier"`):

| Value | Style |
|---|---|
| `silver` | `bg-slate-200 text-slate-900 border-slate-400 font-semibold` |
| `gold` | `bg-amber-100 text-amber-950 border-amber-400 font-bold` |
| `platinum` | `bg-indigo-100 text-indigo-950 border-indigo-400 font-bold` |

**Status badges** (`type="status"` — default):

| Value | Style |
|---|---|
| `approved`, `completed`, `success` | `bg-action-success-light text-green-900 border-green-400 font-bold` |
| `pending` | `bg-amber-100 text-amber-950 border-amber-400 font-bold` |
| `rejected`, `failed`, `danger` | `bg-action-danger-light text-red-950 border-red-400 font-bold` |
| *(default)* | `bg-slate-100 text-slate-900 border-slate-300 font-medium` |

Displayed as pill (`rounded-full`), uppercase, `tracking-wider`, `text-sm`.

---

### 7.5 `DataTable`

**File:** `src/components/ui/DataTable.jsx`

Props: `columns`, `data`, `keyField`, `onRowClick`, `emptyMessage`, `className`

Column definition shape:
```js
{
  header: 'Label',       // column header text
  field: 'fieldName',    // data key
  sortable: true,        // enables client-side sort
  align: 'right',        // 'right' for numeric columns → font-mono, text-right
  render: (val, row) => ...,  // optional custom cell renderer
}
```

- Header row: `h-12 bg-slate-100 border-b-2 border-surface-border font-bold text-base`
- Sortable columns show `ArrowUpDown` (unsorted) → `ArrowUp` / `ArrowDown` (sorted) in `text-action-primary`
- Data rows: `min-h-[48px] h-12`, odd rows get `bg-slate-50/30` striping
- Clickable rows: `cursor-pointer hover:bg-slate-50 active:bg-slate-100`
- Numeric cells: `font-mono text-right`
- Empty state: centered message, `text-base font-medium text-ink-secondary`, `h-24`

---

### 7.6 `CustomerSummaryCard`

**File:** `src/components/ui/CustomerSummaryCard.jsx`

Props: `customer`, `onRecordEarning`, `onRedeemPoints`, `className`

Displayed immediately on customer identification. Three sections:

**Left — Identity:**
- Customer ID: monospace badge `bg-slate-900 text-white font-mono font-bold text-lg`
- Customer name: `text-2xl font-bold`
- Tier badge via `<StatusBadge type="tier">`
- Phone numbers: pill tags with `(Main)` label for primary
- Vehicles: pill tags with `registration_number (model)`

**Right — Balance & Actions:**
- Label "Available Loyalty Balance" `text-sm font-bold uppercase tracking-wider`
- Balance: `text-3xl font-extrabold text-action-primary tabular-nums`
- Rupee equivalent: `text-base font-bold text-action-success` — `≈ ₹{n} Discount Value`
<!-- - CTA buttons: `+ Add Points` (primary blue) and `Redeem (OTP)` (success green), `h-11` -->

---

### 7.7 `ConfirmationModal`

**File:** `src/components/ui/ConfirmationModal.jsx`

Props: `isOpen`, `title`, `description`, `confirmText`, `cancelText`, `variant`, `onConfirm`, `onCancel`, `isLoading`

- Backdrop: `bg-slate-900/70 backdrop-blur-sm`
- Modal card: `max-w-lg bg-white border-2 border-surface-border rounded-lg`
- Header: `bg-slate-100 border-b border-surface-border` with `AlertTriangle` icon (danger only)
- Title: `text-xl font-bold text-ink-primary`
- Body: `text-base font-medium text-ink-primary` — plain language description of consequence
- Footer: `bg-slate-50 border-t border-surface-border`
- Buttons: Cancel is `outline lg`, Confirm is `variant lg` (danger/primary/success)
- Escape key closes modal (unless `isLoading`)
- While `isLoading`: confirm button shows "Processing..." and both buttons are disabled

---

### 7.8 `StatCard`

**File:** `src/components/ui/StatCard.jsx`

A small metric tile for dashboard summaries.

Props: `label`, `value`, `subtext`, `variant` (`'default'` | `'success'` | `'danger'`)

- Value: `text-3xl font-extrabold tabular-nums`
- Label: `text-sm font-bold uppercase tracking-wider text-ink-secondary`
- Optional subtext below value

---

## 8. Exports Index

All UI components are re-exported from `src/components/ui/index.js`:

```js
export { Button } from './Button';
export { Input } from './Input';
export { StatusBadge } from './StatusBadge';
export { DataTable } from './DataTable';
export { CustomerSummaryCard } from './CustomerSummaryCard';
export { ConfirmationModal } from './ConfirmationModal';
export { StatCard } from './StatCard';
```

---

## 9. What Is Not Permitted

- No dark mode toggle or dark theme classes
- No TailwindCSS arbitrary color values like `bg-[#abc123]` — use only tokens from Section 1
- No `text-gray-*` or `text-zinc-*` — use only `ink.*` tokens or `slate-*` within defined ranges
- No animations beyond `transition-colors` on interactive elements
- No illustrative icons, hero images, or marketing copy
- No font size below `text-base` (16px) for any user-readable content
- No interactive elements smaller than 44px height
