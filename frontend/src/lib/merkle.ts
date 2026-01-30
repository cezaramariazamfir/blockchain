import { buildPoseidon } from "circomlibjs"; //generatorul pt functia de hash Poseidon
import { MerkleTree } from "merkletreejs"; //librărie care gestionează logica de ordonare și stocare a nodurilor într-un arbore binar

export class MerkleService {
    private poseidon: any; //instanta motorului de calcul Poseidon

    // Inițializarea Poseidon este asincronă
    async init() {
        if (!this.poseidon) {
            this.poseidon = await buildPoseidon(); 
            // buildPoseidon incarca in memorie un binar wasm. 
            // JS e mult prea lent pentru calculele necesare Poseidon, asa ca folosim binarul compilat pentru viteza
            // poseidon = o referinta spre obiectul incarcat in memorie de catre buildPoseidon,
            //                              obiect care contine: - functia de hashing
            //                                                   - constante matematice necesare pt a asigura securitatea hash-ului
        }
    }

    // Funcție internă care calculează hash-ul și returnează BigInt
    private hashToBigInt(values: any[]): bigint {
        const processedValues = values.map(v => {
            // Dacă e Buffer
            if (Buffer.isBuffer(v)) {
                return BigInt('0x' + v.toString('hex'));
            }
            // Dacă e string, convertim la BigInt
            if (typeof v === 'string') {
                return BigInt(v);
            }
            // Dacă e deja BigInt sau număr, îl lăsăm așa
            if (typeof v === 'bigint' || typeof v === 'number') {
                return v;
            }
            // Altfel, încercăm să-l convertim
            return BigInt(v.toString());
        });
        const res = this.poseidon(processedValues);
        return this.poseidon.F.toObject(res);
    }

    // Funcție de hash pentru MerkleTree - returnează Buffer
    hashFn(values: any[]) {
        const bigIntResult = this.hashToBigInt(values);
        // IMPORTANT: MerkleTree se așteaptă la un Buffer, nu la BigInt
        // Convertim BigInt la Buffer hexazecimal
        const hexString = bigIntResult.toString(16).padStart(64, '0'); // 32 bytes = 64 hex chars
        return Buffer.from(hexString, 'hex');
        // circuitele ZK lucreaza cu numere dintr-un set limitat (mod n, unde n este f. mare si prim)
        //poseidon.F = obiect ce contine metodele necesare pentru a face operatii ( + / - / conversii de tip toObject) in finite field
    }

    // Funcție publică pentru calcularea commitment-ului unui secret - returnează string
    computeCommitment(secret: string): string {
        return this.hashToBigInt([secret]).toString();
    }

    async createTree(commitments: string[]) { //transforma o lista de commitments in merkleTree, pe care il returneaza
        await this.init(); //ma asigur ca motorul Poseidon e gata de utilizare

        // 1. Convertim commitments (deja hash-uite) la Buffer
        // NU mai hash-uim din nou, pentru că sunt deja Poseidon(secret)
        // MerkleTree se așteaptă la Buffer-e când hashLeaves: false
        const leaves = commitments.map(c => {
            const hexString = BigInt(c).toString(16).padStart(64, '0'); // 32 bytes
            return Buffer.from(hexString, 'hex');
        });

        // 2. Construim arborele
        // Folosim sortPairs: false pentru că ordinea este dictată de pathIndices în circuit
        const tree = new MerkleTree(leaves, (concatenated: Buffer) => {
            // MerkleTree pasează nodurile ca un singur Buffer concatenat (left+right)
            // Trebuie să-l împărțim în două bucăți de câte 32 bytes
            const left = concatenated.slice(0, 32);
            const right = concatenated.slice(32, 64);
            return this.hashFn([left, right]);
        }, {
                                            // MerkleTree apelează hash function cu UN Buffer ce conține left+right concatenate
            hashLeaves: false, // nu mai hash-uiesc o data frunzele, pt ca frunzele = commitments = Poseidon(secret) //deja hash-uit
            sortPairs: false //În arborii Merkle standard (ex: Bitcoin), perechile de noduri sunt sortate alfabetic înainte de a fi 
                                // hashuite pentru a simplifica dovezile. 
                                // În ZK, acest lucru este interzis dacă vreau să folosesc pathIndices. 
                                // Circuitul calculează leftInput și rightInput bazându-se pe ordinea exactă. 
                                // Dacă am sorta perechile, ordinea ar fi aleatorie și formula matematică din Circom ar eșua.
        });

        return tree;
    }

    async getProofData(tree: MerkleTree, leafIndex: number) {

        // functie ce returneaza, pentru un student, drumul de la frunza sa catre radacina, adica:
        // functie ce extrage din Merkle tree exact datele de care are nevoie circuitul circom pentru a parcurge
        //      Merkle tree-ul de la frunza studentului la radacina si a emite nullifier-ul
        // studentul va folosi root, pathElements si pathIndices bagandu-le in circuit si generand dovada zero-knowledge

        const allLeaves = tree.getLeaves();
        console.log("Total leaves in tree:", allLeaves.length);
        console.log("Leaf at index", leafIndex, ":", '0x' + allLeaves[leafIndex].toString('hex'));


        const proof = tree.getProof(tree.getLeaves()[leafIndex]); //caut in arbore si extrag: lista de frati necesara pentru a reconstrui radacina
                                                                    // pornind de la studentul aflat la leafIndex
        //const root = tree.getHexRoot(); // extrage radacina Merkle Tree - ului sub forma de string hexazecimal
                                        // ea va fi folosita pentru a verifica daca radacina reconstruita de circuit se potriveste
                                        // cu cea stocata on-chain
        const root = BigInt(tree.getHexRoot()).toString();

        // Extragem elementele (pathElements) și direcțiile (pathIndices)
        const pathElements = proof.map(p => {
            // Dacă e Buffer, convertim la BigInt string
            if (Buffer.isBuffer(p.data)) {
                return BigInt('0x' + p.data.toString('hex')).toString();
            }
            // Dacă e deja BigInt sau număr
            return BigInt(p.data).toString();
        });
        // IMPORTANT: În MerkleTree, position='left' înseamnă că proof element merge pe stânga
        // În circuit, pathIndices=0 înseamnă că nodul CURENT e pe stânga
        // Deci: proof position='left' => current node e pe dreapta => pathIndices=1
        const pathIndices = proof.map(p => (p.position === 'left' ? 1 : 0));



        // Padding pentru a ajunge la cele 12 nivele cerute de circuit
        // - circuitul circom e un sistem static de ecuatii, compilat pentru un arbore cu exact 12 niveluri
        // - daca arborele are prea putine frunze pentru a avea 12 niveluri,
        //  => adaug frati 0-uri, pentru a construi un arbore cu 12 niveluri.

        // Modul acesta de cosntructie a drumului va coincide cu cel in care adminul creeaza radacina root publicata pe blockchain.
        // Adminul creeaza cu createTree un arbore de inaltime minima care sa includa toti studentii pe frunze,
        // Dar il va inalta cu zero-uri pana atinge 12 niveluri inainte de a publica root-ul pe blockchain.

        while (pathElements.length < 12) {
            pathElements.push("0");
            pathIndices.push(0);
        }

        return {
            root,
            pathElements,
            pathIndices
        };
    }
}