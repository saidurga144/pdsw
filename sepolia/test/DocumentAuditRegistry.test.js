const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PDSWDocumentAuditRegistry Smart Contract", function () {
  let registry;
  let owner;
  let beneficiary;
  let officer;

  beforeEach(async function () {
    [owner, beneficiary, officer] = await ethers.getSigners();

    const RegistryFactory = await ethers.getContractFactory("PDSWDocumentAuditRegistry");
    registry = await RegistryFactory.deploy();
    await registry.waitForDeployment();
  });

  it("should deploy with 0 initial documents", async function () {
    expect(await registry.totalDocuments()).to.equal(0);
  });

  it("should successfully register a document and emit DocumentRegistered event", async function () {
    const documentId = "DOC-BEN-2026-0001";
    const ipfsCid = "QmPDSW5f3c407a29ae56b45071d639274790ce";
    const fileHash = "0x5f3c407a29ae56b45071d639274790ce70a497b48734a51a5ebcd024e264e2df";
    const role = "BENEFICIARY";

    await expect(
      registry.connect(beneficiary).registerDocument(documentId, ipfsCid, fileHash, role)
    )
      .to.emit(registry, "DocumentRegistered")
      .withArgs(documentId, ipfsCid, fileHash, beneficiary.address, role, (val) => val > 0);

    expect(await registry.totalDocuments()).to.equal(1);
    expect(await registry.documentExists(documentId)).to.be.true;

    const record = await registry.getDocument(documentId);
    expect(record.documentId).to.equal(documentId);
    expect(record.ipfsCid).to.equal(ipfsCid);
    expect(record.fileHash).to.equal(fileHash);
    expect(record.uploader).to.equal(beneficiary.address);
    expect(record.role).to.equal(role);
    expect(record.exists).to.be.true;
  });

  it("should verify document hash correctly", async function () {
    const documentId = "DOC-BEN-2026-0002";
    const ipfsCid = "QmTestCid12345";
    const fileHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const role = "OFFICER";

    await registry.connect(officer).registerDocument(documentId, ipfsCid, fileHash, role);

    const isMatch = await registry.verifyDocumentHash(documentId, fileHash);
    expect(isMatch).to.be.true;

    const isDifferent = await registry.verifyDocumentHash(documentId, "0x00000000000000000000");
    expect(isDifferent).to.be.false;
  });

  it("should prevent duplicate documentId registrations", async function () {
    const documentId = "DOC-DUPLICATE-001";
    const ipfsCid = "QmCid1";
    const fileHash = "0xhash1";

    await registry.connect(beneficiary).registerDocument(documentId, ipfsCid, fileHash, "BENEFICIARY");

    await expect(
      registry.connect(officer).registerDocument(documentId, "QmCid2", "0xhash2", "OFFICER")
    ).to.be.revertedWithCustomError(registry, "DocumentAlreadyExists");
  });

  it("should reject empty parameters", async function () {
    await expect(
      registry.registerDocument("", "QmCid", "0xhash", "BENEFICIARY")
    ).to.be.revertedWithCustomError(registry, "InvalidEmptyParameter");

    await expect(
      registry.registerDocument("DOC-1", "", "0xhash", "BENEFICIARY")
    ).to.be.revertedWithCustomError(registry, "InvalidEmptyParameter");
  });
});
