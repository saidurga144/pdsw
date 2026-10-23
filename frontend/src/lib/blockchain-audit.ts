import { ethers } from 'ethers';
import axios from 'axios';
import contractData from '@/contracts/PDSWDocumentAuditRegistry.json';
import { isMetaMaskInstalled, ensureSupportedNetwork } from './metamask';

export interface PinataUploadResult {
  success: boolean;
  ipfs_cid: string;
  file_hash: string;
  file_name: string;
  file_size: number;
  gateway_url: string;
  is_mock?: boolean;
}

export interface BlockchainRegisterResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  error?: string;
  cancelled?: boolean;
}

const PINATA_SERVICE_URL = process.env.NEXT_PUBLIC_PINATA_URL || 'http://localhost:5001';

// Use a relative proxy path so browser calls stay on same origin (avoids CORS errors).
// The Next.js API route at /api/ipfs/upload proxies server-to-server to the Pinata service.
const PINATA_UPLOAD_PATH = '/api/ipfs/upload';

const SEPOLIA_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || '11155111',
  10
);

// The Hardhat local deployment address — only valid on local Hardhat node, not on Sepolia
const HARDHAT_LOCAL_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'.toLowerCase();

// Use env var first; fall back to contract JSON; fall back to nothing
const _rawAddress =
  process.env.NEXT_PUBLIC_SEPOLIA_REGISTRY_ADDRESS?.trim() ||
  contractData.contractAddress?.trim() ||
  '';

// If no address is set OR it's the Hardhat local address, on-chain registration is disabled
export const REGISTRY_CONTRACT_ADDRESS = _rawAddress;

export function isBlockchainRegistrationEnabled(): boolean {
  if (!REGISTRY_CONTRACT_ADDRESS) return false;
  if (REGISTRY_CONTRACT_ADDRESS.toLowerCase() === HARDHAT_LOCAL_ADDRESS) return false;
  if (!/^0x[a-fA-F0-9]{40}$/.test(REGISTRY_CONTRACT_ADDRESS)) return false;
  return true;
}

/**
 * Uploads a document to the dedicated Pinata IPFS microservice.
 * Credentials are securely kept on the Pinata service and never exposed in client code.
 */
export async function uploadDocumentToPinata(
  file: File,
  documentId: string
): Promise<PinataUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_id', documentId);

  try {
    // Use the Next.js proxy route (/api/ipfs/upload) instead of calling the Pinata
    // service directly. This avoids CORS errors since it's a same-origin request.
    const res = await axios.post(PINATA_UPLOAD_PATH, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    if (!res.data?.success) {
      throw new Error(res.data?.error || 'Pinata upload failed.');
    }

    return res.data as PinataUploadResult;
  } catch (err: any) {
    const errorMsg =
      err.response?.data?.error ||
      err.response?.data?.details ||
      err.message ||
      'Failed to upload file to Pinata IPFS service.';
    throw new Error(errorMsg);
  }
}

/**
 * Registers the document audit record on Ethereum Sepolia smart contract using MetaMask.
 * Returns success:true with is_skipped:true if no valid contract address is configured.
 */
export async function registerDocumentOnSepolia(params: {
  documentId: string;
  ipfsCid: string;
  fileHash: string;
  role: string;
}): Promise<BlockchainRegisterResult & { is_skipped?: boolean }> {
  // If no valid Sepolia contract is configured, skip on-chain registration silently
  if (!isBlockchainRegistrationEnabled()) {
    console.info('[Blockchain] On-chain registration skipped — no valid Sepolia contract address configured.');
    return {
      success: true,
      is_skipped: true,
      txHash: '',
    };
  }

  if (!isMetaMaskInstalled()) {
    return {
      success: false,
      error: 'MetaMask is not installed. Please install MetaMask to submit blockchain transactions.',
    };
  }

  try {
    // 1. Ensure user is connected to Ethereum Sepolia Testnet
    await ensureSupportedNetwork(SEPOLIA_CHAIN_ID);

    // 2. Initialize Ethers BrowserProvider
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 3. Instantiate Contract
    const contract = new ethers.Contract(
      REGISTRY_CONTRACT_ADDRESS,
      contractData.abi,
      signer
    );

    // 4. Send transaction to Sepolia smart contract
    console.log(`[Blockchain] Registering document ${params.documentId} on Sepolia...`);
    const tx = await contract.registerDocument(
      params.documentId,
      params.ipfsCid,
      params.fileHash,
      params.role
    );

    console.log(`[Blockchain] Transaction submitted. Hash: ${tx.hash}. Waiting for block confirmation...`);
    const receipt = await tx.wait(1);

    if (receipt.status === 0) {
      return {
        success: false,
        txHash: tx.hash,
        error: 'Blockchain transaction reverted on Sepolia.',
      };
    }

    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err: any) {
    console.error('[Blockchain] Transaction failed:', err);

    // User cancelled in MetaMask
    if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
      return {
        success: false,
        cancelled: true,
        error: 'Transaction was cancelled by user in MetaMask.',
      };
    }

    if (err.message?.includes('DocumentAlreadyExists') || err.data?.message?.includes('DocumentAlreadyExists')) {
      return {
        success: false,
        error: `Document "${params.documentId}" is already registered in the Sepolia audit registry.`,
      };
    }

    return {
      success: false,
      error: err.message || 'Failed to submit transaction to Ethereum Sepolia testnet.',
    };
  }
}
