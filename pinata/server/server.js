/**
 * PDSW Pinata IPFS Microservice
 *
 * Features:
 * - Secure file validation
 * - SHA-256 file hashing
 * - Pinata SDK integration
 * - IPFS pinning
 * - File metadata
 * - Document ID support
 * - Configurable file-size limit
 * - Restricted CORS
 * - Health check
 * - Pinata authentication test
 * - Development simulation mode
 * - Compatible response fields (camelCase + snake_case)
 */

const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

// Pinata SDK
const { PinataSDK } = require("pinata");

// Load environment variables
dotenv.config({
  path: path.join(__dirname, "../.env"),
});

const app = express();

/* =========================================================
   CONFIGURATION
========================================================= */

const PORT = process.env.PORT || 5001;

const MAX_FILE_SIZE_MB = Number(
  process.env.MAX_FILE_SIZE_MB || 15
);

const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/* =========================================================
   CORS
========================================================= */

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without Origin header
      // (Postman, curl, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS policy: Origin not allowed")
      );
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/* =========================================================
   BODY PARSER
========================================================= */

app.use(express.json());

/* =========================================================
   PINATA CONFIGURATION
========================================================= */

const PINATA_JWT = process.env.PINATA_JWT;

let pinata = null;

if (PINATA_JWT && !isPlaceholderCredential(PINATA_JWT)) {
  pinata = new PinataSDK({
    pinataJwt: PINATA_JWT,
  });
}

/* =========================================================
   FILE CONFIGURATION
========================================================= */

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",

  "image/jpeg",
  "image/png",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".msi",
  ".vbs",
  ".js",
  ".py",
  ".scr",
  ".ps1",
  ".jar",
  ".com",
  ".pif",
  ".hta",
  ".cpl",
  ".reg",
]);

/* =========================================================
   MULTER
========================================================= */

// Keep memory storage from the original PDSW service.
// This avoids creating temporary files on disk.
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      return cb(
        new Error(
          `File type ${extension} is not allowed for security reasons.`
        )
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(
          `MIME type ${file.mimetype} is not allowed.`
        )
      );
    }

    cb(null, true);
  },
});

/* =========================================================
   HELPERS
========================================================= */

/**
 * Check whether a credential is a placeholder value.
 */
function isPlaceholderCredential(value) {
  if (!value) {
    return true;
  }

  const normalized = value
    .trim()
    .toLowerCase();

  const placeholders = [
    "your_pinata_jwt",
    "your-pinata-jwt",
    "your_pinata_api_key",
    "your-pinata-api-key",
    "your_api_key",
    "your-api-key",
    "your_secret",
    "your-secret",
    "replace_me",
    "replace-me",
    "changeme",
    "change_me",
  ];

  return placeholders.includes(normalized);
}

/**
 * Calculate SHA-256 hash.
 */
function calculateSHA256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

/**
 * Validate file after upload.
 */
function validateFile(file) {
  if (!file) {
    return {
      valid: false,
      message: "No file uploaded.",
    };
  }

  if (!file.buffer || !Buffer.isBuffer(file.buffer)) {
    return {
      valid: false,
      message: "Invalid file buffer.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      message: "Uploaded file is empty.",
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: `File size exceeds the ${MAX_FILE_SIZE_MB} MB limit.`,
    };
  }

  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (FORBIDDEN_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      message: `File extension ${extension} is forbidden.`,
    };
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return {
      valid: false,
      message: `MIME type ${file.mimetype} is not allowed.`,
    };
  }

  return {
    valid: true,
  };
}

/**
 * Test Pinata authentication.
 *
 * The Pinata SDK does not need the old Axios authentication
 * endpoint for normal uploads, so this uses the SDK's
 * authenticated request mechanism.
 */
async function testPinataAuth() {
  if (!pinata) {
    return {
      success: false,
      authenticated: false,
      message: "Pinata credentials are not configured.",
    };
  }

  try {
    /*
     * Pinata SDK authentication is verified by making
     * an authenticated request through the SDK.
     *
     * `pinata.testAuthentication()` is supported by
     * current Pinata SDK versions.
     */
    const result = await pinata.testAuthentication();

    return {
      success: true,
      authenticated: true,
      message: "Pinata authentication successful.",
      result,
    };
  } catch (error) {
    return {
      success: false,
      authenticated: false,
      message:
        error?.message ||
        "Pinata authentication failed.",
    };
  }
}

/**
 * Create a simulated CID for development/testing.
 */
function generateSimulatedCID(buffer) {
  const hash = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  // This is intentionally NOT a real IPFS CID.
  return `SIMULATED-${hash.substring(0, 32)}`;
}

/**
 * Build gateway URL.
 */
function buildGatewayUrl(cid) {
  if (!cid) {
    return null;
  }

  const gateway =
    process.env.PINATA_GATEWAY ||
    "https://gateway.pinata.cloud/ipfs";

  return `${gateway.replace(/\/$/, "")}/${cid}`;
}

/* =========================================================
   ROOT
========================================================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "PDSW Pinata IPFS Service",
    status: "running",
    version: "2.0.0",
  });
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/ipfs/health", (req, res) => {
  res.json({
    success: true,
    service: "PDSW Pinata IPFS Service",
    status: "healthy",
    pinataConfigured: Boolean(pinata),
    maxFileSizeMB: MAX_FILE_SIZE_MB,
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   PINATA AUTH TEST
========================================================= */

app.get("/api/ipfs/test-auth", async (req, res) => {
  try {
    const result = await testPinataAuth();

    if (!result.success) {
      return res.status(401).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error(
      "Pinata authentication error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to verify Pinata authentication.",
    });
  }
});

/* =========================================================
   IPFS UPLOAD
========================================================= */

app.post(
  "/api/ipfs/upload",
  upload.single("file"),
  async (req, res) => {
    const timestamp = new Date().toISOString();

    try {
      /* -----------------------------------------------------
         1. CHECK FILE
      ----------------------------------------------------- */

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded.",
          timestamp,
        });
      }

      /* -----------------------------------------------------
         2. VALIDATE FILE
      ----------------------------------------------------- */

      const validation = validateFile(req.file);

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          timestamp,
        });
      }

      const file = req.file;

      /* -----------------------------------------------------
         3. CALCULATE SHA-256
      ----------------------------------------------------- */

      const fileHash = calculateSHA256(file.buffer);

      /* -----------------------------------------------------
         4. DOCUMENT ID
      ----------------------------------------------------- */

      const documentId =
        req.body?.documentId ||
        req.body?.document_id ||
        crypto.randomUUID();

      /* -----------------------------------------------------
         5. CHECK PINATA CONFIGURATION
      ----------------------------------------------------- */

      const allowSimulation =
        process.env.NODE_ENV === "test" ||
        process.env.ALLOW_DEV_SIMULATION === "true";

      if (!pinata) {
        if (!allowSimulation) {
          return res.status(500).json({
            success: false,
            message:
              "Pinata credentials are not configured on the server.",
            timestamp,
          });
        }

        /* ---------------------------------------------------
           DEVELOPMENT SIMULATION
        --------------------------------------------------- */

        const simulatedCID =
          generateSimulatedCID(file.buffer);

        const gatewayUrl =
          buildGatewayUrl(simulatedCID);

        return res.status(200).json({
          success: true,

          cid: simulatedCID,
          ipfs_cid: simulatedCID,

          fileHash,
          file_hash: fileHash,
          sha256_hash: fileHash,

          fileName: file.originalname,
          file_name: file.originalname,

          fileSize: file.size,
          file_size: file.size,

          mimeType: file.mimetype,
          mime_type: file.mimetype,

          gatewayUrl,
          gateway_url: gatewayUrl,

          documentId,
          document_id: documentId,

          is_simulated: true,

          timestamp,
        });
      }

      /* -----------------------------------------------------
         6. CREATE FILE FOR PINATA SDK
      ----------------------------------------------------- */

      /*
       * Node's global File class is not guaranteed in every
       * Node.js version, so use the File implementation from
       * the `formdata-node` package if required.
       *
       * Modern Node.js versions can use the native File.
       */

      let PinataFile;

      if (typeof File !== "undefined") {
        PinataFile = File;
      } else {
        const { File: FormDataFile } = require("formdata-node");
        PinataFile = FormDataFile;
      }

      const pinataFile = new PinataFile(
        [file.buffer],
        file.originalname,
        {
          type: file.mimetype,
        }
      );

      /* -----------------------------------------------------
         7. PIN FILE USING PINATA SDK
      ----------------------------------------------------- */

      const uploadResult =
        await pinata.upload.public.file(pinataFile);

      if (!uploadResult || !uploadResult.cid) {
        throw new Error(
          "Pinata upload completed but no CID was returned."
        );
      }

      const cid = uploadResult.cid;

      /* -----------------------------------------------------
         8. GATEWAY URL
      ----------------------------------------------------- */

      const gatewayUrl =
        buildGatewayUrl(cid);

      /* -----------------------------------------------------
         9. RESPONSE
      ----------------------------------------------------- */

      return res.status(200).json({
        success: true,

        cid,
        ipfs_cid: cid,

        fileHash,
        file_hash: fileHash,
        sha256_hash: fileHash,

        fileName: file.originalname,
        file_name: file.originalname,

        fileSize: file.size,
        file_size: file.size,

        mimeType: file.mimetype,
        mime_type: file.mimetype,

        gatewayUrl,
        gateway_url: gatewayUrl,

        documentId,
        document_id: documentId,

        is_simulated: false,

        timestamp,
      });
    } catch (error) {
      /* -----------------------------------------------------
         MULTER ERRORS
      ----------------------------------------------------- */

      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: `File exceeds the ${MAX_FILE_SIZE_MB} MB limit.`,
            timestamp,
          });
        }

        return res.status(400).json({
          success: false,
          message: error.message,
          timestamp,
        });
      }

      /* -----------------------------------------------------
         VALIDATION / CORS / GENERAL ERRORS
      ----------------------------------------------------- */

      if (
        error?.message &&
        (
          error.message.includes("MIME type") ||
          error.message.includes("File type") ||
          error.message.includes("CORS policy")
        )
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          timestamp,
        });
      }

      /* -----------------------------------------------------
         PINATA ERROR
      ----------------------------------------------------- */

      console.error(
        "Pinata upload error:",
        error?.message || error
      );

      return res.status(502).json({
        success: false,
        message: "Failed to upload file to Pinata IPFS.",
        error:
          process.env.NODE_ENV === "development"
            ? error?.message
            : undefined,
        timestamp,
      });
    }
  }
);

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (
    error?.message &&
    (
      error.message.includes("MIME type") ||
      error.message.includes("File type") ||
      error.message.includes("CORS policy")
    )
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  console.error(
    "Unhandled server error:",
    error?.message || error
  );

  return res.status(500).json({
    success: false,
    message: "Internal server error.",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   START SERVER
========================================================= */

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `PDSW Pinata IPFS Microservice running on port ${PORT}`
    );

    console.log(
      `Maximum file size: ${MAX_FILE_SIZE_MB} MB`
    );

    console.log(
      `Pinata SDK configured: ${Boolean(pinata)}`
    );

    console.log(
      `Allowed CORS origins: ${ALLOWED_ORIGINS.join(", ")}`
    );
  });
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = app;