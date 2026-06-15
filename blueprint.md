
# Blueprint: Next.js ERP System

## Overview

This document outlines the architecture and features of a comprehensive ERP system built with Next.js and Firebase Studio. The application is designed to be a modern, scalable, and fully integrated solution for managing core business processes, inspired by Odoo's modularity and automated accounting.

## Project Structure

The project follows a standard Next.js App Router structure, with a key modification: all application code resides within the `src` directory. This is a common pattern for separating application code from configuration files.

*   `src/app/`: The core directory for file-based routing.
*   `src/app/components/`: For reusable UI components.
*   `src/app/actions/`: For Server Actions, handling all business logic and data mutations.
*   `src/lib/`: For utility functions and libraries.

## Core Features & Design

### 1. **Accounting Engine**
- **Event-Driven Architecture:** Built around an event-driven state machine for maximum flexibility and accuracy.
- **Double-Entry Bookkeeping:** Ensures financial integrity for all transactions.
- **Automated Posting Engine:** Invoices and bills automatically generate complex, multi-line journal entries, including inventory valuation (COGS) and accounts receivable/payable.
- **Reconciliation Engine:** A powerful engine to match payments against invoices, automatically updating invoice statuses from `POSTED` to `PAID`.
- **Automated Reversals (Credit Notes):** Legally compliant reversal of posted entries by generating intelligent reverse moves, preserving the audit trail.
- **Pessimistic Locking:** Use of `FOR UPDATE` in critical transactions to prevent race conditions and ensure data consistency.
- **Real-time Reporting:** On-the-fly balance updates and running balance calculations for detailed statements like a Partner Ledger.

### 2. **Inventory Management**
- **Product Catalog:** Central repository for products, including financial account links (income/expense).
- **Automated Stock Moves:** Real-time inventory updates based on sales and purchases, fully integrated with the accounting engine.
- **Negative Stock Policy:** Emulated Odoo's "Allow Negative Stock" policy by modifying the sales action (`src/app/actions/invoicing-ops.ts`). It now uses a `productStock.upsert` operation. This ensures that if a product is sold without an existing stock record in a warehouse, a new record is created instantly with a negative quantity, preventing transaction failures and accurately reflecting the stock deficit.

### 3. **Sales & Purchasing**
- **Full Transaction Lifecycle:** Manage the entire flow from draft invoices/bills to posted entries and final payment reconciliation.

## Implemented Features

### **Advanced Invoicing UI & Workflow**

The entire invoicing user interface has been rebuilt to be a comprehensive, intuitive, and feature-rich single-page application, located at `src/app/dashboard/invoicing/new/page.tsx`.

*   **Reliable Invoice Printing:** Solved the critical "blank page" issue during printing.
    *   **Root Cause:** The global print CSS was hiding all `<form>` elements, which inadvertently included the entire application layout.
    *   **Solution:** The UI was architecturally refactored. The interactive web view is now isolated within a `div#erp-web-view`, and the printable invoice sheet is in a separate `div#erp-invoice-print-sheet`. A new, precise `@media print` stylesheet explicitly hides the web view and forces the invoice sheet to be visible, guaranteeing a complete and accurate printout every time.

*   **Persistent Warehouse Selection:** The "New Invoice" page now remembers the user's last selected warehouse.
    *   **Implementation:** The selected warehouse ID is saved to `localStorage` (`erp_default_warehouse`) and is automatically loaded when the page is revisited, streamlining the invoicing process.

*   **Dynamic UI Enhancements:** Added various user experience improvements:
    *   **Smart Keyboard Navigation:** Use `Enter` to select a searched product and `ArrowDown` in the last invoice line to automatically create a new one.
    *   **Automatic Merging:** If a product is added to an invoice where it already exists (in the same warehouse), the quantities are automatically merged into a single line.
    *   **Context-Aware Creation:** "Create New Product" and "Create New Customer" buttons now save the current context, redirect to the creation form, and return the user to the invoice with the new data pre-filled.

### **Build Issue Resolution**

*   **Problem:** The Next.js build process was failing due to the use of the `useSearchParams()` hook within components that were being prerendered as static pages.
*   **Solution:** The issue was resolved by wrapping the components that use `useSearchParams()` in a `<Suspense>` boundary. This allows Next.js to render a fallback UI while the client-side components are being loaded, thus avoiding the build error.

---

## Current Plan: Final Testing

**Objective:** To thoroughly test the newly implemented features and confirm system stability.

**Next Steps:**
1.  **End-to-End Testing:** Perform a complete walkthrough of the invoice lifecycle:
    *   Create a `Draft` invoice.
    *   `Post` the invoice and verify the journal entries.
    *   `Register Payment` and confirm the invoice status changes to `Paid`.
    *   `Reverse` a `Paid` invoice and check the generated credit note.
2.  **Test Negative Stock:** Create sales for products with no initial inventory and verify that negative `ProductStock` records are created correctly.
3.  **Test Printing:** Verify the invoice printing functionality across different scenarios, ensuring the printout is never blank and always reflects the current data.
4.  **UI/UX Review:** Review the dashboard for clarity, ease of use, and visual appeal.
