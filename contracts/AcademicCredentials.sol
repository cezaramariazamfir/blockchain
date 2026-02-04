// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 3 interfete = 3 seturi de reguli care spun lui AcademiCredentials cum sa comunice cu alte contracte existente deja pe blockchain
//             = 3 structuri care definesc semnaturi de functii folosite pentru a permite interactiunea intre smart contracts
//             = nu contin logica propriu zisa, ci semnaturi de functii
// Pentru o interfata:                       1) toate functiile tb sa fie external
//                                           2) nu pot avea variabile de stare
//                                           3) nu pot avea constructor

// O interfata a contractului B folosita de contractul A spune contractului A cum arata anumite functii din contractul B si ii permite sa le foloseasca

// AcademicCredentials cere emiterea de diplome lui SoulboundToken, prin interfata ISoulboundToken
interface ISoulboundToken { 
    //functia care creeaza un token nou
    function mint(address to,           //identificator unic al contului/portofelului studentului pe blockchain
                uint256 predicateId,    //numar intreg ce reprezinta categoria = ce criteriu a indeplinit studentul ("Student la FMI"?, "Student la Master"?)
                bytes32 nullifier       //rezultatul unei fctii hash Poseidon,
                                        // nullifier = Poseidon(secret, predicateId) = amprenta digitala unica pe 32B care ma ajuta sa decid unicitatea cererii (fara a dezvalui cine e studentul)
                ) external returns (uint256);
                //external = modificator care imi spune ca functia e proiectata sa fie apelata din afara contractului SoulboundToken.sol
                //         = mai eficient dpdv al consumului de gas

                // returneaza tokenId-ul = numarul de ordine unic al diplomei nou create in sistem

    //functia care verifica daca un student a mai cerut o data acest token - anti-s=Sybil
    function isNullifierUsed( //verifica daca valoarea nullifier a fost deja inregistrata
                bytes32 nullifier
                ) external view returns (bool); //view -> functia e doar pentru citire
                                                //       - acceseaza datele de pe blockchain (starea contractului), dar nu modifica nimic
                                                //       - nu costa gas daca e apelata de pe un frontend
                                
                                // daca returneaza True => studentul a generat deja un token pentru acel criteriu, iar a doua incercare va fi blocata
}

//AcademicCredentials interactioneaza cu "baza de date" a facultatii prin interfata IIdentityRegistry
//In sistemul nostru, baza de date nu stocheaza nume de studenti, ci dovezi matematice sub forma de Merkle Trees pentru a mentine anonimitatea

//Merkle Tree = structura ierarhica de date obtinuta prin hashuirea succesiva a prechilor de date, pana ramane un singur hash in varf, numit root.
//In Merkle Tree:
//      - root = amprenta intregii liste de studenti (Daca un student e add/eliminat => root se schimba complet)
//      - leaf = amprenta digitala a unui singur student
interface IIdentityRegistry {

    //functie ce returneaza radacina actuala a Merkle Tree-ului pentru un anumit criteriu (predicateID: -Anul 3-   /sau/   -Medie peste 8-   /sau/   -student FMI-)
    function getMerkleRoot(
                    uint256 predicateId                     //id-ul unic al categoriei ce se vrea a fi verificata pentru student
                    ) external view returns (bytes32);      //returneaza root-ul Merkle tree-ului corespunzator categoriei, adica un hash pe 32B ce reprezinta starea actuala a "listei de studenti"
    
                    //view => doar pentru citire, nu consuma gas
                    //external => poate fi apelata din afara contractului
    
    // functie folosita pentru verificarea on-chain, ! FARA ZK !, a apartenentei unui student la o lista
    // o folosim pentru teste
    function verifyMerkleProof(
        bytes32 leaf,                   // Poseidon(secret) = commitment = leaf
        bytes32[] calldata proof,       // lista de hash-uri vecine, necesare pt a reconstrui drumul de la root la leaf
        uint256[] calldata positions,   // directia de combinare (0 = stg, 1 = dr) in timpul procesului de hash-uire
        uint256 predicateId             // categoria fata de care vrem sa verificam apartenenta studentului
    ) external view returns (bool);
    //returneaza True daca studentul face parte din lista studentilor din categoria predicateId

    //logica: contractul identityRegistry ia leaf-ul, il combina succesiv cu elementele din proof (folosind alg. keccak256) si verifica daca rezultatul final e identic cu radacina stocata oficial a Merkle Tree-ului corespunzator categoriei predicateId
}

// generat din circuit - Groth16Verifier

// interfata care spune lui AcademicCredentials.sol cum sa interactioneze cu Verifier.sol
// cu ajutorul functiei din aceasta interfata, AcademicCredentials poate verifica o dovada matematcia, 
// care garanteaza ca studentul are secretul si este in "baza de date", fara a vedea secretul si fara
// a vedea numele studentului

interface IVerifier {

    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,

        // pA, pB si pC = puncte pe o curba eliptica
        // pA si pC = array-uri de 2 numere - coordonate (x, y)
        // pB = matrice 2 x 2 (punct pe o curba extinsa)

        // Aceste 3 elemente formeaza dovada (the proof) si sunt generate de student local, pe calc. lui, folosind circuitul Circom

        uint256[3] calldata _pubSignals  // [nullifier, merkleRoot, predicateId]

        // Daca dovada (pA, pB, pC) e un plic sigilat, pubSignals sunt informatiile scrise pe exteriorul plicului, pe care toata lumea tb sa le vada pt ca sistemul sa functioneze
        // in circuit (merkle_membership.circom), am definit:

        // - pubSignals[0] = nullifier = Poseidon(secret, predicateId) = amprenta digitala unica a secretului studentului, calculata special pt o anumita categorie (diploma)
        //                 = contractul Verifier.sol are nevoie de el pentru a-l salva in lista de usedNullifiers 
        //                 = daca mai vin sa cer o data aceeasi diploma cu acelasi nullifier, Verifier vede ca am mai cerut o data si ma respinge

        // - pubSignals[1] = merkleRoot = amprenta intregii liste de studenti care fac parte dintr-o anumita categorie
        //                 = Verifier trebuie sa stie fata de ce lista vreau sa demonstrez apartenenta
        //                 = Daca eu as genera o lista falsa cu studentii care au peste 8 si m-as include in ea, merkleRoot-ul meu nu ar corespunde cu cel stocat de facultate on-chain

        // - pubSignals[2] = predicateId = categoria fata de care vreau sa verific apartenenta (ex: 1 = student FMI, 2 = media peste 8, 3 = PSDist)
        //                 = pentru ca smart-contractul sa stie ce tip de Soulbound token sa emita

    ) external view returns (bool);

    //calldata = o locatie de memorie temporara si "read-only" unde stau argumentele functiei
    //         = este cea mai ieftina metoda (dpdv gas) de a trimite array-uri catre un contract

}


contract AcademicCredentials {

    //variabile de stare = date stocate permanent pe blockchain:
    address public admin; //adresa celui care a creat contractul AcademicCredentials (facultatea)

    //pointeri catre adresele de memorie de pe blockchain unde apar contractele cu care relationeaza AcademicCredentials, 
    //   dar declarati cu tipul interfetelor acelor contracte

    // DE CE II DECLAR CU TIPUL INTERFETEI?
    // 1. ca AcademicCredentials sa nu fie nevoit sa "citeasca" tot codul din contractul respectiv, ci sa poata sti doar ce functii poate apela de acolo (semnaturi)
    // => AcademicCredentials poate fi compilat separat, fara a depinde de erorile/complexitatea din acele contracte

    // 2. Odata ce un contract e urcat pe blockchain, el nu mai poate fi modificat. Daca vreau sa schimb logica din mint() sau isNullifierUsed(), trebuie doar sa actualizez adresa (pointerul) din AcademicCredentials
    // => nu trebuie sa refac contractul principal (AcademicCredentials)

    // 3. Daca as importa tot contractul SoulboundToken.sol, dimenisunea binara a contractului AcademicCredentials.sol ar creset inutil
    // => Interfata ocupa mult mai putin spatiu si ofera exact informatia necesara pentru a efectua apelul extern

    // 4. Prin utilizarea interfetei, fortez o verificare de tip (Type Checking) la compilare
    // => Compilatorul se asigura ca nu incerc sa apelez o functie care nu exista in interfata

    ISoulboundToken public soulboundToken;
    IIdentityRegistry public registry;
    IVerifier public verifier;

    // flag pentru a activa/dezactiva verificarea ZK 
    bool public zkVerificationEnabled;

    // taxa va fi 0 
    uint256 public issuanceFee;


    // event = punte de legatura intre smart contracte si front-end
    // cand o functie dintr-un smart-contract executa o actiune importanta si emite un event, acele date sunt stocate intr-o structura de date speciala numite "Transaction Receipts"
    // stocarea datelor in events este mult mai ieftina (gaswise) decat salvarea lor in variabilele de stare ale contractului
    // smart-contractele nu pot citi events (nici pe ale lor, nici pe ale altor smart-contracte), ci doar aplicatiile externe (front-end-ul) le pot citi.

    // eveniment emis cand un student isi revendica cu succes diploma
    event CredentialClaimed(
        address indexed student,   
        uint256 indexed predicateId,
        bytes32 nullifier,
        uint256 tokenId,
        uint256 feePaid
    );
    // student = adresa portofelului care a primit diploma
    // predicateId = tipul de diploma = criteriu demonstrat (e.g. student FMI)
    // nullifier = Poseidon(secret, PredicateId) = amprenta unica folosita pentru a preveni dubla revendicare
    // tokenId = numarul unic de identificare a noului Soulbound token creat
    // feePaid = taxa platita de student

    // indexed - permite aplicatiei front-end sa caute rapid prin mii de events (ex: Vreau doar diplomele emise pentru adresa X, Arat-mi toti studentii care au diploma cu ID-ul 2)

    // as putea reconstrui toata lista tuturor diplomelor emise doar citind aceste events, fara a interoga direct contractul pentru fiecare ID in parte



    // eveniment declansat cand administratorul facultatii decide sa schimbe contractul care verifica dovezile matematice (ZKP)
    // Daca circuitul Circom e actualizat pt a adauga noi functionalitati, adresa contractului verifier poate fi schimbata
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    //          Adresa vechiului contract de verificare, adresa noului contract


    // event emis ca sa anunte observatorii externi daca sistemul impune sau nu ZKP
    event ZKVerificationToggled(bool enabled);


    // event care inregistreaza momentul in care costul pt obtinerea unei diplome se schimba
    event IssuanceFeeUpdated(uint256 oldFee, uint256 newFee);


    // marcheaza momentul in care fondurile colectate sunt transferate din contract catre adminsitratorul facultatii
    event FundsWithdrawn(address indexed to, uint256 amount);


    //modifier = bucata de cod reutilizabila = filtru pus inaintea executarii unei functii pentru a verifica anumite conditii

    //modifier folosit pentru controlul accesului
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin"); //msg = variabila globala speciala care contine proprietati ale tranzactiei care a apelat functia curenta
        _;                                          //msg.sender = adresa de pe blockchain a contractului sau persoanei care apeleaza functia
                                                    // require = functie de control care verifica daca o conditie e adevarata
                                                    // Daca conditia e falsa => revert = toate schimbarile facute pana in acel punct in tranzactie sunt anulate
                                                    // iar userul primeste mesajul de eroare "Only admin"
                                                    // _; = locul in care va fi inserat la compilare restul codului functiei
                                                    // Solidity executa intai codul din modifier, iar daca require ret. True, cand se ajunge la linia _; => se executa restul codului din functia pe care modifier-ul a pazit-o
    }

    // Constructorul contractului
    constructor(
        address _soulboundToken, //adresa de pe blockchain a contractului
        address _registry,
        uint256 _issuanceFee      
    ) {
        admin = msg.sender; //msg.sender = adresa celui care initiaza tranzactia de deploy = el devine administratorul
        soulboundToken = ISoulboundToken(_soulboundToken); //pointerii catre contracte sunt declarati cu tipul interfetei catre acele contracte
        registry = IIdentityRegistry(_registry);
        zkVerificationEnabled = false;  // dezactivat pana la impl din circuit
        issuanceFee = _issuanceFee;
    }

    // verificare cu zk
    function claimCredential(               //functie prin care un student isi obtine diploma anonima
        uint256 predicateId,                //tipul diplomei solicitate
        uint256[2] calldata _pA,            //componentele matematice ale dovezii ZK (puncte pe curbe eliptice)
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[3] calldata _pubSignals     //datele publice pe care se bazeaza dovada: [nullifier, merkleRoot, predicateId]
    ) external payable returns (uint256) {

        // verifica taxa de eliberare
        require(msg.value >= issuanceFee, "Insufficient issuance fee");

        // extrage valorile din public signals
        bytes32 nullifier = bytes32(_pubSignals[0]);
        bytes32 proofMerkleRoot = bytes32(_pubSignals[1]);
        uint256 proofPredicateId = _pubSignals[2];

        // verifica ca nullifier ul nu a fost folosit
        require(!soulboundToken.isNullifierUsed(nullifier), "Nullifier already used");

        // verifica ca exista un merkle root pt predicateId
        bytes32 expectedRoot = registry.getMerkleRoot(predicateId);
        require(expectedRoot != bytes32(0), "Predicate not active");

        // verifica ca predicateId din proof == cel din parametru
        require(proofPredicateId == predicateId, "Predicate ID mismatch");

        // verifica ca root ul din proof e cel stocat on-chain
        require(proofMerkleRoot == expectedRoot, "Invalid merkle root in proof");

        // verificare ZK proof
        require(zkVerificationEnabled, "ZK verification not enabled");
        require(address(verifier) != address(0), "Verifier not set");

        bool validProof = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(validProof, "Invalid ZK proof");

        // mint  = obtin numarul de ordine unic al diplomei nou create in sistem, pentru studentul cu secretul secret, nullifier = Poseidon(secret, predicateId) si categoria diplomei = predicatId
        uint256 tokenId = soulboundToken.mint(msg.sender, predicateId, nullifier);

        emit CredentialClaimed(msg.sender, predicateId, nullifier, tokenId, msg.value);

        return tokenId;
    }


    // verificare on-chain pentru testare FARA ZK Proof

    // in functia anterioara, claimCredential(), studentul genera o dovada SNARK local, iar smart-contractul vedea doar rezultatul final (True/False).
    // identitatea studentului (commitmentul) ramanea ascuns

    //aici:
    // studentul trebuie sa trimita direct pe blockchain commitment = Poseidon(secret) //hash-ul secretului sau
    // asta inseamna ca oricine se uita pe blockchain poate vedea care frunza din Merkle Tree a revendicat diploma, reducandu-se nivelul de anonimitate
    function claimCredentialWithMerkleProof(
        uint256 predicateId,                    // categoria diplomei cerute
        bytes32 commitment,                     // leaf ul = hash(secret)
        bytes32 nullifier,                      // nullifier = Poseidon(secret, predicateID)
        bytes32[] calldata merkleProof,         // lista de hash-uri intermediare din arborele facultatii, siblings
        uint256[] calldata proofPositions       // directia (stg, dr) pentru fiecare hash din lista, necesara pentru a reconstrui radacina
    ) external payable returns (uint256) {


        //LOGICA: in loc sa intrebam verifier, functia asta intreaba contractul IdentityRegistry

        // verifica taxa 
        require(msg.value >= issuanceFee, "Insufficient issuance fee");

        require(!soulboundToken.isNullifierUsed(nullifier), "Nullifier already used");

        // verifica Merkle proof on-chain
        // contractul registry ia commitmentul si il urca prin arbore folosindu-se de MerkleProof si proofPositions
        // daca radacina calculata manual pe loc coincide cu radacina oficiala a facultatii, inseamna ca studentul e un student valid, care face parte din acel Merkle Tree
        bool validMerkle = registry.verifyMerkleProof(
            commitment,
            merkleProof,
            proofPositions,
            predicateId
        );
        require(validMerkle, "Invalid Merkle proof");

        uint256 tokenId = soulboundToken.mint(msg.sender, predicateId, nullifier);
        emit CredentialClaimed(msg.sender, predicateId, nullifier, tokenId, msg.value);

        return tokenId;
    }



    // seteaza adresa verifier ului (dupa ce e facut in circuit)
    function setVerifier(address _verifier) external onlyAdmin {
        emit VerifierUpdated(address(verifier), _verifier);
        verifier = IVerifier(_verifier);
    }

    // activeaza/dezactiveaza verificarea ZK
    function toggleZKVerification(bool enabled) external onlyAdmin {
        zkVerificationEnabled = enabled;
        emit ZKVerificationToggled(enabled);
    }

    // adminul poate modifica taxa de eliberare
    function setIssuanceFee(uint256 newFee) external onlyAdmin {
        emit IssuanceFeeUpdated(issuanceFee, newFee);
        issuanceFee = newFee;
    }


    // functie de retragere fonduri pt universitare
    function withdraw() external onlyAdmin {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        (bool success, ) = payable(admin).call{value: balance}("");
        require(success, "Withdraw failed");

        emit FundsWithdrawn(admin, balance);
    }


    // contractul poate sa primesca eth direct
    receive() external payable {}
    // external = functia poate fi declansata doar de actori din afara contractului (alti useri sau alte contracte)
    // payable = modificator care da contractului permisiunea de a-si creste balance-ul cu suma primita. fara acest modificator nu as putea trimite fonduri catre contract
    // balance_contract += msg.value

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function isZKEnabled() external view returns (bool) {
        return zkVerificationEnabled;
    }

    function getIssuanceFee() external view returns (uint256) {
        return issuanceFee;
    }
}
