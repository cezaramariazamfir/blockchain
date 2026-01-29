// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;


// librarie pt testare si securizare
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SoulboundToken is ERC721 { 
    // transforma succesul verificarii ZK intr-o diploma digitala (NFT), care nu poate fi vanduta sau mutata din portofelul studentului
    // mosteneste standardul universal pt NFTs (ERC271) de la Open Zeppelin. => diplomele sunt vizibile in wallet-uri ca MetaMask




    // mecanism anti-sybil: verifica daca am voie sa primesc token ul
    // nullifier = hash(secret+predicateId) 
    // garanteaza ca studentul (secret) poate prima diploma (predicateId) o singura data

    //dictionar ce are drept cheie nullifier si drept valoare True daca diploma studentului cu secretul "secret", pentru predicateId-ul "predicateId" a mai fost ceruta o data
    mapping(bytes32 => bool) public usedNullifiers; //folosim mapping si nu lista pentru eficienta dpdv timp de executie



    // asociaza token ul creat cu acelasi predicateId verificat mai sus
    // daca nullifier ul a permis crearea, aici stocam ce reprezinta acel token
    mapping(uint256 => uint256) public tokenPredicates; //dcitionar:
                                                        //cheie = tokenId = nr unic de serie al diplomei
                                                        // valoare = predicateId = codul categoriei diplomei (ex: 2 pt "Student FMI")


    uint256 private _tokenIdCounter;     // fiecare token trebuie sa aiba un id unic
    address public minter;              // singura adresa care are voie sa faca mint = creare token nou
    address public admin;              // el decide ce adresa e minter


    // events sunt log urile emise de contract pt frontend
    event CredentialMinted(
        address indexed recipient,  // cine a primit
        uint256 indexed tokenId,    // id ul tokenului 
        uint256 predicateId,        // ce a primit 
        bytes32 nullifier           
    );

    // se emite doar cand admin ul schimba minterul
    event MinterUpdated(address indexed oldMinter, address indexed newMinter);


    modifier nullifierNotUsed(bytes32 nullifier) {
        require(!usedNullifiers[nullifier], "Nullifier already used");
        _;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Only minter");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }


    constructor() ERC721("AcademicCredential", "ACAD") {
        admin = msg.sender;   // msg.sender=cine face deploy (eu initial)
        minter = msg.sender;
    }


    // prin functia update se fac: Mint (creare), Transfer si Burn (stergere)
    // noi o suprascriem pt ca nu vrem sa se poata transfera/sterge tokenii
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        // cine detine token ul
        address from = _ownerOf(tokenId);

        // from == address(0) inseamna MINT (token nou)
        // from != address(0) inseamna TRANSFER (token exista) BLOCAM
        require(from == address(0), "Soulbound: transfer not allowed"); //daca tokenul nu exista inca => _ownerOf() returneaza address(0)

        // Cazul A (MINT): 
        // Dacă from este address(0), condiția este adevărată. 
        // Contractul înțelege că acesta este un token nou care acum se naște. Tranzacția continuă.

        // Cazul B (TRANSFER): 
        // Dacă studentul încearcă să trimită diploma unui prieten, from va fi adresa studentului (deci NU este address(0)). 
        // Condiția devine falsă, require oprește totul și afișează eroarea: "Soulbound: transfer not allowed".

        return super._update(to, tokenId, auth); //<=> "Acum că am verificat regula mea de Soulbound, 
                                                 // mergi mai departe și fă procedura normală de creare a token-ului din librăria de bază".
    }


    function mint( //functie care transforma verificarea reusita intr-o diploma digitala oficiala
        address to,
        uint256 predicateId,
        bytes32 nullifier
    ) external onlyMinter nullifierNotUsed(nullifier) returns (uint256) {

        usedNullifiers[nullifier] = true;           // marcheaza nullifier ca folosit
        uint256 tokenId = _tokenIdCounter++;        // id unic pt token
        tokenPredicates[tokenId] = predicateId;     // tipul tokenului
        _safeMint(to, tokenId);                     // creeaza token ul = adauga NFT-ul in portofelul digital al studentului

        emit CredentialMinted(to, tokenId, predicateId, nullifier);
        return tokenId; //returneaza id-ul diplomei
    }


    function setMinter(address newMinter) external onlyAdmin {
        require(newMinter != address(0), "Invalid address");
        emit MinterUpdated(minter, newMinter);
        minter = newMinter;
    }


    // ce reprezinta acel token
    function getTokenPredicate(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenPredicates[tokenId];
    }

    // verifica daca nullifierul a fost fol
    function isNullifierUsed(bytes32 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }

    // cati tokenii avem
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    // folosite pentru teste, inainte de a introduce Merkle Trees:

    // function computeTokenHash(
    //     address owner,
    //     uint256 predicateId
    // ) external pure returns (bytes32) {
    //     return keccak256(abi.encodePacked(owner, predicateId));
    // }

    // function computeNullifier(uint256 secret) external pure returns (bytes32) {
    //     return keccak256(abi.encodePacked(secret));
    // }
}
