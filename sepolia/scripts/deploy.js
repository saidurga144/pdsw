const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting deployment of PDSWDocumentAuditRegistry to network:", hre.network.name);

  const [deployer] = await hre.ethers.getSigners();
  if (deployer) {
    console.log("Deploying contract with account:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  }

  const RegistryFactory = await hre.ethers.getContractFactory("PDSWDocumentAuditRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log("✔ PDSWDocumentAuditRegistry deployed to:", contractAddress);

  const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "PDSWDocumentAuditRegistry.sol", "PDSWDocumentAuditRegistry.json");
  let artifactAbi = [];
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    artifactAbi = artifact.abi;
  }

  const exportData = {
    contractAddress: contractAddress,
    network: hre.network.name,
    chainId: hre.network.config.chainId || 11155111,
    deployedAt: new Date().toISOString(),
    abi: artifactAbi
  };

  const abiDestDir = path.join(__dirname, "..", "abi");
  if (!fs.existsSync(abiDestDir)) {
    fs.mkdirSync(abiDestDir, { recursive: true });
  }
  const abiDestPath = path.join(abiDestDir, "PDSWDocumentAuditRegistry.json");
  fs.writeFileSync(abiDestPath, JSON.stringify(exportData, null, 2));
  console.log("✔ Exported ABI & address to:", abiDestPath);

  const frontendContractsDir = path.join(__dirname, "..", "..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) {
    fs.mkdirSync(frontendContractsDir, { recursive: true });
  }
  const frontendAbiPath = path.join(frontendContractsDir, "PDSWDocumentAuditRegistry.json");
  fs.writeFileSync(frontendAbiPath, JSON.stringify(exportData, null, 2));
  console.log("✔ Exported ABI & address to frontend:", frontendAbiPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
