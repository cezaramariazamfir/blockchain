# Sistem de Identitate Academica Anonima cu Zero-Knowledge Proofs

Proiect realizat de: **Dima Cristian, Zamfir Cezara, Muscalu David** - Grupa 341

## Descriere

Sistem care permite unui student sa demonstreze proprietati despre statutul sau academic (ex: "sunt student in anul 3", "am media >= 8") fara a dezvalui date personale, folosind Zero-Knowledge Proofs.

---

## Ghid de Instalare pentru Colaboratori

### Cerinte Preliminare

Inainte de a clona proiectul, instaleaza:

#### 1. Node.js (versiunea 20 LTS)
Descarca de la: https://nodejs.org/

```powershell
# Verifica instalarea
node --version   # Trebuie sa fie v20.x.x
npm --version
```

#### 2. Git
Descarca de la: https://git-scm.com/download/win

#### 3. Circom (Compilator ZK)

**Windows:** Descarca binarul precompilat:
1. Mergi la https://github.com/iden3/circom/releases
2. Descarca `circom-windows-amd64.exe`
3. Creeaza folder `C:\tools` si pune executabilul acolo redenumit ca `circom.exe`
4. Adauga `C:\tools` in PATH:

```powershell
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\tools", "User")
```

5. Reporneste terminalul si verifica:
```powershell
circom --version
```

#### 4. MetaMask
Instaleaza extensia in browser: https://metamask.io/

---

### Pasi de Instalare

#### 1. Cloneaza repository-ul

```powershell
git clone https://github.com/USERNAME/blockchain.git
cd blockchain
```

#### 2. Instaleaza dependentele pentru smart contracts

```powershell
npm install
```

#### 3. Instaleaza dependentele pentru frontend

```powershell
cd frontend
npm install
cd ..
```

#### 4. Configureaza variabilele de mediu

Creeaza fisierul `.env` in folderul root (NU in frontend):

```env
# RPC URL pentru Sepolia (creeaza cont gratuit pe https://www.alchemy.com)
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/CHEIA_TA_ALCHEMY

# Cheia privata din MetaMask (Account details -> Show private key)
PRIVATE_KEY=cheia_ta_privata_aici

# Etherscan API (optional, pentru verificare contracte)
# Creeaza cont pe https://etherscan.io/apis
ETHERSCAN_API_KEY=cheia_ta_etherscan
```


#### 5. Descarca Powers of Tau (pentru ZK proofs)

```powershell
mkdir ptau
Invoke-WebRequest -Uri "https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_14.ptau" -OutFile "ptau/powersOfTau28_hez_final_14.ptau"
```

#### 6. Obtine ETH de test (gratuit)

1. Conecteaza MetaMask la reteaua Sepolia
2. Mergi la https://www.alchemy.com/faucets/ethereum-sepolia
3. Conecteaza wallet-ul si primeste ETH de test

---

### Comenzi Utile

```powershell
# Porneste blockchain local
npx hardhat node

# Compileaza smart contracts
npx hardhat compile

# Ruleaza teste
npx hardhat test

# Deploy pe retea locala
npx hardhat run scripts/deploy.ts --network localhost

# Deploy pe Sepolia testnet
npx hardhat run scripts/deploy.ts --network sepolia

# Porneste frontend (in alt terminal)
cd frontend
npm run dev
```

---

### Structura Proiectului

```
blockchain/
├── circuits/           # Circuite Circom (ZK proofs)
├── contracts/          # Smart Contracts Solidity
├── frontend/           # Aplicatie Next.js
├── scripts/            # Scripturi deployment
├── test/               # Teste
├── ptau/               # Powers of Tau (pentru ZK setup)
├── hardhat.config.ts   # Configurare Hardhat
├── package.json        # Dependente Node.js
└── .env                # Variabile mediu 
```

