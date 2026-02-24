# PRD – Base – UI/UX – P–007
## Uniform UI/UX Standardization Across Application

**Document Owner:** Senior Product Manager / UI/UX Architect  
**Status:** Draft / For Review  
**Date:** May 24, 2024  
**Target Version:** v1.1.0 (Standardization Sprint)

---

### 1. Executive Summary
The Shopstream platform has successfully launched several core modules (Dashboard, Products, Quotes, Master Quotes, etc.). While functional, the current interface exhibits minor inconsistencies in component behavior, layout spacing, and visual cues. This PRD defines the standardization requirements to ensure a cohesive, professional, and intuitive user experience across the entire ecosystem.

---

### 2. Current UI Structure Overview
The application follows a **Dashboard-based CRUD (Create, Read, Update, Delete) Architecture**:
*   **Persistent Shell:** A global navigation header/sidebar containing brand identity and user profile.
*   **Page Header:** A section containing page titles, breadcrumbs, and primary page-level actions (e.g., "Add Product").
*   **Information Layer:** A combination of high-level metric cards and detailed data tables.
*   **Interaction Layer:** Modals (ShadCN Dialogs), Sheets, and Forms for data entry.

---

### 3. Identified UI Inconsistencies
Through a preliminary audit, the following friction points were identified:
*   **Button Variance:** Some modules use full-width buttons in cards, while others use fixed-width or icon-only buttons for identical actions.
*   **Form Field Geometry:** Input fields vary between standard heights and larger touch-friendly heights, leading to misaligned form rows.
*   **Card Layouts:** Shadow depth (`shadow-sm` vs `shadow-md`) and internal padding (`p-4` vs `p-6`) vary between the "Products" and "Orders" modules.
*   **Table Density:** Header background colors and cell vertical alignment are inconsistent, especially when incorporating status badges or thumbnails.
*   **Modal Alignment:** Footer action buttons are sometimes left-aligned and sometimes right-aligned across different dialogs.

---

### 4. Standardization Strategy

#### 4.1 Layout Consistency
*   **Container Width:** All main pages must wrap content in a consistent container (`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`).
*   **Spacing System:** Standardize on a 4px grid. Vertical spacing between page elements should strictly follow `space-y-8` for major sections and `space-y-4` for internal card content.

#### 4.2 Navigation Consistency
*   **Active States:** Links must use the Primary Color (Deep Sky Blue) for text and a 2px bottom border indicator.
*   **Hover States:** Subtitle background tints (`bg-muted/50`) with a transition duration of `150ms`.

#### 4.3 Button Variants (ShadCN System)
*   **Primary:** `bg-primary` (Deep Sky Blue) - Reserved for the single most important action on a screen.
*   **Secondary:** `variant="outline"` - For supporting actions (e.g., "Export", "Filter").
*   **Success:** `bg-accent` (Light Green) - For finality actions (e.g., "Place Order", "Approve").
*   **Danger:** `variant="destructive"` - For irreversible actions (e.g., "Delete", "Clear Selection").

#### 4.4 Form & Input Design
*   **Height:** All standard inputs and selects must be `h-10`.
*   **Typography:** Labels must be `text-sm font-medium` with a 1.5 ratio line-height.
*   **Rounding:** All fields must utilize `rounded-md` (0.375rem) to match ShadCN defaults.

#### 4.5 Table & Data Grid Specs
*   **Header:** `bg-muted/50` with uppercase `text-[10px]` or `text-xs` for labels.
*   **Row Hover:** Every row must have a `hover:bg-muted/30` transition.
*   **Alignment:** Numeric data (Prices, Quantities) must be **right-aligned**. Status badges must be **centered**.

---

### 5. Implementation Plan

| Phase | Task | Objective |
| :--- | :--- | :--- |
| **Phase 1** | **Global Theme Audit** | Update `globals.css` to ensure HSL variables for Primary and Accent match the brand guide exactly. |
| **Phase 2** | **Component Refactoring** | Replace custom button/input logic with a single unified component call across all modules. |
| **Phase 3** | **Layout Synchronization** | Standardize page headers and padding across Dashboard, Products, and Quotes. |
| **Phase 4** | **Feedback Loop Integration** | Standardize Toast and Alert behaviors for Success/Error states. |

---

### 6. Acceptance Criteria
1.  **Visual Uniformity:** A side-by-side comparison of the "Products" and "Master Quotes" pages shows identical header heights and table row densities.
2.  **Interaction Parity:** Every "Delete" action across the app triggers a modal with the same width and button alignment.
3.  **Responsiveness:** No horizontal scrolling on mobile (under 375px) for any form or card layout.
4.  **Accessibility:** All inputs have associated labels and a minimum contrast ratio of 4.5:1.

---

### 7. Screenshot Audit Comparison (Hypothetical)

*   **Before:** The "Orders" page used `shadow-xl` with right-aligned modal footers, while "Settings" used `shadow-none` with center-aligned footers.
*   **After:** Both utilize `shadow-sm` and right-aligned footers, creating a sense of a single, unified workspace.

---
**End of Document**