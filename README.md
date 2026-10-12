# Eze Ifenna Backend - On-Demand Services Marketplace API

<p align="center">
  <img src="assets/banner.svg" alt="eze_ifenna_backend Banner" width="100%">
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=node.js" alt="Node.js"></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-4.21-black?style=for-the-badge&logo=express" alt="Express"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"></a>
  <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma" alt="Prisma"></a>
  <a href="https://www.mongodb.com"><img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB"></a>
  <a href="https://socket.io"><img src="https://img.shields.io/badge/Socket.io-4.x-010101?style=for-the-badge&logo=socket.io" alt="Socket.io"></a>
  <a href="https://stripe.com"><img src="https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe" alt="Stripe"></a>
  <a href="https://paypal.com"><img src="https://img.shields.io/badge/PayPal-003087?style=for-the-badge&logo=paypal" alt="PayPal"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" alt="License"></a>
</p>

---

## 📖 Overview

**eze_ifenna_backend** is an on-demand professional service booking marketplace API built with Node.js, Express.js, TypeScript, and Prisma ORM with MongoDB. The service manages provider availability matrices, booking reservations, dual Stripe and PayPal payments, real-time client-provider WebSocket chat, and Firebase Cloud Messaging alerts.

---

## ⚡ Key Features

- 🛠️ **Service Categories & Subcategories:** Dynamic taxonomy for booking diverse trades, beauticians, and home professionals.
- 📅 **Provider Availability Matrices:** Real-time provider shift management, preventing overlap and double-booking.
- 💳 **Dual Stripe & PayPal Checkout:** Full escrow and instant payment settlement supporting credit cards and PayPal wallets.
- 💬 **Real-Time Client-Provider Chat:** WebSocket communication via Socket.io for immediate location and timing coordination.
- 🔔 **Firebase Cloud Messaging:** Instant push alerts for booking confirmations, cancellations, and status changes.
- ☁️ **DigitalOcean Spaces CDN:** Identity verification and service portfolio file uploads.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    Client[Clients & Service Providers] -->|HTTPS REST| Router[Express Application Gateway]
    Client <-->|WSS Socket.io| ChatGateway[Real-Time Consultation Chat]

    subgraph Security ["Security & Auth"]
        Router --> Auth[JWT Role Verification]
        Router --> Validate[Zod Request Validation]
    end

    subgraph Marketplace ["Marketplace Modules"]
        Auth --> ServiceMod[Services & Categories]
        Auth --> BookingMod[Booking & Availability Engine]
        Auth --> ReviewMod[Ratings & Feedback]
    end

    subgraph Settlement ["Payment Settlement"]
        BookingMod --> Stripe[Stripe Payment Engine]
        BookingMod --> PayPal[PayPal SDK Engine]
    end

    subgraph Persistence ["Data & Notifications"]
        Marketplace --> Prisma[Prisma ORM Client]
        ChatGateway --> Prisma
        Prisma --> MongoDB[(MongoDB Cluster)]
        BookingMod --> FCM[Firebase Cloud Messaging API]
    end
```

---

## 📂 Directory Structure

```text
.
├── src/
│   ├── app/
│   ├── components/
│   └── ...
├── assets/
│   └── banner.svg
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

---

## 🛠️ Tech Stack & Dependencies

| Layer / Library | Version | Description |
|---|---|---|
| **Express.js** | `v4.21` | HTTP application framework |
| **TypeScript** | `v5.x` | Type safety across data contracts |
| **Prisma ORM** | `v6.x` | MongoDB modeling and query builder |
| **Socket.io** | `v4.8` | Real-time client-to-provider consultation |
| **Stripe SDK** | `v17.x` | Credit/debit card processing engine |
| **PayPal SDK** | `v2.x` | PayPal checkout integration |
| **Firebase Admin SDK** | `v13.x` | Push notification alert dispatch |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on the provided sample:

```bash
cp .env.example .env
```

Configurable variables:

```env
PORT=5003
NODE_ENV=development
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/eze_ifenna?retryWrites=true&w=majority

JWT_SECRET=your_jwt_secret_key
EXPIRES_IN=30d

# Stripe
STRIPE_PK=pk_test_your_stripe_public_key
STRIPE_SK=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# PayPal
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox

# DigitalOcean Spaces
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=your_do_spaces_key
DO_SPACES_SECRET=your_do_spaces_secret
DO_SPACES_BUCKET=eze-ifenna-docs
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.x or higher recommended)
- Package Manager (`npm`, `yarn`, or `pnpm`)

### Installation

```bash
# Clone repository
git clone https://github.com/shahjalal-labs/eze_ifenna_backend.git
cd eze_ifenna_backend

# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server
npm run dev
# or for backend services
npm run start:dev
```

### Building for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
