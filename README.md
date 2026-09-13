# 💼 Hisaab (हिसाब) — Billing, Inventory & Accounting System

> Modern, full-stack GST Billing, Inventory Management, and Customer Ledger application tailored for Indian Small & Medium Businesses (SMBs). Built for water purification, hardware, retail, and manufacturing enterprises.

---

## 🌟 Key Features

### 🛒 1. Inventory & Purchases (Stock Inflow)
* **Comprehensive Purchase Bills**: Record purchases with Bill #, Vendor / Supplier, Date, Quantity, Unit, Unit Rate (₹), and Total Amount (₹).
* **Two-Way Auto Calculation**: 
  * `Qty × Unit Rate = Total Amount` (automatically computed in real-time)
  * Entering Total Amount automatically calculates and updates the Unit Rate.
* **Natural Reading Flow**: Purchases table organized in natural calculation order: `Bill #` &rarr; `Product` &rarr; `Vendor` &rarr; `Date` &rarr; `Qty` &rarr; `Rate` &rarr; `Total Amount`.
* **Auto Product Catalog Creation**: Type any new item name (e.g. `Pre Carbon 10 Inch`, `RO Pump`, `Housing`) and it is automatically added to the **Product Catalog** upon saving.
* **Automatic Stock Increment**: Purchasing items immediately increments available inventory stock (`+ Qty`).
* **Multi-Select Bulk Deletion**: Select individual or multiple purchase records with checkboxes to delete in bulk with stock rollback safeguards.
* **Repeat Purchase Shortcut**: 1-click "Buy More" button on any row pre-fills the purchase form with vendor, unit, and recent purchase rate.

### 🧾 2. Sales & Invoicing (Stock Outflow)
* **GST & Non-GST Invoices**: Automatic tax calculation based on state (Intrastate: `CGST + SGST`, Interstate: `IGST`).
* **Automatic Stock Deduction**: Selling items immediately deducts quantity from live inventory stock (`- Qty`).
* **Stock Restoration**: Deleting or canceling an invoice automatically restores inventory stock.
* **Live Stock Display**: The invoice form's product search dropdown shows real-time available stock and unit rates.
* **Invoice Row Click & Preview**: Click any row in the sales list for quick preview and instant PDF download.
* **PDF Invoice Generation**: Professional, downloadable invoice PDFs ready for print or WhatsApp sharing.
* **Atomic Invoice Numbering**: Automated fiscal year sequence (`INV/26-27/0001`).
* **Multi-Select Bulk Deletion**: Bulk select and remove sales records with one click.

### 📦 3. Product Catalog
* **Complete Item Management**: Product Name, HSN/SAC code, Unit (NOS, PCS, SET, KG, etc.), Default Rate, and Live Stock.
* **Recent Purchase Intelligence**: Each product row displays a live summary badge of the most recent purchase:
  * Recent Bill #
  * Vendor / Supplier
  * Purchase Unit Rate (₹/unit)
  * Purchase Date
* **Stock Status Badges**: Visual indicators for healthy stock (`X NOS`) and out-of-stock items.
* **Multi-Select Bulk Delete**: Delete multiple catalog items at once with relationship protection.
* **Quick Add Modal**: Rapidly insert products directly from the catalog screen.

### 👥 4. Customers & Receivables
* **Customer Profiles**: Name, Phone, Billing Address, GSTIN, and State.
* **Auto State Detection**: Automatic extraction of state name and code directly from the customer's 15-digit GSTIN.
* **Receivables & Customer Ledger**: Track outstanding payments, overdue invoices, and customer transaction history.
* **Payment Recording**: Record payments via Cash, Bank Transfer, Cheque, or UPI with instant balance updates.

### 🤖 5. AI Assistant & OCR
* **AI Query**: Ask natural language business questions (e.g., "Which products are low on stock?", "Total sales this month").
* **AI Document Scanner**: Upload or capture supplier bills and receipts to automatically extract items, amounts, and dates.

### 📊 6. Dashboard & Analytics
* **Real-time Business Metrics**: Total revenue, pending receivables, monthly sales trends, and recent transaction activity.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Angular 17+ (Standalone Components, Signals, Reactive Forms, Angular Material) |
| **Backend** | NestJS (Modular Architecture, TypeScript, Class-Validator) |
| **Database & ORM** | SQLite / PostgreSQL with Prisma ORM |
| **Authentication** | JWT (Access Token + Refresh Token) with bcrypt password hashing |
| **Styling** | Custom Dark Theme UI with SCSS & Angular Material |

---

## 🚀 Quick Start Guide (Single URL & 1-Click Launch)

### 🎯 Option 1: 1-Click Launch (Recommended for Daily Use)

Simply double-click the **`start-hisaab.bat`** file in the project root folder.

* It automatically starts the unified server.
* It serves both the **Angular Frontend** and **NestJS Backend** together on a single URL: **`http://localhost:3000`**.
* It automatically opens your default web browser to **`http://localhost:3000`**.
* No need to manage two different terminal windows or multiple ports!

---

### 💻 Option 2: Command Line (Production Mode)

```bash
# Start unified server (frontend + backend on port 3000)
node apps/api/dist/main.js
# Then open: http://localhost:3000
```

---

### 🛠️ Option 3: Development Mode (For Code Editing)

If you are developing or modifying source code:

```bash
# Runs API and Frontend dev servers concurrently
npm run dev
```

---

## 📁 Project Structure

```
hisaab/
├── apps/
│   ├── api/                      # NestJS Backend Application
│   │   ├── src/
│   │   │   ├── auth/             # Authentication & JWT
│   │   │   ├── customers/        # Customer CRUD & GSTIN State Resolution
│   │   │   ├── products/         # Product Catalog & Stock Tracking
│   │   │   ├── purchases/        # Purchase Bills, Unit Rates & Stock Addition
│   │   │   ├── sales/            # Invoices, PDF Generation & Stock Deduction
│   │   │   ├── payments/         # Payment Transactions
│   │   │   ├── receivables/      # Customer Ledgers & Balances
│   │   │   ├── ai/               # AI Business Assistant & OCR Scanner
│   │   │   ├── dashboard/        # Analytics & Metrics
│   │   │   └── prisma/           # Prisma Service
│   │   └── package.json
│   │
│   └── web/                      # Angular 17 Frontend Application
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/         # API Services, Auth Interceptor, Guards
│       │   │   ├── features/     # Feature Pages (Sales, Purchases, Products, Customers, AI)
│       │   │   └── shared/       # Reusable Pipes, Modals & Components
│       │   └── styles.scss       # Global Dark Theme Design Tokens
│       └── package.json
│
├── prisma/
│   ├── schema.prisma             # Database Schema
│   └── migrations/               # Prisma Database Migrations
└── package.json                  # Root Monorepo Scripts
```

---

## 🔄 Inventory Stock Flow

```
                  ┌─────────────────────────────────┐
                  │          Purchase Bill          │
                  │ (Qty: +10, Rate: ₹50, Amount)   │
                  └────────────────┬────────────────┘
                                   │
                                   ▼  [Increments Stock & Records Rate]
                  ┌─────────────────────────────────┐
                  │         Product Catalog         │
                  │    Live Stock & Recent Rates    │
                  └────────────────┬────────────────┘
                                   │
                                   ▼  [Decrements Stock]
                  ┌─────────────────────────────────┐
                  │          Sales Invoice          │
                  │         (Qty: -2 Sold)          │
                  └─────────────────────────────────┘
```

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Runs both API and Web servers concurrently |
| `npm run dev:api` | Runs NestJS API server in development watch mode |
| `npm run dev:web` | Runs Angular dev server on `http://localhost:4200` |
| `npm run build:all`| Builds both API and Web production bundles |
| `npm run db:migrate` | Runs Prisma database migrations |
| `npm run db:push` | Pushes schema changes directly to SQLite database |
| `npm run db:studio` | Opens Prisma Studio GUI database browser |

---

## 📄 License
This project is private and proprietary.
