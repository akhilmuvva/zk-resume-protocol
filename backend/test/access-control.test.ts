import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, impersonateAccount, setBalance } from "@nomicfoundation/hardhat-network-helpers";

describe("ResumeRegistry Access Control (Multisig Handover)", function () {
  async function deployRegistryFixture() {
    const [deployer, otherAccount] = await ethers.getSigners();
    
    // Deploy Mock Verifier
    const MockVerifier = await ethers.getContractFactory("MockVerifier");
    const mockVerifier = await MockVerifier.deploy();
    await mockVerifier.waitForDeployment();

    // Deploy Registry
    const Registry = await ethers.getContractFactory("ResumeRegistry");
    const registry = await Registry.deploy(await mockVerifier.getAddress());
    await registry.waitForDeployment();

    return { registry, deployer, otherAccount };
  }

  it("Should properly execute a full handover to a Multisig address", async function () {
    const { registry, deployer, otherAccount } = await loadFixture(deployRegistryFixture);
    const multisigAddress = "0x000000000000000000000000000000000000dead"; // Mock Safe
    
    const ADMIN_ROLE = await registry.DEFAULT_ADMIN_ROLE();
    const MANAGER_ROLE = await registry.UNIVERSITY_MANAGER_ROLE();

    // 1. Handover roles
    await registry.grantRole(ADMIN_ROLE, multisigAddress);
    await registry.grantRole(MANAGER_ROLE, multisigAddress);

    // 2. Original admin renounces
    await registry.renounceRole(MANAGER_ROLE, deployer.address);
    await registry.renounceRole(ADMIN_ROLE, deployer.address);

    // 3. Verify original admin is no longer authorized
    await expect(
      registry.connect(deployer).registerUniversity(otherAccount.address, "Fail Uni")
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");

    // 4. Impersonate Multisig to verify it has control
    await impersonateAccount(multisigAddress);
    await setBalance(multisigAddress, ethers.parseEther("10")); // Give gas
    const multisigSigner = await ethers.getSigner(multisigAddress);

    await expect(
      registry.connect(multisigSigner).registerUniversity(otherAccount.address, "Pass Uni")
    ).to.emit(registry, "UniversityRegistered")
     .withArgs(otherAccount.address, "Pass Uni");

    // 5. Verify multisig can manage roles (it is the admin)
    const newManager = ethers.Wallet.createRandom().address;
    await expect(
      registry.connect(multisigSigner).grantRole(MANAGER_ROLE, newManager)
    ).to.not.be.reverted;
    
    expect(await registry.hasRole(MANAGER_ROLE, newManager)).to.be.true;
  });
});
