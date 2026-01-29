pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom"; //importa alg. de hash Poseidon - mult mai rapid si mai eficient pentru circuitele ZK decat cel std (keccak)

// Circuit pentru verificarea membership-ului intr-un Merkle tree
// template -> pentru ca definim sablonul circuitului
template MerkleTreeVerifier(levels) { //levels = inaltimea Merkle Tree - 12 niveluri => 2^12 studenti = 4096

    // inputs private (doar studentul le stie)
    signal input secret;                    // secretul studentului - de aici calculez commitment = Poseidon(secret) si obtin identitatea sa in arbore
    signal input pathElements[levels];      // elementele din Merkle proof = hash-urile fratilor din arbore - necesare pt a reconstrui drumul spre root
    signal input pathIndices[levels];       // pozitiile (0=stanga, 1=dreapta) - lista de 0 si 1 care indica pt fiecare nivel in parte daca nodul curent (provenit de pe ramura ce contine nodul studentului) e pe stanga sau pe dreapta

    // inputs public (vizibile on-chain)
    signal input merkleRoot;                // root ul Merkle Tree-ului pentru care vrem sa verificam apartenenta
    signal input predicateId;               // tipul de categorie fata de care studentul vrea sa demonstreze apartenenta (indexul tipului de diploma)

    
    signal output nullifier;                // pentru anti-Sybil 
                                            // o amprenta unica = Poseidon(secret, predicatId), folosita pentru a preveni cererile multiple


    // Poseidon(n) = creez un hasher care accepta ca input n componente si returneaza un hash al tuturor

    // calculeaza commitment ul studentului = Poseidon(secret)
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== secret;
    signal leaf <== leafHasher.out; //asta e commitmentul studentului = Poseidon(secret) = frunza sa din arbore

    // verifica Merkle proof, urca de la leaf la root
    component hashers[levels]; //definesc o lista de 12 hashere, cate un hasher pentru fiecare nivel al arborelui
    signal hashes[levels + 1]; // definesc o lista cu 13 elemente ce vor stoca hash-urile intermediare pe drumul spre root
    signal leftInput[levels]; // o lista cu 12 elemente reprezentand nodul stang de la nivelul curent, in drumul spre radacina
    signal rightInput[levels]; // lista cu 12 elemente reprezentand nodul drept de la nivelul curent, in drumul spre radacina

    hashes[0] <== leaf; //primul hash e chiar frunza studentului

    for (var i = 0; i < levels; i++) { // pentru fiecare nivel de la i=0 (nivelul 12 = baza = al frunzelor) la i = 11 (nivelul radacinii)
        hashers[i] = Poseidon(2); //definesc un hasher ce primeste ca input 2 argumente (hash stg si hash drept)

        // pathIndices[i] determina ordinea: 0 = current e pe stanga, 1 = current e pe dreapta
        // Daca pathIndices = 0: hash(current, sibling)
        // Daca pathIndices = 1: hash(sibling, current)

        leftInput[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        rightInput[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashers[i].inputs[0] <== leftInput[i];
        hashers[i].inputs[1] <== rightInput[i];
        hashes[i + 1] <== hashers[i].out;
    }

    //(1) circuitele ZK nu permite if/else
    //(2) Poseidon(A, B) != Poseidon(B,A) => ne intereseaza 
    //  daca nodul curent provenit din ramura pe care se afla frunza studentului e pe stanga sau pe dreapta al nivelului curent

    //(1), (2) => pentru a decide unde este current (stg sau dr) si unde este fratele la nivelul curent, avem nevoie de un mecanism ce nu implica if/else
    // => 
    // in loc de:        if (pathIndices[i] == 0) //nodul curent e pe stanga
    // folosim:          leftInput[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
    // explicatie:       Daca nodul curent e pe stanga => pathIndices[i] = 0
    //                                                  => leftInput[i] = hashes[i] //adica inputul stang ce va intra in Poseidon(..., ...) e nodul curent, 
    //                                                                                ( ceea ce e corect, pt ca nodul curent e pe stanga)

    // in loc de:       if (pathIndices[i] == 1) //nodul curent e pe dreapta
    // folosim:         leftInput[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
    // explicatie:      Daca nodul curent e pe dreapta => leftInput = hashes[i] + 1 * (pathElements[i] - hashes[i]) =
    //                                                              = hashes[i] + pathElements[i] - hashes[i] =
    //                                                              = pathElements[i] //adica inputul stang ce va intra in Poseidon(..., ...) e fratele din stanga mea, 
    //                                                                                ( ceea ce e corect, pt ca nodul curent e pe stanga)

    // analog pentru rightInput...

    // DUPA CE AM STABILIT CINE INTRA CA PRIM ARG. IN POSEIDON SI CINE INTRA CA AL DOILEA ARG. IN POSEIDON (NOD CURENT / FRATELE):

    // - hasherului de la nivelul i ii dau ca input leftInput, rightInput (nod curent + fratele SAU fratele + nod curent):
    //          hashers[i].inputs[0] <== leftInput[i];
    //          hashers[i].inputs[1] <== rightInput[i];

    // - hashul de la nivelul urmator (de mai sus, de pe ramura pe care se afla la baza frunza studentului) devine Poseidon(hashul nodului curent + hashul fratelui //SAU INVERS)
    //          hashes[i + 1] <== hashers[i].out;

    // Intr-un final, am ajuns sa calculez rootul (computedRoot)

    // verifica ca root-ul calculat == root-ul asteptat
    signal computedRoot <== hashes[levels];
    computedRoot === merkleRoot; // merkleRoot e dat ca argument circuitului , public signal input

    // calculeaza nullifier = Poseidon(secret, predicateId)
    component nullifierHasher = Poseidon(2); // creez un hasher ce primeste 2 argumente (secret + predicateId)
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== predicateId;
    nullifier <== nullifierHasher.out;
}

// 12 nivele deci pana la 2^12 = 4096 studenti per predicat
component main {public [merkleRoot, predicateId]} = MerkleTreeVerifier(12);
// - linia de mai sus reprezinta instantierea componentei = transformarea sablonului intr-un obiect matematic concret, care poate fi compilat
// - In circom, template e ca o clasa (schita)
//              component e ca un obiect (o instanta)
// - main spune compilatorului: "aici incepe executia circuitului"
// - tot ce se afla in interiorul lui main va fi tranformat in constraints si wires

// public [merkleRoot, predicateId] = definirea semnalelor publice
// - implicit, in circom toate semnalele (inputs) sunt private
// - in acolada aleg ce informatii vreau sa fie vizibile pentru smart contract

// - smart contractul trebuie sa vada:
// --- merkleRoot: pentru a confirma ca ea corespunde cu cea calculata in interiorul circuitului
// --- predicateId: pentru a sti pentru ce categorie a fost generata diploma studentului si 
//                  a crea nullifier-ul pentru student, raportat la acea categorie

// = MerkleTreeVerifier(12);
// - aici setez "marimea" circuitului
// - transmitem valoarea 12 parametrului levels
// - => for-ul fin circuit va avea 12 iteratii
// - => matematic, circuitul va putea procesa un Merkle Tree cu pana la 2^12 = 4096 de frunze (commitmenturi ale studentilor)

// Trimit ca input circuitului:

// PRIVAT:
// - secret
// - pathElements
// - pathIndices      - ele sunt criptate in interiorul circuitului si nu vor putea fi aflate de nimeni

// PUBLIC:
// - merkleRoot
// - predicateId

// CUM TRIMIT PARAMETRII CIRCUITULUI?

//intr-un input.json:
// {
//   "secret": "12345678901234567890",
//   "pathElements": [
//     "0x123...",
//     "0x456...",
//     "0x789...",
//     "..." 
//   ],                                                         - generate de o librarie de Merkle Tree (ex: merkletreejs)
//   "pathIndices": [0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 0],       - generate de o librarie de Merkle Tree (ex: merkletreejs)
//   "merkleRoot": "0xabc123...",
//   "predicateId": "10"
// }

// APOI:
// - folosim fișierul .wasm generat la compilare pentru a calcula valorile interne ale circuitului:
//      cd build/circuits/merkle_membership_js
//      node generate_witness.js merkle_membership.wasm ../../../input.json witness.wtns
//          - generate_witness.js: Este scriptul „motor” creat de Circom.
//          - merkle_membership.wasm: Este binarul circuitului nostru.
//          - witness.wtns: Este fișierul rezultat care conține toate calculele noastre (inclusiv secretul și nullifier-ul), gata pentru a fi transformat în dovadă ZK.
//
// Acest pas transformă datele noastre „umane” în semnale electrice matematice (wires). 
// Fără acest witness, nu putem genera dovada (proof) pe care o vom trimite ulterior contractului Verifier.sol.
