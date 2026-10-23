# PDS Welfare System — Runbook

## 1. Backend (FastAPI)
```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8002
```

## 2. Pinata IPFS Service
```powershell
cd pinata
node server/server.js
```

## 3. Frontend (Next.js)
```powershell
cd frontend
npm run dev
```

---

## 4. Clean Slate & First-Time Administrator Setup

The system starts with **0 users** (no demo/mock accounts).

### Step 1: Open the Setup Page
Navigate to:
```text
http://localhost:3000/setup
```

### Step 2: Initialize Administrator
Enter:
1. **Bootstrap Secret Token**: `pdsw-bootstrap-secret-change-me-2026` (configured in `backend/.env` under `BOOTSTRAP_ADMIN_SECRET`)
2. **Administrator Full Name**
3. **Official Email Address**
4. **Password**

Click **Initialize System**.

> **Note:** Once the first Administrator account is created, the bootstrap endpoint is **permanently disabled** (future attempts return `409 Conflict`).

### Step 3: Login & Provision Staff
1. Log in at `http://localhost:3000/auth/login` using your Admin credentials.
2. Go to **User Directory & Staff Provisioning** (`/admin/users`).
3. Click **+ Provision User Account** to create PDS Officers, SOC Analysts, Auditors, or Beneficiaries.
