import { expect } from "chai";
import { ethers } from "hardhat";
import * as path from "path";
import * as fs from "fs";

// @ts-ignore
const snarkjs = require("snarkjs");
// @ts-ignore
const { buildPoseidon } = require("circomlibjs");

describe("ZK Proof Verification", function () {
  let sbt: any;
  let registry: any;
  let credentials: any;
  let verifier: any;
  let admin: any, student: any;
  let poseidon: any;
  let F: any; // finite field

  // paths pentru circuit artifacts
  const WASM_PATH = path.join(__dirname, "../../build/circuits/merkle_membership_js/merkle_membership.wasm");
  const ZKEY_PATH = path.join(__dirname, "../../build/circuits/merkle_membership_0000.zkey");

  const TREE_LEVELS = 12; // trebuie sa fie egal cu cel din circuit

  before(async function () {
    // incarca Poseidon
    poseidon = await buildPoseidon();
    F = poseidon.F;
  });

  beforeEach(async function () {
    [admin, student] = await ethers.getSigners();

    // Deploy Verifier
    const Verifier = await ethers.getContractFactory("Groth16Verifier");
    verifier = await Verifier.deploy();

    // Deploy SoulboundToken
    const SBT = await ethers.getContractFactory("SoulboundToken");
    sbt = await SBT.deploy();

    // Deploy IdentityRegistry
    const Registry = await ethers.getContractFactory("IdentityRegistry");
    registry = await Registry.deploy();

    // Deploy AcademicCredentials
    const Credentials = await ethers.getContractFactory("AcademicCredentials");
    credentials = await Credentials.deploy(
      await sbt.getAddress(),
      await registry.getAddress(),
      0 // fee = 0
    );

    // Setup
    await sbt.setMinter(await credentials.getAddress());
    await credentials.setVerifier(await verifier.getAddress());
    await credentials.toggleZKVerification(true);
  });

  // helper: calculeaza Poseidon hash (ca in circuit)
  function poseidonHash(inputs: bigint[]): bigint {
    return F.toObject(poseidon(inputs));
  }

  // helper: construieste Merkle tree si returneaza root + proof pentru un leaf
  function buildMerkleTree(leaves: bigint[], leafIndex: number) {
    // pad la 2^TREE_LEVELS
    const treeSize = Math.pow(2, TREE_LEVELS);
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < treeSize) {
      paddedLeaves.push(BigInt(0));
    }

    let currentLevel = paddedLeaves;
    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];
    let currentIndex = leafIndex;

    for (let level = 0; level < TREE_LEVELS; level++) {
      const nextLevel: bigint[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1];
        nextLevel.push(poseidonHash([left, right]));
      }

      // salvam proof pentru leaf-ul nostru
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      pathElements.push(currentLevel[siblingIndex]);
      pathIndices.push(currentIndex % 2); // 0 = stanga, 1 = dreapta

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    return {
      root: currentLevel[0],
      pathElements,
      pathIndices
    };
  }

  // helper: genereaza ZK proof
  async function generateProof(
    secret: bigint,
    predicateId: bigint,
    pathElements: bigint[],
    pathIndices: number[],
    merkleRoot: bigint
  ) {
    const input = {
      secret: secret.toString(),
      pathElements: pathElements.map(e => e.toString()),
      pathIndices: pathIndices,
      merkleRoot: merkleRoot.toString(),
      predicateId: predicateId.toString()
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      WASM_PATH,
      ZKEY_PATH
    );

    // convertim proof la format pentru Solidity
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    const argv = calldata.replace(/["[\]\s]/g, "").split(",").map((x: string) => BigInt(x));

    const a = [argv[0], argv[1]] as [bigint, bigint];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]] as [[bigint, bigint], [bigint, bigint]];
    const c = [argv[6], argv[7]] as [bigint, bigint];
    const pubSignals = [argv[8], argv[9], argv[10]] as [bigint, bigint, bigint];

    return { a, b, c, pubSignals, proof, publicSignals };
  }

  describe("Groth16Verifier", function () {
    it("verifica un proof valid", async function () {
      // skip daca fisierele circuit nu exista
      if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        console.log("  Skipping: circuit files not found");
        this.skip();
      }

      const secret = BigInt(12345);
      const predicateId = BigInt(1);

      // commitment = Poseidon(secret)
      const commitment = poseidonHash([secret]);

      // construim Merkle tree cu un singur leaf
      const { root, pathElements, pathIndices } = buildMerkleTree([commitment], 0);

      // generam proof
      const { a, b, c, pubSignals } = await generateProof(
        secret,
        predicateId,
        pathElements,
        pathIndices,
        root
      );

      // verificam direct pe Verifier contract
      const isValid = await verifier.verifyProof(a, b, c, pubSignals);
      expect(isValid).to.be.true;
    });

    it("respinge un proof cu public signals modificate", async function () {
      if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        console.log("  Skipping: circuit files not found");
        this.skip();
      }

      const secret = BigInt(12345);
      const predicateId = BigInt(1);
      const commitment = poseidonHash([secret]);
      const { root, pathElements, pathIndices } = buildMerkleTree([commitment], 0);

      const { a, b, c, pubSignals } = await generateProof(
        secret,
        predicateId,
        pathElements,
        pathIndices,
        root
      );

      // modificam un public signal (merkleRoot)
      const tamperedPubSignals: [bigint, bigint, bigint] = [
        pubSignals[0],
        pubSignals[1] + BigInt(1), // modificam merkleRoot
        pubSignals[2]
      ];

      const isValid = await verifier.verifyProof(a, b, c, tamperedPubSignals);
      expect(isValid).to.be.false;
    });
  });

  describe("AcademicCredentials with ZK", function () {
    it("claimCredential cu ZK proof functioneaza", async function () {
      if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        console.log("  Skipping: circuit files not found");
        this.skip();
      }

      const secret = BigInt(99999);
      const predicateId = BigInt(1);

      // commitment = Poseidon(secret)
      const commitment = poseidonHash([secret]);

      // construim Merkle tree
      const { root, pathElements, pathIndices } = buildMerkleTree([commitment], 0);

      // setam Merkle root in registry
      const rootBytes32 = "0x" + root.toString(16).padStart(64, "0");
      await registry.updateMerkleRoot(predicateId, rootBytes32);

      // generam ZK proof
      const { a, b, c, pubSignals } = await generateProof(
        secret,
        predicateId,
        pathElements,
        pathIndices,
        root
      );

      // claim credential cu ZK proof
      await credentials.connect(student).claimCredential(
        predicateId,
        a,
        b,
        c,
        pubSignals
      );

      // verificam ca studentul a primit SBT
      expect(await sbt.ownerOf(0)).to.equal(student.address);
      expect(await sbt.getTokenPredicate(0)).to.equal(predicateId);

      // verificam ca nullifier-ul a fost marcat ca folosit
      const nullifierBytes32 = "0x" + pubSignals[0].toString(16).padStart(64, "0");
      expect(await sbt.isNullifierUsed(nullifierBytes32)).to.be.true;
    });

    it("respinge claim cu proof invalid", async function () {
      if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        console.log("  Skipping: circuit files not found");
        this.skip();
      }

      const secret = BigInt(11111);
      const predicateId = BigInt(1);
      const commitment = poseidonHash([secret]);
      const { root, pathElements, pathIndices } = buildMerkleTree([commitment], 0);

      const rootBytes32 = "0x" + root.toString(16).padStart(64, "0");
      await registry.updateMerkleRoot(predicateId, rootBytes32);

      const { a, b, c, pubSignals } = await generateProof(
        secret,
        predicateId,
        pathElements,
        pathIndices,
        root
      );

      // modificam proof-ul (a[0])
      const tamperedA: [bigint, bigint] = [a[0] + BigInt(1), a[1]];

      await expect(
        credentials.connect(student).claimCredential(
          predicateId,
          tamperedA,
          b,
          c,
          pubSignals
        )
      ).to.be.reverted;
    });

    it("respinge claim cu merkle root gresit", async function () {
      if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        console.log("  Skipping: circuit files not found");
        this.skip();
      }

      const secret = BigInt(22222);
      const predicateId = BigInt(1);
      const commitment = poseidonHash([secret]);
      const { root, pathElements, pathIndices } = buildMerkleTree([commitment], 0);

      // setam un root DIFERIT in registry
      const differentRoot = poseidonHash([BigInt(999)]);
      const rootBytes32 = "0x" + differentRoot.toString(16).padStart(64, "0");
      await registry.updateMerkleRoot(predicateId, rootBytes32);

      const { a, b, c, pubSignals } = await generateProof(
        secret,
        predicateId,
        pathElements,
        pathIndices,
        root
      );

      await expect(
        credentials.connect(student).claimCredential(
          predicateId,
          a,
          b,
          c,
          pubSignals
        )
      ).to.be.revertedWith("Invalid merkle root in proof");
    });

    it("previne double-claim cu acelasi nullifier", async function () {
      if (!fs.existsSync(WASM_PATH) || !fs.existsSync(ZKEY_PATH)) {
        console.log("  Skipping: circuit files not found");
        this.skip();
      }

      const secret = BigInt(33333);
      const predicateId = BigInt(1);
      const commitment = poseidonHash([secret]);
      const { root, pathElements, pathIndices } = buildMerkleTree([commitment], 0);

      const rootBytes32 = "0x" + root.toString(16).padStart(64, "0");
      await registry.updateMerkleRoot(predicateId, rootBytes32);

      const { a, b, c, pubSignals } = await generateProof(
        secret,
        predicateId,
        pathElements,
        pathIndices,
        root
      );

      // primul claim - OK
      await credentials.connect(student).claimCredential(
        predicateId,
        a,
        b,
        c,
        pubSignals
      );

      // al doilea claim cu acelasi proof - REVERT
      await expect(
        credentials.connect(student).claimCredential(
          predicateId,
          a,
          b,
          c,
          pubSignals
        )
      ).to.be.revertedWith("Nullifier already used");
    });
  });
});
