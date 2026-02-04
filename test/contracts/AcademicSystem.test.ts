import { expect } from "chai";
import { ethers } from "hardhat";

describe("Academic Credentials System", function () {
  let sbt: any;
  let registry: any;
  let credentials: any;
  let admin: any, student: any;

  beforeEach(async function () {
    [admin, student] = await ethers.getSigners();

    // Deploy contracte
    const SBT = await ethers.getContractFactory("SoulboundToken");
    sbt = await SBT.deploy();

    const Registry = await ethers.getContractFactory("IdentityRegistry");
    registry = await Registry.deploy();

    const Credentials = await ethers.getContractFactory("AcademicCredentials");
    credentials = await Credentials.deploy(
      await sbt.getAddress(),
      await registry.getAddress(),
      0 // fee = 0
    );

    // Seteaza AcademicCredentials ca minter pentru SoulboundToken
    await sbt.setMinter(await credentials.getAddress());
  });



  describe("SoulboundToken", function () {
    it("mint creaza token", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("secret1"));

      // setam admin ca minter pentru test direct
      await sbt.setMinter(admin.address);
      await sbt.mint(student.address, 1, nullifier);

      expect(await sbt.ownerOf(0)).to.equal(student.address);
      expect(await sbt.getTokenPredicate(0)).to.equal(1);
    });

    it("transfer e blocat (soulbound)", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("secret2"));

      await sbt.setMinter(admin.address);
      await sbt.mint(student.address, 1, nullifier);

      // studentul incearca sa transfere - trebuie sa dea REVERT
      await expect(
        sbt.connect(student).transferFrom(student.address, admin.address, 0)
      ).to.be.revertedWith("Soulbound: transfer not allowed");
    });

    it("nullifier nu poate fi refolosit", async function () {
      const nullifier = ethers.keccak256(ethers.toUtf8Bytes("secret3"));

      await sbt.setMinter(admin.address);
      await sbt.mint(student.address, 1, nullifier);

      // al doilea mint cu acelasi nullifier - REVERT
      await expect(
        sbt.mint(student.address, 2, nullifier)
      ).to.be.revertedWith("Nullifier already used");
    });
  });


  describe("IdentityRegistry", function () {
    it("admin poate seta Merkle root", async function () {
      const root = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));

      await registry.updateMerkleRoot(1, root);

      expect(await registry.getMerkleRoot(1)).to.equal(root);
      expect(await registry.isPredicateActive(1)).to.be.true;
    });

    it("non-admin NU poate seta Merkle root", async function () {
      const root = ethers.keccak256(ethers.toUtf8Bytes("merkle-root"));

      await expect(
        registry.connect(student).updateMerkleRoot(1, root)
      ).to.be.revertedWith("Only admin");
    });

  });


  describe("AcademicCredentials", function () {
    it("receive() accepta ETH direct", async function () {
      // trimite ETH direct la contract
      await admin.sendTransaction({
        to: await credentials.getAddress(),
        value: ethers.parseEther("0.5")
      });

      expect(await credentials.getContractBalance()).to.equal(ethers.parseEther("0.5"));
    });
  });
});
