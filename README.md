# PDSW – Public Distribution System Welfare Platform

### AI-Driven Privacy-Preserving Blockchain Framework for Secure and Fraud-Resistant Public Distribution System

PDSW is a secure digital platform designed to improve transparency, accountability, data integrity, and fraud detection in the Public Distribution System (PDS).

The platform integrates Role-Based Access Control (RBAC), Artificial Intelligence (AI), cryptographic integrity verification, blockchain technology, and IPFS-based document storage to provide a more secure and traceable distribution management system.

---

## 1. Project Overview

Traditional Public Distribution Systems face challenges such as unauthorized beneficiary modifications, fraudulent activities, record manipulation, limited traceability, and privacy concerns.

PDSW addresses these challenges through a centralized application with decentralized verification capabilities.

The system provides separate portals for different user roles, ensuring that users can access only the functionalities permitted by their assigned responsibilities.

## 2. Key Features

* **Role-Based Access Control:** Separate access permissions for Administrator, PDS Officer, SOC Analyst, and Beneficiary.
* **Beneficiary Management:** Manage beneficiary profiles, family information, ration cards, and entitlements.
* **Modification Requests:** Allow beneficiaries to submit profile modification requests for authorized verification.
* **Commodity Distribution:** Manage commodity allocation, release, and distribution records.
* **Blockchain Integration:** Record relevant transaction information on the Sepolia Ethereum test network.
* **IPFS Document Storage:** Store supporting documents using decentralized content-addressed storage through Pinata.
* **Cryptographic Integrity Verification:** Use hashing mechanisms to identify unauthorized changes to records.
* **AI-Based Anomaly Detection:** Identify suspicious activities and potentially fraudulent distribution patterns.
* **Audit Trail:** Maintain traceable records of important system operations.
* **Security Monitoring:** Provide security-related information and monitoring capabilities.

## 3. User Roles

| Role          | Responsibilities                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Administrator | Manage users, roles, system configurations, and administrative activities.                       |
| PDS Officer   | Manage beneficiaries, review modification requests, and handle commodity distribution.           |
| SOC Analyst   | Monitor security events, investigate suspicious activities, and review security alerts.          |
| Beneficiary   | View personal information, entitlements, distribution history, and submit modification requests. |




## 4. System Architecture

The PDSW architecture consists of the following major components:

1. **Frontend Layer:** Provides role-specific dashboards and user interfaces.
2. **Backend Layer:** Handles authentication, authorization, business logic, and API requests.
3. **Database Layer:** Stores beneficiary information, user records, distribution details, and application data.
4. **Blockchain Layer:** Supports transaction verification and tamper-resistant transaction records.
5. **IPFS Layer:** Handles decentralized document storage through the Pinata service.
6. **AI Security Layer:** Supports anomaly detection and identification of suspicious activities.

### Application Workflow

1. Users access the platform through the frontend.
2. Authentication verifies user credentials and assigned roles.
3. The backend processes authorized requests.
4. Application data is stored and retrieved from MongoDB Atlas.
5. Relevant documents are uploaded through the Pinata microservice.
6. Relevant blockchain transactions are submitted to the Sepolia network.
7. Security and audit mechanisms help monitor system activities.


## 6. Prerequisites

Install the following tools before running the application:

* Node.js and npm
* Python 3.12 or compatible version
* Git
* MongoDB Atlas account
* MetaMask browser extension
* Pinata account
* Sepolia test network access

## 8. Installation and Setup

### Step 1: Clone the Repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd PDSW
```

### Step 2: Configure the Frontend

```bash
cd frontend
npm install
```

Create the required frontend environment configuration.

Start the development server:

```bash
npm run dev
```

### Step 3: Configure the Backend

Return to the project root:

```bash
cd ..
```

Create and activate a Python virtual environment:

```bash
python -m venv backend/.venv
```

Windows:

```bash
backend\.venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r backend/requirements.txt
```

Start the FastAPI server from the project root:

```bash
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8002
```

### Step 4: Configure the Pinata Microservice

```bash
cd pinata
npm install
npm start
```

The service runs on the configured local port, which is 5001 in the current development setup.

### Step 5: Configure Blockchain

Navigate to the Sepolia directory:

```bash
cd sepolia
npm install
```


## 9. Environment Variables


### Backend Environment

Configure the backend environment file with the required values:

```env
ENVIRONMENT=development
MONGODB_URI=your_mongodb_connection_string
MONGODB_DATABASE=Database Name
JWT_SECRET=your_jwt_secret
JWT_ALGORITHM=Hashing
ACCESS_TOKEN_EXPIRE_MINUTES=48
ALLOWED_ORIGINS=your_frontend_origin
```

### Pinata Environment

Configure these variables in the Pinata service environment:

```env
NODE_ENV=production
PINATA_JWT=your_pinata_jwt
MAX_FILE_SIZE_MB=Max Limit
ALLOWED_ORIGINS=your_frontend_origin
```

### Frontend Environment

Configure the appropriate frontend environment variables for the backend API and blockchain integration.

For the server-side IPFS upload route, configure:

```env
PINATA_SERVICE_URL=your_render_pinata_service_url
```



## 10. Security Considerations

* Enforce role-based authorization on backend endpoints.
* Validate user input and uploaded files.
* Keep authentication secrets and API tokens server-side.
* Restrict cross-origin requests to trusted application origins.
* Verify cryptographic hashes when checking record integrity.
* Validate blockchain transaction results.
* Protect beneficiary information from unauthorized access.
* Maintain audit records for important operations.

## 11. Testing

Test the following areas before production deployment:

* User registration and authentication.
* Role-based access restrictions.
* Beneficiary management.
* Modification request workflows.
* Commodity distribution operations.
* Document upload and retrieval.
* Blockchain transaction verification.
* Data integrity verification.
* AI-based anomaly detection.
* API security and error handling.

## 12. Future Enhancements

* Advanced AI-based fraud detection.
* Improved security event correlation.
* Automated incident alerting.
* Enhanced blockchain transaction monitoring.
* Advanced audit analytics.
* Improved performance and scalability.

## 13. Contributors

**Project:** Public Distribution System Welfare Platform (PDSW)

**Research and Development Team:**

* Dungala Sai Kumar


**Institution:** Kalasalingam Academy of Research and Education

## 15. License

This project is developed for academic research and educational purposes. Licensing and reuse permissions should be defined by the project owners.
