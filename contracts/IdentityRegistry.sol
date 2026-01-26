// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract IdentityRegistry {

    address public admin;


    // predicateId => merkleRoot
    // Exemplu:
    //    (Anul 3)    => 0x123... (root-ul arborelui cu studentii din anul 3)
    //    (Media>=8)  => 0x456... (root-ul arborelui cu studentii cu media >= 8)
    mapping(uint256 => bytes32) public merkleRoots;

    // pastram toate root-urile vechi pentru audit
    // predicateId => lista de roots istorice
    mapping(uint256 => bytes32[]) public rootHistory;


    event MerkleRootUpdated(uint256 indexed predicateId, bytes32 indexed oldRoot, bytes32 indexed newRoot);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);


    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }


    constructor() {
        admin = msg.sender;
    }


    // adminul seteaza/actualizeaza Merkle root pentru un predicat
    // apelat cand universitatea adauga/sterge studenti din lista
    function updateMerkleRoot(
        uint256 predicateId,
        bytes32 newRoot
    ) external onlyAdmin {
        bytes32 oldRoot = merkleRoots[predicateId];

        // salveaza root-ul vechi in istoric 
        if (oldRoot != bytes32(0)) {
            rootHistory[predicateId].push(oldRoot);
        }

        merkleRoots[predicateId] = newRoot;
        emit MerkleRootUpdated(predicateId, oldRoot, newRoot);
    }

    function updateMerkleRootsBatch(
        uint256[] calldata predicateIds,
        bytes32[] calldata newRoots
    ) external onlyAdmin {
        require(predicateIds.length == newRoots.length, "Arrays length mismatch");

        for (uint256 i = 0; i < predicateIds.length; i++) {
            bytes32 oldRoot = merkleRoots[predicateIds[i]];

            if (oldRoot != bytes32(0)) {
                rootHistory[predicateIds[i]].push(oldRoot);
            }

            merkleRoots[predicateIds[i]] = newRoots[i];
            emit MerkleRootUpdated(predicateIds[i], oldRoot, newRoots[i]);
        }
    }



    // verificarea se face in circuitul ZK
    // pastram functa asta doar pentru testare
    function verifyMerkleProof(
        bytes32 leaf,           // commitment ul studentului
        bytes32[] calldata proof,  // calea de la leaf la root (siblings)
        uint256[] calldata positions, // 0 = leaf e stanga, 1 = leaf e dreapta
        uint256 predicateId     // pentru care predicat verificam
    ) external view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];

            if (positions[i] == 0) {
                // leaf ul curent e pe stanga
                computedHash = keccak256(abi.encodePacked(computedHash, sibling));
            } else {
                // leaf ul curent e pe dreapta
                computedHash = keccak256(abi.encodePacked(sibling, computedHash));
            }
        }

        // verificam daca am ajuns la root-ul corect
        return computedHash == merkleRoots[predicateId];
    }


    function getMerkleRoot(uint256 predicateId) external view returns (bytes32) {
        return merkleRoots[predicateId];
    }

    function isPredicateActive(uint256 predicateId) external view returns (bool) {
        return merkleRoots[predicateId] != bytes32(0);
    }

    function getRootHistoryLength(uint256 predicateId) external view returns (uint256) {
        return rootHistory[predicateId].length;
    }

    function getHistoricalRoot(uint256 predicateId, uint256 index) external view returns (bytes32) {
        require(index < rootHistory[predicateId].length, "Index out of bounds");
        return rootHistory[predicateId][index];
    }


    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid address");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}
