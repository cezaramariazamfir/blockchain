# Plan de Implementare - Sistem de Identitate Academică Anonimă cu ZKPs

## Descrierea Proiectului

**Echipa:** Dima Cristian, Zamfir Cezara, Muscalu David - Grupa 341

**Tema:** Sistem de identitate academică anonimă bazat pe Zero-Knowledge Proofs (ZKPs) care permite unui student să demonstreze proprietăți despre statutul său academic fără a dezvălui date personale.

---

## Arhitectura Sistemului

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React/Next.js)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │   Wallet    │  │   Proof     │  │    SBT      │  │   Admin     │ │
│  │  Connect    │  │  Generator  │  │   Viewer    │  │   Panel     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Web3 Layer (ethers.js)                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Smart Contracts (Solidity)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Verifier   │  │   Identity  │  │  Soulbound  │  │   Merkle    │ │
│  │  (Groth16)  │  │   Registry  │  │    Token    │  │    Tree     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ZK Circuits (Circom)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Membership      │  │  Range Proof    │  │  Nullifier          │  │
│  │ Proof Circuit   │  │  (grade >= X)   │  │  Generator          │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stack Tehnologic

### 1. Smart Contracts & Blockchain

| Tehnologie | Versiune | Scop |
|------------|----------|------|
| **Solidity** | ^0.8.20 | Limbaj smart contracts |
| **Hardhat** | ^2.19.0 | Framework dezvoltare & testare |
| **OpenZeppelin** | ^5.0.0 | Librării securizate (ERC721, Access Control) |
| **ethers.js** | ^6.9.0 | Interacțiune blockchain |

### 2. Zero-Knowledge Proofs

| Tehnologie | Versiune | Scop |
|------------|----------|------|
| **Circom** | 2.1.6 | Limbaj pentru circuite ZK |
| **SnarkJS** | ^0.7.0 | Generare/verificare proofs |
| **circomlib** | ^2.0.5 | Librării Circom (Poseidon, MerkleTree) |

### 3. Frontend

| Tehnologie | Versiune | Scop |
|------------|----------|------|
| **Next.js** | ^14.0.0 | Framework React cu SSR |
| **TypeScript** | ^5.3.0 | Type safety |
| **Tailwind CSS** | ^3.4.0 | Styling |
| **wagmi** | ^2.0.0 | React hooks pentru Web3 |
| **viem** | ^2.0.0 | Client Ethereum modern |
| **RainbowKit** | ^2.0.0 | Wallet connection UI |

### 4. Development & Testing

| Tehnologie | Scop |
|------------|------|
| **Chai/Mocha** | Testing smart contracts |
| **Hardhat Network** | Rețea locală Ethereum |
| **Sepolia Testnet** | Testnet public |

---

## Structura Proiectului

```
blockchain/
├── circuits/                    # Circuite Circom
│   ├── membership.circom        # Proof membership în Merkle tree
│   ├── rangeProof.circom        # Verificare grade >= threshold
│   ├── nullifier.circom         # Generare nullifier anti-Sybil
│   └── lib/                     # Librării helper
│       └── poseidon.circom
├── contracts/                   # Smart Contracts Solidity
│   ├── Verifier.sol             # Verificator SNARK generat
│   ├── IdentityRegistry.sol     # Registru identități & Merkle roots
│   ├── SoulboundToken.sol       # ERC721 non-transferabil
│   ├── AcademicCredentials.sol  # Contract principal
│   └── interfaces/              # Interfețe
│       ├── IVerifier.sol
│       └── ISoulboundToken.sol
├── frontend/                    # Aplicație Next.js
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   ├── components/          # Componente React
│   │   ├── hooks/               # Custom hooks Web3
│   │   ├── lib/                 # Utilități & ZK helpers
│   │   └── contracts/           # ABI-uri & adrese
│   └── public/
│       └── zk/                  # Circuit artifacts (wasm, zkey)
├── scripts/                     # Scripturi deployment & setup
│   ├── deploy.ts
│   ├── compile-circuits.sh
│   └── setup-merkle.ts
├── test/                        # Teste
│   ├── contracts/
│   └── circuits/
├── hardhat.config.ts
├── package.json
└── PLAN_PROIECT.md
```

---

## Pași de Implementare

### Faza 1: Setup Mediu de Dezvoltare

- [ ] **1.1** Inițializare proiect Node.js
- [ ] **1.2** Configurare Hardhat cu TypeScript
- [ ] **1.3** Instalare dependențe Solidity (OpenZeppelin)
- [ ] **1.4** Instalare Circom și SnarkJS
- [ ] **1.5** Setup Next.js pentru frontend
- [ ] **1.6** Configurare wallet MetaMask pentru testare

### Faza 2: Implementare Circuite ZK (Circom)

- [ ] **2.1** Circuit Poseidon hash pentru commitment
- [ ] **2.2** Circuit Merkle Tree membership proof
- [ ] **2.3** Circuit Range Proof pentru verificare notă
- [ ] **2.4** Circuit Nullifier pentru anti-Sybil
- [ ] **2.5** Generare proving key și verification key (trusted setup)
- [ ] **2.6** Export Verifier.sol din SnarkJS

### Faza 3: Smart Contracts (Cerințe Obligatorii)

- [ ] **3.1** `SoulboundToken.sol` - ERC721 non-transferabil
  - mappings pentru owners
  - address pentru verificări
  - events pentru mint/verificări
  - modifiers pentru access control
  - funcții: external, pure, view
- [ ] **3.2** `IdentityRegistry.sol` - Merkle tree management
  - Stocare roots pentru fiecare predicat
  - Events pentru actualizări root
  - Transfer ETH pentru admin withdraw
- [ ] **3.3** `AcademicCredentials.sol` - Contract principal
  - Interacțiune cu Verifier și SBT
  - Verificare nullifier duplicat
  - Emitere SBT după verificare proof
- [ ] **3.4** Deploy pe Hardhat Network local
- [ ] **3.5** Deploy pe Sepolia Testnet

### Faza 4: Smart Contracts (Cerințe Opționale pentru Bonus)

- [ ] **4.1** Utilizare librării OpenZeppelin
- [ ] **4.2** Implementare teste cu Hardhat/Chai
- [ ] **4.3** Pattern-uri OOP:
  - Interfețe (IVerifier, ISoulboundToken)
  - Moștenire (ERC721)
  - Withdrawal Pattern pentru ETH
- [ ] **4.4** Standard ERC-5192 (Soulbound Tokens)

### Faza 5: Frontend Web3 (Cerințe Obligatorii)

- [ ] **5.1** Setup wagmi + RainbowKit pentru wallet connection
- [ ] **5.2** Afișare informații cont (adresă, balance)
- [ ] **5.3** Componente pentru generare ZK proof client-side
- [ ] **5.4** Tranzacții de mint SBT cu proof

### Faza 6: Frontend (Cerințe Opționale pentru Bonus)

- [ ] **6.1** Tratare events cu Observer Pattern
- [ ] **6.2** Estimare gas cost înainte de tranzacție
- [ ] **6.3** Control stare tranzacții (pending, confirmed, failed)
- [ ] **6.4** Afișare SBT-uri deținute

### Faza 7: Integrare & Testare

- [ ] **7.1** Teste end-to-end
- [ ] **7.2** Documentație utilizare
- [ ] **7.3** Demo flow complet

---

## Cerințe Acoperite

### Partea 1: Smart Contracts

#### Obligatorii (3 puncte) ✓
| Cerință | Implementare |
|---------|--------------|
| Tipuri date Solidity (mappings, address) | `SoulboundToken.sol`, `IdentityRegistry.sol` |
| Înregistrare events | Events pentru mint, verificări, actualizări |
| Utilizare modifiers | `onlyAdmin`, `onlyVerified`, `notMinted` |
| Toate tipurile de funcții | external, pure, view, payable |
| Transfer ETH | Withdrawal pattern în `IdentityRegistry` |
| Interacțiune smart contracts | `AcademicCredentials` ↔ `Verifier` ↔ `SBT` |
| Deploy rețea test | Hardhat local + Sepolia |

#### Opționale (2 puncte) ✓
| Cerință | Implementare |
|---------|--------------|
| Utilizare librării | OpenZeppelin (ERC721, AccessControl) |
| Teste | Hardhat + Chai |
| OOP avansat | Interfețe, moștenire, Withdrawal Pattern |
| Standard ERC | ERC-721 + ERC-5192 (Soulbound) |

### Partea 2: Aplicație Web3

#### Obligatorii (1.5 puncte) ✓
| Cerință | Implementare |
|---------|--------------|
| Librărie web3 + Provider | ethers.js/wagmi + MetaMask |
| Informații conturi | Adresă, balance |
| Inițiere tranzacții | Mint SBT cu proof ZK |

#### Opționale (2.5 puncte) ✓
| Cerință | Implementare |
|---------|--------------|
| Tratare events | Observer Pattern cu wagmi hooks |
| Analiză gas cost | Estimare înainte de tranzacție |
| Control stare tranzacții | Tratare excepții, pending states |

### Bonus Complexitate (până la 3 puncte) ✓
- Zero-Knowledge Proofs cu Circom/SnarkJS
- Merkle Trees pentru membership proofs
- Poseidon hash (ZK-friendly)
- Anti-Sybil cu nullifiers
- Soulbound Tokens (ERC-5192)

---

## Comenzi Setup Inițial

```bash
# 1. Creare și inițializare proiect
mkdir -p blockchain && cd blockchain
npm init -y

# 2. Instalare Hardhat și dependențe Solidity
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox typescript ts-node
npm install @openzeppelin/contracts

# 3. Instalare Circom și SnarkJS
npm install --save-dev circom snarkjs circomlib

# 4. Inițializare Hardhat
npx hardhat init
# Selectează: "Create a TypeScript project"

# 5. Creare aplicație Next.js
npx create-next-app@latest frontend --typescript --tailwind --app --src-dir

# 6. Instalare dependențe Web3 în frontend
cd frontend
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
npm install snarkjs
cd ..
```

---

## Configurație Hardhat (hardhat.config.ts)

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};

export default config;
```

---

## Flow Aplicație

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLOW UTILIZATOR                                 │
└─────────────────────────────────────────────────────────────────────────────┘

1. ÎNREGISTRARE (Admin)
   ┌─────────┐     ┌──────────────┐     ┌─────────────────┐
   │ Admin   │────▶│ Generează    │────▶│ Adaugă în       │
   │         │     │ commitment   │     │ Merkle Trees    │
   └─────────┘     └──────────────┘     └─────────────────┘
                   commitment = Poseidon(secret, attributes)

2. GENERARE PROOF (Student)
   ┌─────────┐     ┌──────────────┐     ┌─────────────────┐
   │ Student │────▶│ Selectează   │────▶│ Generează proof │
   │         │     │ predicat     │     │ în browser      │
   └─────────┘     └──────────────┘     └─────────────────┘
                   "Sunt student FMI"   SNARK proof + nullifier

3. VERIFICARE & MINT SBT
   ┌─────────┐     ┌──────────────┐     ┌─────────────────┐
   │ Student │────▶│ Trimite TX   │────▶│ Contract        │
   │         │     │ cu proof     │     │ verifică & mint │
   └─────────┘     └──────────────┘     └─────────────────┘
                                        - Verifică SNARK valid
                                        - Verifică nullifier unic
                                        - Mint SBT non-transferabil
```

---

## Exemple Cod

### Circuit Circom - Membership Proof

```circom
pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/mux1.circom";

template MerkleTreeInclusionProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);
        mux[i] = MultiMux1(2);

        mux[i].c[0][0] <== levelHashes[i];
        mux[i].c[0][1] <== pathElements[i];
        mux[i].c[1][0] <== pathElements[i];
        mux[i].c[1][1] <== levelHashes[i];
        mux[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[levels];
}
```

### Smart Contract - SoulboundToken.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SoulboundToken is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Mappings
    mapping(uint256 => uint256) public tokenPredicates;
    mapping(bytes32 => bool) public usedNullifiers;

    // Events
    event CredentialMinted(address indexed to, uint256 tokenId, uint256 predicateId);
    event NullifierUsed(bytes32 indexed nullifier);

    // Modifiers
    modifier nullifierNotUsed(bytes32 nullifier) {
        require(!usedNullifiers[nullifier], "Nullifier already used");
        _;
    }

    constructor() ERC721("Academic Credential", "ACRED") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // External function
    function mint(
        address to,
        uint256 tokenId,
        uint256 predicateId,
        bytes32 nullifier
    ) external onlyRole(MINTER_ROLE) nullifierNotUsed(nullifier) {
        usedNullifiers[nullifier] = true;
        tokenPredicates[tokenId] = predicateId;
        _safeMint(to, tokenId);

        emit CredentialMinted(to, tokenId, predicateId);
        emit NullifierUsed(nullifier);
    }

    // View function
    function getTokenPredicate(uint256 tokenId) external view returns (uint256) {
        return tokenPredicates[tokenId];
    }

    // Pure function
    function computeTokenId(address owner, uint256 predicateId) external pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(owner, predicateId)));
    }

    // Override transfer to make soulbound
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0), "Token is soulbound");
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## Resurse Utile

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Tutorial](https://github.com/iden3/snarkjs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [wagmi Documentation](https://wagmi.sh/)
- [Tornado Cash (similar pattern)](https://github.com/tornadocash/tornado-core)

---

## Timeline Sugerată

| Fază | Activități |
|------|------------|
| **Săptămâna 1** | Setup mediu, învățare Circom basics |
| **Săptămâna 2** | Implementare circuite ZK |
| **Săptămâna 3** | Smart contracts obligatorii + teste |
| **Săptămâna 4** | Frontend + integrare |
| **Săptămâna 5** | Features opționale + polish |
| **Săptămâna 6** | Testare finală + documentație |

---

## Notă Finală

Acest proiect acoperă **toate cerințele obligatorii** și majoritatea **cerințelor opționale** pentru ambele părți, având potențial pentru **punctaj maxim + bonus** datorită complexității ZKP.
