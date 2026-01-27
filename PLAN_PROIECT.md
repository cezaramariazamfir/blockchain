# Plan de Implementare - Sistem de Identitate Academica Anonima cu ZKPs

## Descrierea Proiectului

**Echipa:** Dima Cristian, Zamfir Cezara, Muscalu David - Grupa 341

**Tema:** Sistem de identitate academica anonima bazat pe Zero-Knowledge Proofs (ZKPs) care permite unui student sa demonstreze proprietati despre statutul sau academic fara a dezvalui date personale.

**Deadline:** 4 zile (26-29 Ianuarie 2026)

---

## Plan pe 4 Zile

### ZIUA 1 (26 Ian) - Smart Contracts ✅ COMPLETAT

| Task | Responsabil | Status |
|------|-------------|--------|
| Creare `SoulboundToken.sol` cu toate cerintele | | [x] |
| Creare `IdentityRegistry.sol` pentru Merkle roots | | [x] |
| Creare `AcademicCredentials.sol` - contract principal | | [x] |
| Teste Hardhat pentru contracte (16 teste total) | | [x] |
| Deploy local + verificare | | [x] |

**Cerinte acoperite Ziua 1:**
- [x] Mappings si address
- [x] Events
- [x] Modifiers
- [x] Functii: external, pure, view, payable
- [x] Transfer ETH
- [x] Interactiune intre contracte
- [x] Librarii OpenZeppelin

---

### ZIUA 2 (27 Ian) - Circuit ZK + Verifier ✅ COMPLETAT

| Task | Responsabil | Status |
|------|-------------|--------|
| Creare circuit `merkle_membership.circom` cu Merkle tree | | [x] |
| Compilare circuit + generare Verifier.sol | | [x] |
| Integrare Verifier in AcademicCredentials | | [x] |
| Activare zkVerificationEnabled + teste ZK (6 teste) | | [x] |

**Cerinte acoperite Ziua 2:**
- [x] Zero-Knowledge Proofs (bonus complexitate)
- [x] Poseidon hash
- [x] Merkle Tree membership proof
- [x] Nullifier anti-Sybil

---

### ZIUA 3 (28 Ian) - Frontend Web3

| Task | Responsabil | Status |
|------|-------------|--------|
| Setup wagmi + RainbowKit + Next.js | | [ ] |
| Pagina Connect Wallet + afisare info cont | | [ ] |
| **Pagina Admin** - generare Merkle tree + publish root | | [ ] |
| **Pagina Student** - claim credential cu ZK proof | | [ ] |
| Pagina View Credentials (SBT-uri detinute) | | [ ] |
| Tratare stari tranzactii (pending, success, error) | | [ ] |

**Pagina Admin (nou):**
- Input lista studenti (nume/email pentru demo)
- Genereaza secret random pentru fiecare student
- Calculeaza Poseidon commitments
- Construieste Merkle tree
- Publica root pe blockchain (IdentityRegistry)
- Afiseaza/exporta secretele pentru studenti

**Pagina Student:**
- Input secret (primit de la admin)
- Genereaza ZK proof in browser (snarkjs)
- Trimite proof la contract
- Primeste SBT

**Cerinte acoperite Ziua 3:**
- [x] Librarie web3 + Provider
- [x] Informatii conturi (adresa, balance)
- [x] Initiere tranzactii
- [x] Tratare events
- [x] Control stare tranzactii

---

### ZIUA 4 (29 Ian) - Integrare + Deploy + Demo

| Task | Responsabil | Status |
|------|-------------|--------|
| Deploy pe Sepolia testnet | | [ ] |
| Conectare frontend la Sepolia | | [ ] |
| Testare end-to-end | | [ ] |
| Fix bugs + polish | | [ ] |
| Pregatire demo/prezentare | | [ ] |

**Cerinte acoperite Ziua 4:**
- [x] Deploy pe retea de test
- [x] Documentatie

---

## Arhitectura Simplificata

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │Connect Wallet│  │Mint Credential│  │View My SBTs │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Smart Contracts                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Verifier   │◄─│  Academic    │─►│  Soulbound   │  │
│  │  (Groth16)   │  │ Credentials  │  │    Token     │  │
│  └──────────────┘  └──────┬───────┘  └──────────────┘  │
│                           │                             │
│                           ▼                             │
│                    ┌──────────────┐                     │
│                    │  Identity    │                     │
│                    │  Registry    │                     │
│                    │(Merkle Roots)│                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                           ▲
                           │
┌─────────────────────────────────────────────────────────┐
│                   ZK Circuit (Circom)                    │
│    merkle_membership.circom - Merkle Tree + Nullifier    │
└─────────────────────────────────────────────────────────┘
```

---

## Structura Fisiere

```
blockchain/
├── circuits/
│   └── merkle_membership.circom  # Circuit ZK cu Merkle tree ✅
├── build/circuits/               # Fisiere compilate circuit
│   ├── merkle_membership.r1cs
│   ├── merkle_membership_js/     # WASM + witness generator
│   └── merkle_membership_0000.zkey
├── contracts/
│   ├── SoulboundToken.sol        # ERC721 non-transferabil (Soulbound)
│   ├── IdentityRegistry.sol      # Merkle roots + verificare on-chain
│   ├── AcademicCredentials.sol   # Contract principal + issuanceFee
│   └── Verifier.sol              # Groth16Verifier generat din circuit ✅
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Home + Connect Wallet
│       │   ├── admin/page.tsx    # Admin: generare Merkle tree + publish
│       │   ├── claim/page.tsx    # Student: claim cu ZK proof
│       │   └── view/page.tsx     # View SBTs detinute
│       ├── components/
│       └── lib/
│           ├── merkle.ts         # Logica Merkle tree (Poseidon)
│           └── zkproof.ts        # Generare ZK proof (snarkjs)
├── test/
│   └── contracts/
│       ├── AcademicSystem.test.ts  # 10 teste contracte
│       └── ZKProof.test.ts         # 6 teste ZK proofs
├── scripts/
│   └── deploy.ts                 # Script deployment
└── ptau/                         # Powers of Tau (Ziua 2)
```

---

## Smart Contracts - Cerinte Obligatorii Acoperite

### SoulboundToken.sol ✅
```
✓ mapping(uint256 => uint256) tokenPredicates - predicat per token
✓ mapping(bytes32 => bool) usedNullifiers - nullifiers folosite
✓ event CredentialMinted(address indexed to, uint256 indexed tokenId, uint256 predicateId)
✓ modifier onlyMinter() - doar minter-ul poate mint
✓ modifier nullifierNotUsed(bytes32) - previne refolosirea
✓ function mint(address, uint256, bytes32) external - mint SBT
✓ function isNullifierUsed(bytes32) view - verificare nullifier
✓ function getTokenPredicate(uint256) view - predicat per token
✓ function _update() override - blocheaza transferuri (Soulbound)
✓ Mostenire ERC721 (OpenZeppelin)
```

### IdentityRegistry.sol ✅
```
✓ mapping(uint256 => bytes32) merkleRoots - Merkle root per predicat
✓ mapping(uint256 => bytes32[]) rootHistory - istoric roots
✓ event MerkleRootSet(uint256 indexed predicateId, bytes32 merkleRoot)
✓ modifier onlyAdmin()
✓ function setMerkleRoot(uint256, bytes32) external - admin seteaza root
✓ function getMerkleRoot(uint256) view - returneaza root activ
✓ function verifyMerkleProof(bytes32, bytes32[], uint256[], uint256) view
  - verificare on-chain pentru testare (in productie se face in circuit)
```

### AcademicCredentials.sol ✅
```
✓ Interactiune cu IVerifier (verifyProof) - pentru ZK
✓ Interactiune cu ISoulboundToken (mint)
✓ Interactiune cu IIdentityRegistry (getMerkleRoot, verifyMerkleProof)
✓ uint256 issuanceFee - taxa de eliberare (ca la secretariat)
✓ function claimCredential() external payable - claim cu ZK proof
✓ function claimCredentialWithMerkleProof() external payable - claim cu Merkle proof on-chain
✓ function setVerifier(address) external - admin seteaza verifier-ul
✓ function toggleZKVerification(bool) external - activeaza/dezactiveaza ZK
✓ function setIssuanceFee(uint256) external - modifica taxa
✓ function withdraw() external - retragere fonduri
✓ receive() external payable - primeste ETH direct
✓ Events: CredentialClaimed, VerifierUpdated, ZKVerificationToggled, etc.
```

---

## Circuit ZK cu Merkle Tree

Circuitul verifica ca un student face parte dintr-un Merkle tree (set de studenti eligibili) fara a dezvalui care student este:

**Ce face circuitul:**
1. Verifica ca utilizatorul cunoaste `secret` (private)
2. Calculeaza `commitment = Poseidon(secret)` (leaf in Merkle tree)
3. Verifica ca acest commitment face parte din Merkle tree (folosind merkleProof)
4. Genereaza `nullifier = Poseidon(secret, predicateId)` pentru anti-Sybil

**Inputs/Outputs:**
- **Private:** secret, pathElements[12], pathIndices[12]
- **Public:** merkleRoot, predicateId
- **Output:** nullifier (pentru a preveni dubla revendicare)

**Statistici circuit (12 nivele):**
- 3399 non-linear constraints
- 2 public inputs, 25 private inputs, 1 public output

```circom
pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

template MerkleTreeVerifier(levels) {
    // Private inputs
    signal input secret;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // Public inputs
    signal input merkleRoot;
    signal input predicateId;

    // Public output
    signal output nullifier;

    // Calculeaza commitment (leaf)
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== secret;
    signal leaf <== leafHasher.out;

    // Verifica Merkle proof
    component hashers[levels];
    signal hashes[levels + 1];
    signal leftInput[levels];
    signal rightInput[levels];
    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        // Daca pathIndices[i] == 0, leaf e pe stanga
        // Daca pathIndices[i] == 1, leaf e pe dreapta
        leftInput[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        rightInput[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);
        hashers[i].inputs[0] <== leftInput[i];
        hashers[i].inputs[1] <== rightInput[i];
        hashes[i + 1] <== hashers[i].out;
    }

    signal computedRoot <== hashes[levels];
    computedRoot === merkleRoot;

    // Calculeaza nullifier (cu predicateId pt unicitate per predicat)
    component nullHasher = Poseidon(2);
    nullHasher.inputs[0] <== secret;
    nullHasher.inputs[1] <== predicateId;
    nullifier <== nullHasher.out;
}

// 12 nivele = pana la 4096 studenti per predicat
component main {public [merkleRoot, predicateId]} = MerkleTreeVerifier(12);
```

**Nota:** Contractul `AcademicCredentials.sol` are doua metode de claim:
1. `claimCredential()` - foloseste ZK proof (circuit de mai sus) - pentru productie
2. `claimCredentialWithMerkleProof()` - verificare on-chain - pentru testare

---

## Comenzi Utile

```powershell
# === ZIUA 1 - Smart Contracts ===
# Compilare contracte
npx hardhat compile

# Rulare teste
npx hardhat test

# Deploy local (in 2 terminale separate)
npx hardhat node                                          # Terminal 1
npx hardhat run scripts/deploy.ts --network localhost     # Terminal 2

# === ZIUA 2 - Circuit ZK (va fi implementat) ===
# Compilare circuit Circom
circom circuits/merkle_membership.circom --r1cs --wasm --sym -o build/circuits

# Generare zkey
npx snarkjs groth16 setup build/circuits/merkle_membership.r1cs ptau/powersOfTau28_hez_final_14.ptau build/circuits/merkle_membership_0000.zkey

# Export Verifier.sol
npx snarkjs zkey export solidityverifier build/circuits/merkle_membership_0000.zkey contracts/Verifier.sol

# === ZIUA 3 - Frontend ===
cd frontend && npm run dev

# === ZIUA 4 - Deploy Sepolia ===
npx hardhat run scripts/deploy.ts --network sepolia
```

---

## Punctaj Estimat

| Categorie | Puncte | Status |
|-----------|--------|--------|
| **Smart Contracts Obligatorii** | 3.0 | ✅ Complet |
| **Smart Contracts Optionale** | 2.0 | ✅ Complet |
| **Frontend Obligatorii** | 1.5 | In progres |
| **Frontend Optionale** | 2.5 | In progres |
| **Bonus Complexitate (ZKP)** | 1-3 | ✅ Complet |
| **TOTAL POTENTIAL** | **10-12** | |

---

## Resurse

- [Circom Docs](https://docs.circom.io/)
- [SnarkJS](https://github.com/iden3/snarkjs)
- [OpenZeppelin](https://docs.openzeppelin.com/contracts/)
- [Hardhat](https://hardhat.org/docs)
- [wagmi](https://wagmi.sh/)
- [RainbowKit](https://www.rainbowkit.com/)
