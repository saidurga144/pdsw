// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PDSWDocumentAuditRegistry
 * @dev Immutable on-chain registry for government Public Distribution System Welfare (PDSW) documents.
 * Stores document cryptographic SHA-256 hashes, IPFS CIDs, uploader identities, and roles.
 */
contract PDSWDocumentAuditRegistry {
    struct AuditRecord {
        string documentId;
        string ipfsCid;
        string fileHash;
        address uploader;
        string role;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => AuditRecord) private records;
    mapping(string => string) private hashToDocumentId;

    uint256 public totalDocuments;

    event DocumentRegistered(
        string indexed documentId,
        string ipfsCid,
        string fileHash,
        address indexed uploader,
        string role,
        uint256 timestamp
    );

    error DocumentAlreadyExists(string documentId);
    error InvalidEmptyParameter(string paramName);
    error DocumentNotFound(string documentId);

    /**
     * @notice Registers a new document audit record on Sepolia
     * @param documentId Unique identifier of the government application/document
     * @param ipfsCid IPFS Content Identifier where the encrypted document is pinned
     * @param fileHash Cryptographic SHA-256 hash of the document content
     * @param role User role claiming upload (e.g., BENEFICIARY, OFFICER, ADMIN)
     */
    function registerDocument(
        string calldata documentId,
        string calldata ipfsCid,
        string calldata fileHash,
        string calldata role
    ) external returns (bool) {
        if (bytes(documentId).length == 0) revert InvalidEmptyParameter("documentId");
        if (bytes(ipfsCid).length == 0) revert InvalidEmptyParameter("ipfsCid");
        if (bytes(fileHash).length == 0) revert InvalidEmptyParameter("fileHash");
        if (bytes(role).length == 0) revert InvalidEmptyParameter("role");

        if (records[documentId].exists) {
            revert DocumentAlreadyExists(documentId);
        }

        records[documentId] = AuditRecord({
            documentId: documentId,
            ipfsCid: ipfsCid,
            fileHash: fileHash,
            uploader: msg.sender,
            role: role,
            timestamp: block.timestamp,
            exists: true
        });

        hashToDocumentId[fileHash] = documentId;
        totalDocuments += 1;

        emit DocumentRegistered(
            documentId,
            ipfsCid,
            fileHash,
            msg.sender,
            role,
            block.timestamp
        );

        return true;
    }

    /**
     * @notice Retrieves audit record details by documentId
     */
    function getDocument(string calldata documentId) external view returns (AuditRecord memory) {
        if (!records[documentId].exists) {
            revert DocumentNotFound(documentId);
        }
        return records[documentId];
    }

    /**
     * @notice Checks if a document exists by documentId
     */
    function documentExists(string calldata documentId) external view returns (bool) {
        return records[documentId].exists;
    }

    /**
     * @notice Cryptographically verifies if the computed file hash matches the on-chain record
     */
    function verifyDocumentHash(
        string calldata documentId,
        string calldata expectedHash
    ) external view returns (bool) {
        if (!records[documentId].exists) {
            return false;
        }
        return keccak256(bytes(records[documentId].fileHash)) == keccak256(bytes(expectedHash));
    }
}
