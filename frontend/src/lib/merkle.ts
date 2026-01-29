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

    // Funcție de hash compatibilă cu Poseidon(2) din circuit
    hashFn(values: any[]) {
        const res = this.poseidon(values);
        return this.poseidon.F.toObject(res); 
        // circuitele ZK lucreaza cu numere dintr-un set limitat (mod n, unde n este f. mare si prim)
        //poseidon.F = obiect ce contine metodele necesare pentru a face operatii ( + / - / conversii de tip toObject) in finite field
    }

    async createTree(secrets: string[]) { //transforma o lista de secrete in merkleTree, pe care il returneaza
        await this.init(); //ma asigur ca motorul Poseidon e gata de utilizare

        // 1. Generăm frunzele (Leaves) folosind Poseidon(secret), pentru fiecare secret din lista
        const leaves = secrets.map(s => this.hashFn([s]));

        // 2. Construim arborele
        // Folosim sortPairs: false pentru că ordinea este dictată de pathIndices în circuit
        const tree = new MerkleTree(leaves, (vals: any[]) => this.hashFn(vals), { 
                                            //(vals: any[]) => this.hashFn(vals) <=> de fiecare data cand vrei sa combini 2 noduri 
                                            // pentru a urca un nivel, foloseste functia mea de hash Poseidon = hashFn
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





        const proof = tree.getProof(tree.getLeaves()[leafIndex]); //caut in arbore si extrag: lista de frati necesara pentru a reconstrui radacina
                                                                    // pornind de la studentul aflat la leafIndex
        const root = tree.getHexRoot(); // extrage radacina Merkle Tree - ului sub forma de string hexazecimal
                                        // ea va fi folosita pentru a verifica daca radacina reconstruita de circuit se potriveste
                                        // cu cea stocata on-chain

        // Extragem elementele (pathElements) și direcțiile (pathIndices)
        const pathElements = proof.map(p => p.data.toString());
        const pathIndices = proof.map(p => (p.position === 'left' ? 0 : 1));



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