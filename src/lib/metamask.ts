/**
 * MetaMask & SIWE (EIP-4361) Client Utilities for PDSW Portal
 */

export const METAMASK_DOWNLOAD_URL = "https://metamask.io/download/";

// Default supported chain ID (Sepolia: 11155111, Ethereum Mainnet: 1, Hardhat: 31337)
export const DEFAULT_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_CHAIN_ID || "11155111",
  10,
);

export const SUPPORTED_NETWORKS: Record<
  number,
  { name: string; hexId: string; rpcUrls?: string[] }
> = {
  1: { name: "Ethereum Mainnet", hexId: "0x1" },
  11155111: {
    name: "Sepolia Testnet",
    hexId: "0xaa36a7",
    rpcUrls: ["https://rpc.sepolia.org"],
  },
  31337: {
    name: "Hardhat Localhost",
    hexId: "0x7a69",
    rpcUrls: ["http://127.0.0.1:8545"],
  },
  1337: {
    name: "Ganache Localhost",
    hexId: "0x539",
    rpcUrls: ["http://127.0.0.1:8545"],
  },
};

/**
 * Checks if MetaMask / window.ethereum is available in the browser
 */
export function isMetaMaskInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    typeof window.ethereum !== "undefined" &&
    (window.ethereum.isMetaMask ||
      typeof window.ethereum.request === "function"),
  );
}

/**
 * Redirects user to the official MetaMask download page
 */
export function redirectToMetaMaskDownload(): void {
  if (typeof window !== "undefined") {
    window.open(METAMASK_DOWNLOAD_URL, "_blank", "noopener,noreferrer");
  }
}

/**
 * Shortens Ethereum address to format: 0x1234...ABCD
 */
export function shortenAddress(address?: string | null): string {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Requests wallet accounts connection from MetaMask
 */
export async function requestMetaMaskAccounts(): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error("METAMASK_NOT_INSTALLED");
  }

  try {
    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];

    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts authorized in MetaMask.");
    }

    return accounts[0];
  } catch (err: any) {
    if (err.code === 4001) {
      throw new Error("User rejected wallet connection request.");
    }
    throw new Error(err.message || "Failed to connect to MetaMask wallet.");
  }
}

/**
 * Retrieves the current connected chain ID from MetaMask
 */
export async function getCurrentChainId(): Promise<number> {
  if (!isMetaMaskInstalled()) return DEFAULT_CHAIN_ID;
  try {
    const hexChainId = (await window.ethereum.request({
      method: "eth_chainId",
    })) as string;
    return parseInt(hexChainId, 16);
  } catch {
    return DEFAULT_CHAIN_ID;
  }
}

/**
 * Ensures user is connected to the supported network or prompts a network switch
 */
export async function ensureSupportedNetwork(
  targetChainId: number = DEFAULT_CHAIN_ID,
): Promise<void> {
  if (!isMetaMaskInstalled()) return;

  try {
    const currentChain = await getCurrentChainId();
    if (currentChain === targetChainId) return;

    const targetNetwork = SUPPORTED_NETWORKS[targetChainId];
    const hexChainId =
      targetNetwork?.hexId || `0x${targetChainId.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
    } catch (switchError: any) {
      // Chain not added to MetaMask (error 4902)
      if (switchError.code === 4902 && targetNetwork?.rpcUrls) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChainId,
              chainName: targetNetwork.name,
              rpcUrls: targetNetwork.rpcUrls,
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  } catch (err: any) {
    if (err.code === 4001) {
      throw new Error("User rejected network switch in MetaMask.");
    }
    console.warn("Network switch warning:", err.message);
  }
}

/**
 * Builds standard EIP-4361 / SIWE authentication challenge message
 */
export function createSiweMessage(params: {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version?: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
}): string {
  const statement =
    params.statement ||
    "Sign in to Public Distribution System Welfare (PDSW) Government Portal with your verified wallet.";
  const version = params.version || "1";

  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    "",
    statement,
    "",
    `URI: ${params.uri}`,
    `Version: ${version}`,
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt}`,
    `Expiration Time: ${params.expirationTime}`,
  ].join("\n");
}

/**
 * Requests cryptographic signature of the SIWE message via personal_sign
 */
export async function signSiweMessage(
  message: string,
  address: string,
): Promise<string> {
  if (!isMetaMaskInstalled()) {
    throw new Error("METAMASK_NOT_INSTALLED");
  }

  try {
    const signature = (await window.ethereum.request({
      method: "personal_sign",
      params: [message, address],
    })) as string;

    if (!signature) {
      throw new Error("No signature returned from wallet.");
    }

    return signature;
  } catch (err: any) {
    if (err.code === 4001) {
      throw new Error("Signature request was rejected in MetaMask.");
    }
    throw new Error(err.message || "Failed to sign authentication message.");
  }
}
