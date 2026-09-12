# 💼 Hisaab (हिसाब) — Billing, Inventory & Accounting System

> Modern, full-stack GST Billing, Inventory Management, and Customer Ledger application tailored for Indian Small & Medium Businesses (SMBs).

---

## 🌟 Key Features

### 🛒 1. Inventory & Purchases (Stock Inflow)
* **Bill Recording**: Record purchase bills with Bill #, Vendor / Supplier, Date, Quantity, Unit, and Total Amount.
* **Auto Product Creation**: Type any new item name (e.g. `Eggs`, `Water Filter`, `RO Pump`) and it is automatically added to the **Product Catalog** upon saving.
* **Automatic Stock Increment**: Purchasing items instantly increases available inventory stock (`+ Qty`).
* **Purchase Bill Preview**: The Product Catalog displays recent purchase details (Bill #, Vendor, Date) for each item.

### 🧾 2. Sales & Invoicing (Stock Outflow)
* **GST & Non-GST Invoices**: Automatic tax calculation based on state (Intrastate: `CGST + SGST`, Interstate: `IGST`).
* **Automatic Stock Deduction**: Selling items immediately deducts quantity from live inventory stock (`- Qty`).
* **Stock Restoration**: Deleting or editing a draft invoice automatically restores inventory stock.
* **Live Stock Display**: The invoice form's product search dropdown shows real-time available stock for each product.
* **PDF Invoice Generation**: Professional, downloadable invoice PDFs ready for print or WhatsApp sharing.
* **Atomic Invoice Numbering**: Automated fiscal year sequence (`INV/26-27/0001`).

### 📦 3. Product Catalog
* **Complete Product Management**: Item Name, HSN/SAC code, Unit (NOS, PCS, KG, BOX, etc.), Selling Rate, and Stock.
* **Stock Status Indicators**: Visual badges for in-stock and out-of-stock items.
* **Quick Add Form**: Add items directly to the catalog or import via purchase bills.

### 👥 4. Customers & Receivables
* **Customer Profiles**: Name, Phone, Billing Address, GSTIN, and State.
* **Receivables & Customer Ledger**: Track outstanding payments, invoices, and payment history per customer.
* **Payments Recording**: Record payments via Cash, Bank Transfer, Cheque, or UPI.

### 📊 5. Dashboard & Analytics
* **Real-time Metrics**: Total revenue, pending receivables, monthly sales graphs, and recent transactions.

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

Simply double-click the **`start-app.bat`** file in the project root folder.

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
│   │   │   ├── customers/        # Customer CRUD & State Management
│   │   │   ├── products/         # Product Catalog & Stock Tracking
│   │   │   ├── purchases/        # Purchase Bills & Stock Addition
│   │   │   ├── sales/            # Invoices, PDF Generation & Stock Deduction
│   │   │   ├── payments/         # Payment Transactions
│   │   │   ├── receivables/      # Customer Ledgers & Balances
│   │   │   ├── dashboard/        # Analytics & Metrics
│   │   │   └── prisma/           # Prisma Service
│   │   └── package.json
│   │
│   └── web/                      # Angular 17 Frontend Application
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/         # API Services, Auth Interceptor, Guards
│       │   │   ├── features/     # Feature Pages (Sales, Purchases, Products, Customers, etc.)
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
                  ┌──────────────────────┐
                  │    Purchase Bill     │
                  │ (Qty: +10, Bill No)  │
                  └──────────┬───────────┘
                             │
                             ▼  [Increments Stock]
                  ┌──────────────────────┐
                  │   Product Catalog    │
                  │  Live Stock Balance  │
                  └──────────┬───────────┘
                             │
                             ▼  [Decrements Stock]
                  ┌──────────────────────┐
                  │    Sales Invoice     │
                  │   (Qty: -2 Sold)     │
                  └──────────────────────┘
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
| `npm run db:studio` | Opens Prisma Studio GUI database browser |

---

## 📄 License
This project is private and proprietary.
