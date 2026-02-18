# 🏥 MedChain — Blockchain-Based Medical Record Storage

> **AES-256 Encrypted Medical Records on IPFS & BigchainDB**

A decentralized medical record management system that ensures **data integrity**, **patient privacy**, and **immutable audit trails** using blockchain technology. Built as a full-stack application with role-based access control for Receptionists, Doctors, and Patients.

---

## 📑 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Sequence Diagrams](#-sequence-diagrams)
- [Data Flow Diagrams](#-data-flow-diagrams)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Demo Credentials](#-demo-credentials)
- [Security Features](#-security-features)

---

## ✨ Features

| Role | Capabilities |
|---|---|
| **Receptionist** | Register doctors & patients, upload encrypted medical records |
| **Patient** | View own records, manage doctor access permissions, view audit logs |
| **Doctor** | Search patient records, download & decrypt files (if access granted) |

**Core Highlights:**

- 🔐 **AES-256-CBC Encryption** — Files encrypted before leaving the server
- 🌐 **IPFS Storage** — Decentralized file storage via Pinata
- ⛓️ **BigchainDB** — Immutable record & audit trail on blockchain
- 🗄️ **MongoDB** — Fast queries, user management, access control
- 🔑 **JWT Authentication** — Secure HTTP-only cookie sessions
- 🛡️ **Role-Based Access** — Three distinct user roles with granular permissions
- 📋 **Immutable Audit Logs** — Every access attempt recorded on blockchain

---

## 🧰 Tech Stack

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND                          │
│  Next.js 14 (App Router) · React 18 · TypeScript    │
│  Tailwind CSS · react-hot-toast · react-icons        │
├──────────────────────────────────────────────────────┤
│                   BACKEND (API)                      │
│  Next.js API Routes · JWT Auth · bcryptjs            │
│  Node.js Crypto (AES-256-CBC)                        │
├──────────────────────────────────────────────────────┤
│                   DATA LAYER                         │
│  MongoDB (Mongoose) · BigchainDB · Pinata (IPFS)     │
└──────────────────────────────────────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS | UI & routing |
| Backend | Next.js API Routes, TypeScript | REST API endpoints |
| Database | MongoDB Atlas (Mongoose ODM) | User data, records metadata, permissions |
| Blockchain | BigchainDB | Immutable file records & audit trail |
| File Storage | IPFS via Pinata | Decentralized encrypted file storage |
| Encryption | AES-256-CBC (Node.js `crypto`) | File encryption/decryption |
| Authentication | JWT + bcryptjs | Stateless auth with password hashing |

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph CLIENT ["🖥️ Client - Browser"]
        RD["👩‍💼 Receptionist Dashboard"]
        PD["🧑‍🦰 Patient Dashboard"]
        DD["👨‍⚕️ Doctor Dashboard"]
    end

    subgraph SERVER ["⚙️ Next.js Server - API Routes"]
        AUTH["🔑 Auth - JWT"]
        MW["🛡️ Middleware - Cookie Check"]
        RBAC["🔒 Role-Based Guards"]
        subgraph ENGINE ["Core Processing Engine"]
            AES["🔐 AES-256 Encryption"]
            PINC["📌 Pinata Client - IPFS"]
            BDC["⛓️ BigchainDB Client"]
        end
    end

    subgraph DATA ["💾 Data Layer"]
        MONGO[("🗄️ MongoDB Atlas<br/>• Users<br/>• Records Metadata<br/>• Permissions<br/>• Access Logs")]
        IPFS[("🌐 Pinata - IPFS<br/>• Encrypted Medical Files<br/>• Content-Addressed")]
        BDB[("⛓️ BigchainDB<br/>• File Records CREATE tx<br/>• Access Logs CREATE tx<br/>• Immutable & Tamper-proof")]
    end

    RD & PD & DD -->|HTTPS Requests| AUTH
    AUTH --> MW --> RBAC
    RBAC --> ENGINE
    AES --> MONGO
    PINC --> IPFS
    BDC --> BDB

    style CLIENT fill:#e0f2fe,stroke:#0284c7,color:#000
    style SERVER fill:#fef3c7,stroke:#d97706,color:#000
    style DATA fill:#f0fdf4,stroke:#16a34a,color:#000
    style ENGINE fill:#fefce8,stroke:#ca8a04,color:#000
```

### Architecture Overview

1. **Client Layer** — Role-specific React dashboards communicating via REST APIs
2. **Server Layer** — Next.js API routes handling auth, encryption, and orchestration
3. **Data Layer** — Triple storage strategy:
   - **MongoDB** for fast queries (users, metadata, permissions)
   - **IPFS/Pinata** for decentralized encrypted file storage
   - **BigchainDB** for immutable records and audit trails

---

## 🔄 Sequence Diagrams

### 1. User Authentication Flow

```mermaid
sequenceDiagram
    actor C as Client (Browser)
    participant S as API Server
    participant DB as MongoDB

    C->>S: POST /api/auth/login {email, password}
    S->>DB: Find user by email
    DB-->>S: Return user document
    S->>S: bcrypt.compare() — verify password
    S->>S: Sign JWT token (id, email, role)
    S-->>C: Set-Cookie: token + {role, redirect}
    C->>S: GET /dashboard/{role}
    S-->>C: Dashboard HTML
```

### 2. Medical Record Upload Flow (Receptionist)

```mermaid
sequenceDiagram
    actor R as Receptionist
    participant S as API Server
    participant AES as AES-256 Engine
    participant P as Pinata (IPFS)
    participant BC as BigchainDB
    participant DB as MongoDB

    R->>S: POST /api/receptionist/upload {file, patientId}
    S->>S: Validate user & patient
    S->>AES: encryptBuffer(fileBuffer)
    AES-->>S: Encrypted blob (IV prepended)
    S->>P: uploadToPinata(encryptedBlob)
    P-->>S: {ipfsHash, url}
    S->>BC: storeFileRecord({patientId, ipfsHash, fileName})
    BC-->>S: {txId}
    S->>DB: Save MedicalRecord (ipfsHash, txId, metadata)
    S-->>R: ✅ Success {ipfsHash, txId}
```

### 3. Doctor Accessing Patient Records

```mermaid
sequenceDiagram
    actor D as Doctor
    participant S as API Server
    participant DB as MongoDB
    participant BC as BigchainDB
    participant P as Pinata (IPFS)
    participant AES as AES-256 Engine

    D->>S: GET /api/doctor/search?patientId=PAT100001
    S->>DB: Check AccessPermission
    DB-->>S: {granted: true}
    S->>DB: Fetch MedicalRecords
    DB-->>S: Records list
    S-->>D: Patient records list

    Note over D,AES: Doctor clicks Download & Decrypt

    D->>S: GET /api/doctor/access?recordId=xxx
    S->>DB: Verify permission
    S->>DB: Log access attempt (AccessLog)
    S->>BC: Log access to BigchainDB (immutable)
    S->>P: Download encrypted file from IPFS
    P-->>S: Encrypted buffer
    S->>AES: decryptBuffer(encryptedBuffer)
    AES-->>S: Original file
    S-->>D: 📄 File download (decrypted)
```

### 4. Patient Managing Access Permissions

```mermaid
sequenceDiagram
    actor P as Patient
    participant S as API Server
    participant DB as MongoDB

    P->>S: GET /api/patient/doctors
    S->>DB: Query all doctors
    DB-->>S: Doctors list
    S-->>P: Display all doctors

    Note over P,DB: Patient grants access to a doctor

    P->>S: POST /api/patient/permissions {doctorId, grant: true}
    S->>DB: Upsert AccessPermission {granted: true}
    DB-->>S: Updated
    S-->>P: ✅ Access granted

    Note over P,DB: Patient views audit trail

    P->>S: GET /api/patient/access-logs
    S->>DB: Query AccessLog (sorted by timestamp)
    DB-->>S: Log entries
    S-->>P: 📋 Who accessed what, when, granted/denied
```

---

## 📊 Data Flow Diagrams

### End-to-End File Lifecycle

```mermaid
flowchart TD
    A["👩‍💼 Receptionist Uploads File"] --> B["📄 Raw Medical File (PDF/IMG)"]
    B --> C["🔐 AES-256-CBC Encryption<br/>• Random IV 16 bytes<br/>• 32-byte key<br/>• IV prepended to ciphertext"]
    C --> D["🌐 Pinata IPFS<br/>Encrypted blob stored at CID"]
    C --> E["⛓️ BigchainDB<br/>CREATE tx: patientId, ipfsHash,<br/>fileName, timestamp"]
    C --> F["🗄️ MongoDB<br/>MedicalRecord: ipfsHash, txId,<br/>patientId, originalName, fileSize"]

    G["👨‍⚕️ Doctor Requests File"] --> H{"🔒 Permission Check<br/>AccessPermission"}
    H -->|✅ GRANTED| I["📝 Log to MongoDB + BigchainDB"]
    H -->|❌ DENIED| J["📝 Log denial to MongoDB + BigchainDB"]
    I --> K["⬇️ Download from IPFS"]
    D -.->|Encrypted file| K
    K --> L["🔓 AES-256 Decryption<br/>• Extract IV first 16 bytes<br/>• Decrypt ciphertext"]
    L --> M["📄 Original File Served to Doctor"]

    style C fill:#fef3c7,stroke:#d97706,color:#000
    style D fill:#dbeafe,stroke:#2563eb,color:#000
    style E fill:#f3e8ff,stroke:#7c3aed,color:#000
    style F fill:#dcfce7,stroke:#16a34a,color:#000
    style H fill:#fee2e2,stroke:#dc2626,color:#000
    style L fill:#fef3c7,stroke:#d97706,color:#000
```

### Access Control Model

```mermaid
flowchart LR
    P["🧑‍🦰 Patient<br/><i>I control who sees<br/>my medical records</i>"] --> PERM{"AccessPermission Table"}

    PERM -->|"PAT100001 → DOC100001<br/>granted: ✅ true"| DA["👨‍⚕️ Doctor A"]
    PERM -->|"PAT100001 → DOC100002<br/>granted: ❌ false"| DB2["👨‍⚕️ Doctor B"]

    DA --> ACCESS["✅ Can view records"]
    DB2 --> DENIED["❌ Access denied"]

    style P fill:#e0f2fe,stroke:#0284c7,color:#000
    style PERM fill:#fef3c7,stroke:#d97706,color:#000
    style ACCESS fill:#dcfce7,stroke:#16a34a,color:#000
    style DENIED fill:#fee2e2,stroke:#dc2626,color:#000
```

### Blockchain Dual-Write Strategy

```mermaid
flowchart TD
    WRITE["✏️ Write Operation"] --> MONGO["🗄️ MongoDB - Fast<br/>• Quick queries<br/>• User CRUD<br/>• Permissions<br/>• Mutable data<br/>• Indexed"]
    WRITE --> BDB["⛓️ BigchainDB - Immutable<br/>• Tamper-proof<br/>• Audit trail<br/>• File hashes<br/>• Cannot alter<br/>• Decentralized"]

    READ["📖 Read Operation"] --> MONGO
    VERIFY["🔍 Verify Integrity"] --> BDB

    style WRITE fill:#fef3c7,stroke:#d97706,color:#000
    style READ fill:#dbeafe,stroke:#2563eb,color:#000
    style VERIFY fill:#f3e8ff,stroke:#7c3aed,color:#000
    style MONGO fill:#dcfce7,stroke:#16a34a,color:#000
    style BDB fill:#e0e7ff,stroke:#4f46e5,color:#000
```

---

## 📁 Project Structure

```
blockchain-fileview/
├── public/
│   └── favicon.svg                   # App favicon
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts          # POST — User login
│   │   │   │   ├── logout/route.ts         # POST — Clear session
│   │   │   │   ├── me/route.ts             # GET  — Current user info
│   │   │   │   └── change-password/route.ts# POST — Update password
│   │   │   ├── receptionist/
│   │   │   │   ├── register/route.ts       # POST — Register doctor/patient
│   │   │   │   ├── upload/route.ts         # POST — Encrypt & upload file
│   │   │   │   └── users/route.ts          # GET  — List all users
│   │   │   ├── patient/
│   │   │   │   ├── records/route.ts        # GET  — Patient's own records
│   │   │   │   ├── doctors/route.ts        # GET  — List all doctors
│   │   │   │   ├── permissions/route.ts    # GET/POST — Manage access
│   │   │   │   └── access-logs/route.ts    # GET  — View audit trail
│   │   │   └── doctor/
│   │   │       ├── patients/route.ts       # GET  — List all patients
│   │   │       ├── search/route.ts         # GET  — Search patient records
│   │   │       └── access/route.ts         # GET  — Download & decrypt file
│   │   ├── dashboard/
│   │   │   ├── receptionist/page.tsx       # Receptionist dashboard
│   │   │   ├── patient/page.tsx            # Patient dashboard
│   │   │   └── doctor/page.tsx             # Doctor dashboard
│   │   ├── page.tsx                        # Login page
│   │   ├── layout.tsx                      # Root layout + metadata
│   │   └── globals.css                     # Global Tailwind styles
│   ├── components/
│   │   └── Navbar.tsx                      # Shared navigation bar
│   ├── lib/
│   │   ├── auth.ts                         # JWT sign / verify / getAuthUser
│   │   ├── mongodb.ts                      # Mongoose connection singleton
│   │   ├── encryption.ts                   # AES-256-CBC encrypt / decrypt
│   │   ├── pinata.ts                       # IPFS upload / download via Pinata
│   │   └── bigchaindb.ts                   # BigchainDB client & helpers
│   ├── models/
│   │   ├── User.ts                         # User schema (roles, IDs)
│   │   ├── MedicalRecord.ts               # Encrypted file metadata
│   │   ├── AccessPermission.ts            # Doctor ↔ Patient permissions
│   │   └── AccessLog.ts                   # Access audit log entries
│   ├── scripts/
│   │   └── seed.ts                         # Database seeding script
│   └── types/
│       └── bigchaindb-driver.d.ts         # BigchainDB type declarations
├── .env.local                              # Environment variables
├── .gitignore
├── middleware.ts → src/middleware.ts        # Route protection
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── tsconfig.seed.json                      # Config for seed script
```

---

## 🗃️ Database Schema

### MongoDB Collections

#### Users
| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `name` | String | Full name |
| `email` | String (unique) | Login email |
| `password` | String | bcrypt hash |
| `role` | Enum | `receptionist` / `doctor` / `patient` |
| `patientId` | String | e.g., `PAT100001` (patients only) |
| `doctorId` | String | e.g., `DOC100001` (doctors only) |
| `specialization` | String | Medical specialization (doctors only) |
| `phone` | String | Contact number |
| `createdAt` | DateTime | Auto timestamp |

#### MedicalRecords
| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Auto-generated |
| `patientId` | String (indexed) | Owner patient's ID |
| `patientName` | String | Patient's name |
| `fileName` | String | Stored file name |
| `originalName` | String | Original upload name |
| `ipfsHash` | String | Pinata CID (content address) |
| `bigchainTxId` | String | BigchainDB transaction ID |
| `uploadedBy` | ObjectId | Receptionist who uploaded |
| `fileSize` | Number | File size in bytes |
| `mimeType` | String | File MIME type |
| `createdAt` | DateTime | Upload timestamp |

#### AccessPermissions
| Field | Type | Description |
|---|---|---|
| `patientId` | String | Patient granting access |
| `doctorId` | String | Doctor receiving access |
| `granted` | Boolean | Current permission state |
| `grantedAt` | DateTime | When access was granted |
| `revokedAt` | DateTime | When access was revoked (nullable) |
| *Unique Index* | | `(patientId, doctorId)` compound |

#### AccessLogs
| Field | Type | Description |
|---|---|---|
| `patientId` | String (indexed) | Whose record was accessed |
| `doctorId` | String | Who accessed it |
| `doctorName` | String | Doctor's display name |
| `fileName` | String | Which file was accessed |
| `ipfsHash` | String | IPFS hash of the file |
| `accessGranted` | Boolean | Was access successful? |
| `timestamp` | DateTime | When the attempt occurred |

### BigchainDB Assets

**File Record** (created on upload):
```json
{
  "type": "medical_record",
  "patientId": "PAT100001",
  "ipfsHash": "QmXnnyufdzAW...",
  "fileName": "blood_report.pdf",
  "uploadedBy": "receptionist@medchain.com",
  "timestamp": "2026-02-18T10:30:00.000Z"
}
```

**Access Log** (created on every access attempt):
```json
{
  "type": "access_log",
  "patientId": "PAT100001",
  "doctorId": "DOC100001",
  "doctorName": "Dr. Smith",
  "fileName": "blood_report.pdf",
  "accessGranted": true,
  "timestamp": "2026-02-18T11:00:00.000Z"
}
```

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | `{email, password}` | Login & set JWT cookie |
| `POST` | `/api/auth/logout` | — | Clear JWT cookie |
| `GET` | `/api/auth/me` | — | Get current user info |
| `POST` | `/api/auth/change-password` | `{currentPassword, newPassword}` | Change password |

### Receptionist Routes *(role: receptionist)*

| Method | Endpoint | Body / Query | Description |
|--------|----------|------------|-------------|
| `POST` | `/api/receptionist/register` | `{name, email, password, role, specialization?, phone?}` | Register doctor or patient |
| `POST` | `/api/receptionist/upload` | `FormData: {file, patientId}` | Encrypt → IPFS → Blockchain → MongoDB |
| `GET` | `/api/receptionist/users` | `?role=doctor\|patient` | List registered users |

### Patient Routes *(role: patient)*

| Method | Endpoint | Body / Query | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/patient/records` | — | Get own medical records |
| `GET` | `/api/patient/doctors` | — | List all registered doctors |
| `GET` | `/api/patient/permissions` | — | Get current permission settings |
| `POST` | `/api/patient/permissions` | `{doctorId, grant: boolean}` | Grant or revoke doctor access |
| `GET` | `/api/patient/access-logs` | — | View audit trail |

### Doctor Routes *(role: doctor)*

| Method | Endpoint | Body / Query | Description |
|--------|----------|------------|-------------|
| `GET` | `/api/doctor/patients` | — | List all registered patients |
| `GET` | `/api/doctor/search` | `?patientId=PAT100001` | Search patient records (if access granted) |
| `GET` | `/api/doctor/access` | `?recordId=<mongoId>` | Download & decrypt a medical record |

---

## 📋 Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| **Node.js** | ≥ 18.x | Runtime |
| **npm** | ≥ 9.x | Package manager |
| **Docker** | Latest | Run BigchainDB container |
| **MongoDB Atlas** | Cloud (free tier) | Database |
| **Pinata Account** | Free tier | IPFS file storage |

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd blockchain-fileview
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start BigchainDB (Docker)

```bash
docker pull bigchaindb/bigchaindb:all-in-one

docker run \
  --detach \
  --name bigchaindb \
  --publish 9984:9984 \
  --publish 9985:9985 \
  --publish 26657:26657 \
  bigchaindb/bigchaindb:all-in-one
```

Verify it's running:
```bash
curl http://localhost:9984/api/v1/
```

### 4. Setup MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas) → Create free cluster
2. Create a database user with read/write permissions
3. Whitelist your IP address (or `0.0.0.0/0` for development)
4. Copy the connection string

### 5. Setup Pinata (IPFS)

1. Go to [Pinata](https://pinata.cloud) → Create free account
2. Navigate to API Keys → Generate new key pair
3. Copy both `API Key` and `API Secret`

### 6. Configure Environment Variables

Create `.env.local` in the project root:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/medical-records
JWT_SECRET=your-secret-key-minimum-32-characters
AES_ENCRYPTION_KEY=<64-character-hex-string>
BIGCHAINDB_URL=http://localhost:9984/api/v1/
PINATA_API_KEY=your-pinata-api-key
PINATA_SECRET_KEY=your-pinata-secret-key
PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs
```

Generate an AES encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 7. Seed the Database

```bash
npx ts-node --project tsconfig.seed.json src/scripts/seed.ts
```

Creates three demo users (see [Demo Credentials](#-demo-credentials)).

---

## ▶️ Running the Application

**Development:**
```bash
npm run dev
```
Open **http://localhost:3000**

**Production:**
```bash
npm run build
npm start
```

---

## 🔑 Demo Credentials

| Role | Email | Password | ID |
|---|---|---|---|
| Receptionist | `receptionist@medchain.com` | `password123` | — |
| Doctor | `doctor@medchain.com` | `password123` | `DOC100001` |
| Patient | `patient@medchain.com` | `password123` | `PAT100001` |

---

## 🛡️ Security Features

| Feature | Implementation |
|---|---|
| **File Encryption** | AES-256-CBC with random IV per file; key stored server-side only |
| **Password Hashing** | bcryptjs with 12 salt rounds |
| **JWT Tokens** | HTTP-only cookies (XSS-safe), 8-hour expiry |
| **Role-Based Access** | API-level guards verify role before every request |
| **Patient Consent** | Doctors cannot access records without explicit patient grant |
| **Immutable Audit** | Every access attempt logged on BigchainDB — cannot be altered or deleted |
| **Decentralized Storage** | Files stored on IPFS — no single point of failure |
| **Middleware Protection** | All `/dashboard/*` routes require valid session cookie |

### Encryption Detail

```mermaid
flowchart TD
    subgraph ENCRYPT ["🔐 ENCRYPT"]
        direction TB
        E1["📄 File Buffer"] --> E2["🎲 Generate Random IV - 16 bytes"]
        E2 --> E3["🔒 AES-256-CBC Cipher<br/>key + IV"]
        E3 --> E4["📦 Prepend IV to Ciphertext"]
        E4 --> E5["🌐 Upload to IPFS - Pinata"]
    end

    subgraph DECRYPT ["🔓 DECRYPT"]
        direction TB
        D1["📦 Encrypted Buffer"] --> D2["✂️ Extract IV - first 16 bytes"]
        D2 --> D3["🔑 AES-256-CBC Decipher<br/>key + extracted IV"]
        D3 --> D4["📄 Decrypted Original Buffer"]
        D4 --> D5["👨‍⚕️ Serve to Authorized Doctor"]
    end

    style ENCRYPT fill:#fef3c7,stroke:#d97706,color:#000
    style DECRYPT fill:#dcfce7,stroke:#16a34a,color:#000
```

---

## 📜 License

This project was built as a college project demonstrating blockchain-based medical record management with AES-256 encryption.

---

<p align="center">
  Built with ❤️ using Next.js · BigchainDB · MongoDB · IPFS
</p>
