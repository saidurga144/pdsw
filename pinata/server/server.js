const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { PinataSDK } = require("pinata");

dotenv.config({
  path: path.join(__dirname, "../.env"),
});

const app = express();

const PORT = process.env.PORT || 5001;
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 15);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: Origin not allowed"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Simple sliding-window upload rate limiter (20 uploads / minute per IP)
const uploadRateMap = new Map();
function uploadRateLimiter(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxUploads = 20;

  let records = uploadRateMap.get(ip) || [];
  records = records.filter((ts) => ts > now - windowMs);

  if (records.length >= maxUploads) {
    res.setHeader("Retry-After", "60");
    return res.status(429).json({
      success: false,
      message: "Upload rate limit exceeded. Please wait before uploading more files.",
      retryAfterSeconds: 60,
    });
  }

  records.push(now);
  uploadRateMap.set(ip, records);
  next();
}

app.use(express.json());

const PINATA_JWT = process.env.PINATA_JWT;
let pinata = null;

if (PINATA_JWT && !isPlaceholderCredential(PINATA_JWT)) {
  pinata = new PinataSDK({
    pinataJwt: PINATA_JWT,
  });
}

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      return cb(
        new Error(`File type ${extension} is not allowed for security reasons.`)
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(`MIME type ${file.mimetype} is not allowed.`)
      );
    }

    cb(null, true);
  },
});

function isPlaceholderCredential(value) {
  if (!value) {
    return true;
  }

  const normalized = value.trim().toLowerCase();
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

function calculateSHA256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

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

  const extension = path.extname(file.originalname).toLowerCase();

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

  return { valid: true };
}

async function testPinataAuth() {
  if (!pinata) {
    return {
      success: false,
      authenticated: false,
      message: "Pinata credentials are not configured.",
    };
  }

  try {
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
      message: error?.message || "Pinata authentication failed.",
    };
  }
}

function generateSimulatedCID(buffer) {
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return `SIMULATED-${hash.substring(0, 32)}`;
}

function buildGatewayUrl(cid) {
  if (!cid) {
    return null;
  }
  const gateway =
    process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs";
  return `${gateway.replace(/\/$/, "")}/${cid}`;
}

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "PDSW Pinata IPFS Service",
    status: "running",
    version: "2.0.0",
  });
});

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

app.get("/api/ipfs/test-auth", async (req, res) => {
  try {
    const result = await testPinataAuth();
    if (!result.success) {
      return res.status(401).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Pinata authentication error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to verify Pinata authentication.",
    });
  }
});

app.post("/api/ipfs/upload", uploadRateLimiter, upload.single("file"), async (req, res) => {
  const timestamp = new Date().toISOString();

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
        timestamp,
      });
    }

    const validation = validateFile(req.file);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
        timestamp,
      });
    }

    const file = req.file;
    const fileHash = calculateSHA256(file.buffer);
    const documentId =
      req.body?.documentId || req.body?.document_id || crypto.randomUUID();

    const allowSimulation =
      process.env.NODE_ENV === "test" ||
      process.env.ALLOW_DEV_SIMULATION === "true";

    if (!pinata) {
      if (!allowSimulation) {
        return res.status(500).json({
          success: false,
          message: "Pinata credentials are not configured on the server.",
          timestamp,
        });
      }

      const simulatedCID = generateSimulatedCID(file.buffer);
      const gatewayUrl = buildGatewayUrl(simulatedCID);

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

    let PinataFile;
    if (typeof File !== "undefined") {
      PinataFile = File;
    } else {
      const { File: FormDataFile } = require("formdata-node");
      PinataFile = FormDataFile;
    }

    const pinataFile = new PinataFile([file.buffer], file.originalname, {
      type: file.mimetype,
    });

    const uploadResult = await pinata.upload.public.file(pinataFile);
    if (!uploadResult || !uploadResult.cid) {
      throw new Error("Pinata upload completed but no CID was returned.");
    }

    const cid = uploadResult.cid;
    const gatewayUrl = buildGatewayUrl(cid);

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

    if (
      error?.message &&
      (error.message.includes("MIME type") ||
        error.message.includes("File type") ||
        error.message.includes("CORS policy"))
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
        timestamp,
      });
    }

    console.error("Pinata upload error:", error?.message || error);
    return res.status(502).json({
      success: false,
      message: "Failed to upload file to Pinata IPFS.",
      error:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
      timestamp,
    });
  }
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (
    error?.message &&
    (error.message.includes("MIME type") ||
      error.message.includes("File type") ||
      error.message.includes("CORS policy"))
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  console.error("Unhandled server error:", error?.message || error);
  return res.status(500).json({
    success: false,
    message: "Internal server error.",
    timestamp: new Date().toISOString(),
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`PDSW Pinata IPFS Microservice running on port ${PORT}`);
    console.log(`Maximum file size: ${MAX_FILE_SIZE_MB} MB`);
    console.log(`Pinata SDK configured: ${Boolean(pinata)}`);
    console.log(`Allowed CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

module.exports = app;