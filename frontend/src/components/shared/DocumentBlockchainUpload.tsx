'use client';

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileCheck,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';
import { uploadDocumentToPinata, registerDocumentOnSepolia, isBlockchainRegistrationEnabled } from '@/lib/blockchain-audit';
import { useAuthStore } from '@/stores/auth.store';

interface DocumentBlockchainUploadProps {
  documentId?: string;
  onUploadSuccess?: (data: {
    documentId: string;
    ipfsCid: string;
    fileHash: string;
    txHash: string;
    gatewayUrl: string;
    fileName: string;
  }) => void;
  className?: string;
}

export const DocumentBlockchainUpload: React.FC<DocumentBlockchainUploadProps> = ({
  documentId: initialDocId,
  onUploadSuccess,
  className = '',
}) => {
  const { user, role } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docId, setDocId] = useState(
    initialDocId || `DOC-${role.substring(0, 3)}-${Date.now().toString().slice(-6)}`
  );

  const [uploadStep, setUploadStep] = useState<
    'IDLE' | 'PINATA_UPLOADING' | 'METAMASK_TX' | 'CONFIRMING' | 'SUCCESS' | 'ERROR'
  >('IDLE');

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Result data
  const [uploadResult, setUploadResult] = useState<{
    ipfsCid: string;
    fileHash: string;
    txHash: string;
    gatewayUrl: string;
    fileName: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setErrorMessage('');
      
      // Extension and MIME verification
      const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
      const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
      if (!allowedExts.includes(fileExt)) {
        setErrorMessage(`Invalid file format: ${fileExt}. Allowed formats: PDF, DOC, DOCX, JPG, PNG.`);
        return;
      }

      // 15MB limit
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage('File exceeds the 15MB maximum size limit.');
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
      setUploadStep('IDLE');
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStartUploadAndBlockchainRegister = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a document file first.');
      return;
    }

    setErrorMessage('');
    setStatusMessage('1/3 Uploading document and generating SHA-256 digest on Pinata IPFS...');
    setUploadStep('PINATA_UPLOADING');

    try {
      // Step 1: Upload to Pinata Service
      const pinataRes = await uploadDocumentToPinata(selectedFile, docId);
      const { ipfs_cid, file_hash, gateway_url, file_name } = pinataRes;

      // Step 2: Prompt user for MetaMask transaction
      setStatusMessage('2/3 Please confirm the smart contract transaction in your MetaMask wallet...');
      setUploadStep('METAMASK_TX');

      const blockchainRes = await registerDocumentOnSepolia({
        documentId: docId,
        ipfsCid: ipfs_cid,
        fileHash: file_hash,
        role: role || 'BENEFICIARY',
      });

      if (!blockchainRes.success) {
        if (blockchainRes.cancelled) {
          setErrorMessage('Transaction was cancelled in MetaMask. Document was uploaded to IPFS but not written to blockchain. You may still submit your request — the IPFS reference is recorded.');
        } else {
          setErrorMessage(blockchainRes.error || 'Failed to confirm transaction on Ethereum Sepolia testnet.');
        }
        setUploadStep('ERROR');
        return;
      }

      const wasSkipped = (blockchainRes as any).is_skipped === true;
      setStatusMessage(
        wasSkipped
          ? '3/3 Document uploaded to IPFS. On-chain registration is not configured for this environment.'
          : '3/3 Confirmed! Transaction recorded on Ethereum Sepolia blockchain.'
      );
      setUploadStep('SUCCESS');

      const finalResult = {
        documentId: docId,
        ipfsCid: ipfs_cid,
        fileHash: file_hash,
        txHash: wasSkipped ? 'IPFS_ONLY' : (blockchainRes.txHash || ''),
        gatewayUrl: gateway_url,
        fileName: file_name,
      };

      setUploadResult(finalResult);

      if (onUploadSuccess) {
        onUploadSuccess(finalResult);
      }
    } catch (err: any) {
      console.error('Upload flow error:', err);
      setErrorMessage(err.message || 'Failed to complete document upload & blockchain registration.');
      setUploadStep('ERROR');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadStep('IDLE');
    setErrorMessage('');
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`min-w-0 bg-card border border-border rounded-lg p-4 sm:p-5 space-y-4 shadow-sm ${className}`}>
      <div className="flex items-start justify-between border-b border-border pb-3 gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="shrink-0 p-1.5 rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {isBlockchainRegistrationEnabled()
                ? 'Document IPFS & Sepolia Blockchain Registration'
                : 'Document IPFS Upload (Optional)'}
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {isBlockchainRegistrationEnabled()
                ? 'Dual-layer cryptographic provenance with Pinata IPFS and immutable Sepolia smart contracts'
                : 'Attach supporting documents. Upload is optional — you can submit your request without it.'}
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-xs">
          <AlertTriangle className="size-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Operation Failed</p>
            <p className="text-[11px] leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">
          Document Identifier <span className="text-primary">*</span>
        </label>
        <input
          type="text"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          disabled={uploadStep !== 'IDLE' && uploadStep !== 'ERROR'}
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          placeholder="e.g. DOC-BEN-2026-0001"
        />
      </div>

      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border hover:border-primary/60 bg-secondary/20 hover:bg-secondary/40 rounded-lg p-6 text-center cursor-pointer transition-colors space-y-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={handleFileChange}
          />
          <div className="p-3 bg-background rounded-full w-fit mx-auto shadow-sm text-primary">
            <Upload className="size-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              Click to select or drag and drop verification document
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 15MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-border bg-secondary/30 rounded-md flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5 overflow-hidden">
            <FileText className="size-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground truncate">{selectedFile.name}</p>
              <p className="text-[10px] text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for cryptographic hashing
              </p>
            </div>
          </div>
          {uploadStep !== 'PINATA_UPLOADING' && uploadStep !== 'METAMASK_TX' && uploadStep !== 'CONFIRMING' && (
            <button
              type="button"
              onClick={handleReset}
              className="shrink-0 p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
              aria-label="Remove selected document"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}

      {(uploadStep === 'PINATA_UPLOADING' ||
        uploadStep === 'METAMASK_TX' ||
        uploadStep === 'CONFIRMING') && (
        <div className="p-4 border border-primary/30 bg-primary/5 rounded-md space-y-3">
          <div className="flex items-start gap-3">
            <Loader2 className="size-5 text-primary animate-spin" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-primary">Cryptographic Verification in Progress</p>
              <p className="text-[11px] text-foreground font-medium leading-relaxed">{statusMessage}</p>
            </div>
          </div>
          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary transition-all duration-500 ${
                uploadStep === 'PINATA_UPLOADING'
                  ? 'w-1/3'
                  : uploadStep === 'METAMASK_TX'
                  ? 'w-2/3'
                  : 'w-full'
              }`}
            />
          </div>
        </div>
      )}

      {uploadStep === 'SUCCESS' && uploadResult && (
        <div className="p-4 border border-green-500/30 bg-green-500/10 rounded-md space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-2 text-green-400 font-bold text-xs">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="min-w-0 leading-relaxed">Document Successfully Recorded on Sepolia Blockchain!</span>
          </div>

          <div className="space-y-2 text-[11px]">
            <div className="flex min-w-0 items-center justify-between gap-3 p-2 bg-background/60 rounded border border-border/50">
              <span className="shrink-0 font-semibold text-muted-foreground text-xs">IPFS CID:</span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 font-mono text-foreground overflow-hidden">
                <span className="technical-value font-mono text-[11px] text-right" title={uploadResult.ipfsCid}>
                  {uploadResult.ipfsCid}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(uploadResult.ipfsCid, 'cid')}
                  className="shrink-0 p-1 hover:text-primary transition-colors"
                  title="Copy IPFS CID"
                  aria-label="Copy IPFS CID"
                >
                  {copiedField === 'cid' ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>
                <a
                  href={uploadResult.gatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1 hover:text-primary transition-colors"
                  title="View on IPFS Gateway"
                  aria-label="View on IPFS Gateway"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 p-2 bg-background/60 rounded border border-border/50">
              <span className="shrink-0 font-semibold text-muted-foreground text-xs">SHA-256 Digest:</span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 font-mono text-foreground overflow-hidden">
                <span className="technical-value font-mono text-[11px] text-right" title={uploadResult.fileHash}>
                  {uploadResult.fileHash}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(uploadResult.fileHash, 'hash')}
                  className="shrink-0 p-1 hover:text-primary transition-colors"
                  title="Copy SHA-256"
                  aria-label="Copy SHA-256 Digest"
                >
                  {copiedField === 'hash' ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex min-w-0 items-center justify-between gap-3 p-2 bg-background/60 rounded border border-border/50">
              <span className="shrink-0 font-semibold text-muted-foreground text-xs">Sepolia Tx Hash:</span>
              <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 font-mono text-foreground overflow-hidden">
                <span className="technical-value font-mono text-[11px] text-right" title={uploadResult.txHash}>
                  {uploadResult.txHash}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(uploadResult.txHash, 'tx')}
                  className="shrink-0 p-1 hover:text-primary transition-colors"
                  title="Copy Transaction Hash"
                  aria-label="Copy Sepolia Transaction Hash"
                >
                  {copiedField === 'tx' ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                </button>
                {uploadResult.txHash && uploadResult.txHash.startsWith('0x') && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${uploadResult.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 hover:text-primary transition-colors"
                    title="View on Sepolia Etherscan"
                    aria-label="View on Sepolia Etherscan"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {uploadStep === 'SUCCESS' ? (
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-md transition-colors"
          >
            Upload Another Document
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStartUploadAndBlockchainRegister}
            disabled={
              !selectedFile ||
              uploadStep === 'PINATA_UPLOADING' ||
              uploadStep === 'METAMASK_TX' ||
              uploadStep === 'CONFIRMING'
            }
            className="w-full sm:w-auto px-5 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-md transition-all shadow-subtle flex items-center justify-center gap-2"
          >
            {uploadStep === 'PINATA_UPLOADING' || uploadStep === 'METAMASK_TX' ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <FileCheck className="size-4" />
                <span>{isBlockchainRegistrationEnabled() ? 'Upload to Pinata & Write to Sepolia' : 'Upload to IPFS'}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
