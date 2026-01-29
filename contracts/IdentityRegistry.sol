// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


contract IdentityRegistry { //un fel de BD securizata si anonimizata pentru studenti

    address public admin; //adresa care are dreptul de a actualiza listele facultatii


    // predicateId => merkleRoot
    // Exemplu:
    //    (Anul 3)    => 0x123... (root-ul arborelui cu studentii din anul 3)
    //    (Media>=8)  => 0x456... (root-ul arborelui cu studentii cu media >= 8)
    mapping(uint256 => bytes32) public merkleRoots; //asociaza un predicateId cu radacina Merkle actuala a acelei liste

    // pastram toate root-urile vechi pentru audit
    // predicateId => lista de roots istorice
    mapping(uint256 => bytes32[]) public rootHistory; //pentru fiecare cheie predicateID se salveaza 
                                                      //lista radacinilor tuturor Merkle Tree-urilor pentru acel predicateId care au existat la un moment dat

    // exemplu ca sa intelegi mai bine, amaratule:

    //Imaginează-ți categoria "Bursieri 2024" (predicateId = 10):

    //Pasul 1: Octombrie 2024
    // - Universitatea publică prima listă cu 50 de studenți.
    // - Se calculează Merkle Root-ul: 0xAAA...
    // - merkleRoots[10] = 0xAAA...
    // - rootHistory[10] este încă gol. (nu am date istorice pe care sa le stochez aici)

    //Pasul 2: Noiembrie 2024
    // - Se mai adaugă 5 studenți care au depus dosarul târziu.
    // - Lista se schimbă, deci și Merkle Root-ul se schimbă în: 0xBBB...
    // - Funcția updateMerkleRoot vede că exista deja 0xAAA....
    // - Rezultat: * rootHistory[10] = [0xAAA...] (rădăcina veche e salvată aici).
    // - merkleRoots[10] = 0xBBB... (rădăcina nouă devine cea activă).

    // Pasul 3: Decembrie 2024
    // - Se elimină un student care a fost exmatriculat (era psd-ist).
    // - Merkle Root-ul devine: 0xCCC...
    // - Rezultat final în storage:
    // - merkleRoots[10] = 0xCCC... (Rădăcina curentă).
    // - rootHistory[10] = [0xAAA..., 0xBBB...] (Toate versiunile anterioare ale listei).

    // De ce este acest lucru vital? (Logica de Audit)
    // Fără rootHistory, am avea o problemă mare de securitate și experiență a utilizatorului:
    // Validitate Retroactivă: 
    //      Dacă un student a generat o dovadă ZK marți (bazată pe rădăcina 0xBBB...), 
    //      dar trimite tranzacția miercuri, după ce universitatea a schimbat rădăcina în 0xCCC..., tranzacția lui ar pica.
    // Audit: 
    //      Oricine poate demonstra că a făcut parte dintr-o listă a universității la un moment dat în timp, 
    //      chiar dacă lista de azi este diferită.


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
    // function verifyMerkleProof(
    //     bytes32 leaf,           // commitment ul studentului
    //     bytes32[] calldata proof,  // calea de la leaf la root (siblings)
    //     uint256[] calldata positions, // 0 = leaf e stanga, 1 = leaf e dreapta
    //     uint256 predicateId     // pentru care predicat verificam
    // ) external view returns (bool) {
    //     bytes32 computedHash = leaf;

    //     for (uint256 i = 0; i < proof.length; i++) {
    //         bytes32 sibling = proof[i];

    //         if (positions[i] == 0) {
    //             // leaf ul curent e pe stanga
    //             computedHash = keccak256(abi.encodePacked(computedHash, sibling));
    //         } else {
    //             // leaf ul curent e pe dreapta
    //             computedHash = keccak256(abi.encodePacked(sibling, computedHash));
    //         }
    //     }

    //     // verificam daca am ajuns la root-ul corect
    //     return computedHash == merkleRoots[predicateId];
    // }


    function getMerkleRoot(uint256 predicateId) external view returns (bytes32) {
        return merkleRoots[predicateId];
    }




    // merkleRoots e o variabila de tip mapping
    // ea asociaza fiecarui predicateId = 0,1,2,...
    // cate o radacina a unui Merkle tree ce encodeaza lista studentilor ce fac parte din categoria 0,1,2...
    // o variabila de tip mapping returneaza valoarea implicita  = 32B de 0, daca nu a fost initializata niciodata
    // aceasta functie returneaza True daca merkleRoots[predicateId], adica radacina merkle tree-ului pt predicatId-ul dat e diferita de 0
    // (pt ca asta inseamna ca facultatea a incarcat deja o lista de studenti - encodata intr-un merkle tree, pentru acel predicateId)

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
