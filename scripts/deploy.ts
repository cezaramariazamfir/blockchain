import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());


  console.log("\n1. Deploying SoulboundToken...");
  const SoulboundToken = await ethers.getContractFactory("SoulboundToken");
  const sbt = await SoulboundToken.deploy();
  await sbt.waitForDeployment();
  const sbtAddress = await sbt.getAddress();
  console.log("   SoulboundToken deployed to:", sbtAddress);


  console.log("\n2. Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const registry = await IdentityRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("   IdentityRegistry deployed to:", registryAddress);


  console.log("\n3. Deploying Groth16Verifier (ZK)...");
  const Verifier = await ethers.getContractFactory("Groth16Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("   Groth16Verifier deployed to:", verifierAddress);


  console.log("\n4. Deploying AcademicCredentials...");
  const issuanceFee = 0; // taxa = 0
  const AcademicCredentials = await ethers.getContractFactory("AcademicCredentials");
  const credentials = await AcademicCredentials.deploy(sbtAddress, registryAddress, issuanceFee);
  await credentials.waitForDeployment();
  const credentialsAddress = await credentials.getAddress();
  console.log("   AcademicCredentials deployed to:", credentialsAddress);


  console.log("\n5. Setting AcademicCredentials as minter...");
  await sbt.setMinter(credentialsAddress);
  console.log("   Done!");


  console.log("\n6. Setting Verifier and enabling ZK...");
  await credentials.setVerifier(verifierAddress);
  await credentials.toggleZKVerification(true);
  console.log("   ZK verification enabled!");

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log("SoulboundToken:      ", sbtAddress);
  console.log("IdentityRegistry:    ", registryAddress);
  console.log("Groth16Verifier:     ", verifierAddress);
  console.log("AcademicCredentials: ", credentialsAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
