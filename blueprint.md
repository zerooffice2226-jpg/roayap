
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

### 3. **Sales & Purchasing**
- **Full Transaction Lifecycle:** Manage the entire flow from draft invoices/bills to posted entries and final payment reconciliation.

## Implemented Features

### **Invoice Management UI**

A user interface to interact with and test the advanced accounting engines has been successfully implemented.

*   **Invoice Dashboard Page (`src/app/dashboard/invoicing/page.tsx`):** Displays a list of all invoices with their current status (`Draft`, `Posted`, `Paid`, `Cancelled`).
*   **Action Components:** Interactive client components for key actions:
    *   **Post Invoice:** A button for `Draft` invoices that calls the `postInvoice` server action.
    *   **Register Payment:** A modal/form for `Posted` invoices to process payments via the `processInvoicePayment` action.
    *   **Reverse Entry:** A button for `Posted` or `Paid` invoices that triggers the `reverseJournalMove` action to create a credit note.
*   **Dynamic UI:** The UI conditionally renders available actions based on the invoice's state, providing an intuitive user workflow.
*   **Navigation:** A link to the "Invoicing" page has been added to the main sidebar (`src/app/components/SideNav.tsx`).

### **Build Issue Resolution**

*   **Problem:** The Next.js build process was failing due to the use of the `useSearchParams()` hook within components that were being prerendered as static pages. This is a common issue in Next.js when a client-side hook is used in a component that is part of a statically generated page.
*   **Solution:** The issue was resolved by wrapping the components that use `useSearchParams()` in a `<Suspense>` boundary. This allows Next.js to render a fallback UI while the client-side components are being loaded, thus avoiding the build error.
    *   In `src/app/layout.tsx`, the `<SideNav />` component was wrapped in `<Suspense>`.
    *   In `src/app/dashboard/layout.tsx`, the `{children}` were wrapped in `<Suspense>` to protect all dashboard pages.

---

## Current Plan: Refine and Test

**Objective:** To thoroughly test the implemented features and refine the user experience.

**Next Steps:**
1.  **Create Test Data:** Populate the database with a variety of invoices in different states to test all UI and server action scenarios.
2.  **End-to-End Testing:** Perform a complete walkthrough of the invoice lifecycle:
    *   Create a `Draft` invoice.
    *   `Post` the invoice and verify the journal entries.
    *   `Register Payment` and confirm the invoice status changes to `Paid`.
    *   `Reverse` a `Paid` invoice and check the generated credit note.
3.  **UI/UX Review:** Review the dashboard for clarity, ease of use, and visual appeal. Make adjustments as needed.
4.  **Error Handling:** Intentionally trigger errors (e.g., trying to pay an unpaid invoice) to ensure the system provides clear feedback.
