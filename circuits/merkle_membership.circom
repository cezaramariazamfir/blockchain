pragma circom 2.1.6;

include "../node_modules/circomlib/circuits/poseidon.circom";

// Circuit pentru verificarea membership-ului intr-un Merkle tree
template MerkleTreeVerifier(levels) {
    // inputs private (doar studentul le stie)
    signal input secret;                    // secretul studentului
    signal input pathElements[levels];      // elementele din Merkle proof
    signal input pathIndices[levels];       // pozitiile (0=stanga, 1=dreapta)

    // inputs public (vizibile on-chain)
    signal input merkleRoot;                // root ul setat de universitate
    signal input predicateId;               

    
    signal output nullifier;                // pentru anti-Sybil 

    // calculeaza commitment ul = Poseidon(secret)
    component leafHasher = Poseidon(1);
    leafHasher.inputs[0] <== secret;
    signal leaf <== leafHasher.out;

    // verifica Merkle proof, urca de la leaf la root
    component hashers[levels];
    signal hashes[levels + 1];
    signal leftInput[levels];
    signal rightInput[levels];

    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);

        // pathIndices[i] determina ordinea: 0 = current e pe stanga, 1 = current e pe dreapta
        // Daca pathIndices = 0: hash(current, sibling)
        // Daca pathIndices = 1: hash(sibling, current)

        leftInput[i] <== hashes[i] + pathIndices[i] * (pathElements[i] - hashes[i]);
        rightInput[i] <== pathElements[i] + pathIndices[i] * (hashes[i] - pathElements[i]);

        hashers[i].inputs[0] <== leftInput[i];
        hashers[i].inputs[1] <== rightInput[i];
        hashes[i + 1] <== hashers[i].out;
    }

    // verifica ca root-ul calculat == root-ul asteptat
    signal computedRoot <== hashes[levels];
    computedRoot === merkleRoot;

    // calculeaza nullifier = Poseidon(secret, predicateId)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== predicateId;
    nullifier <== nullifierHasher.out;
}

// 12 nivele deci pana la 2^12 = 4096 studenti per predicat
component main {public [merkleRoot, predicateId]} = MerkleTreeVerifier(12);
