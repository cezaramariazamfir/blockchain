// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;


// librarie pt testare si securizare
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

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

    // Generează metadata-ul NFT-ului cu SVG spectaculos
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        uint256 predicateId = tokenPredicates[tokenId];
        string memory predicateName = getPredicateName(predicateId);

        string memory svg = generateSVG(tokenId, predicateName);

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Academic Credential #',
                        Strings.toString(tokenId),
                        '", "description": "Soulbound academic credential certified on blockchain", "image": "data:image/svg+xml;base64,',
                        Base64.encode(bytes(svg)),
                        '", "attributes": [{"trait_type": "Credential Type", "value": "',
                        predicateName,
                        '"}, {"trait_type": "Token ID", "value": "',
                        Strings.toString(tokenId),
                        '"}, {"trait_type": "Transferable", "value": "No"}]}'
                    )
                )
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    // Generează SVG-ul spectaculos pentru diplomă
    function generateSVG(uint256 tokenId, string memory predicateName) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<svg width="500" height="700" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />',
                '<stop offset="50%" style="stop-color:#16213e;stop-opacity:1" />',
                '<stop offset="100%" style="stop-color:#0f3460;stop-opacity:1" />',
                '</linearGradient>',
                '<linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">',
                '<stop offset="0%" style="stop-color:#ffd700;stop-opacity:1" />',
                '<stop offset="50%" style="stop-color:#ffed4e;stop-opacity:1" />',
                '<stop offset="100%" style="stop-color:#ffd700;stop-opacity:1" />',
                '</linearGradient>',
                '<filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/></filter>',
                '</defs>',
                generateSVGPart2(tokenId, predicateName)
            )
        );
    }

    function generateSVGPart2(uint256 tokenId, string memory predicateName) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<rect width="500" height="700" fill="url(#bg)"/>',
                '<rect x="20" y="20" width="460" height="660" fill="none" stroke="url(#gold)" stroke-width="3" rx="15" filter="url(#shadow)"/>',
                '<rect x="30" y="30" width="440" height="640" fill="none" stroke="url(#gold)" stroke-width="1" rx="10" opacity="0.5"/>',
                '<circle cx="250" cy="100" r="50" fill="url(#gold)" opacity="0.2"/>',
                '<text x="250" y="120" font-family="serif" font-size="60" fill="url(#gold)" text-anchor="middle">&#127891;</text>',
                '<text x="250" y="200" font-family="Georgia,serif" font-size="32" font-weight="bold" fill="#ffffff" text-anchor="middle">ACADEMIC CREDENTIAL</text>',
                '<line x1="100" y1="220" x2="400" y2="220" stroke="url(#gold)" stroke-width="2" opacity="0.6"/>',
                '<text x="250" y="280" font-family="Georgia,serif" font-size="18" fill="#e0e0e0" text-anchor="middle">This certifies that the holder</text>',
                '<text x="250" y="310" font-family="Georgia,serif" font-size="18" fill="#e0e0e0" text-anchor="middle">has successfully demonstrated</text>',
                generateSVGPart3(tokenId, predicateName)
            )
        );
    }

    function generateSVGPart3(uint256 tokenId, string memory predicateName) internal pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<rect x="80" y="340" width="340" height="80" fill="rgba(255,255,255,0.1)" rx="10" stroke="url(#gold)" stroke-width="2"/>',
                '<text x="250" y="390" font-family="Georgia,serif" font-size="24" font-weight="bold" fill="url(#gold)" text-anchor="middle">',
                predicateName,
                '</text>',
                '<text x="250" y="460" font-family="Georgia,serif" font-size="16" fill="#e0e0e0" text-anchor="middle">Verified on Blockchain</text>',
                '<text x="250" y="490" font-family="Georgia,serif" font-size="14" fill="#a0a0a0" text-anchor="middle">Soulbound Token - Non-Transferable</text>',
                '<text x="250" y="560" font-family="monospace" font-size="14" fill="#808080" text-anchor="middle">Token ID: #',
                Strings.toString(tokenId),
                '</text>',
                '<circle cx="80" cy="600" r="3" fill="url(#gold)" opacity="0.6"/>',
                '<circle cx="420" cy="600" r="3" fill="url(#gold)" opacity="0.6"/>',
                '<line x1="85" y1="600" x2="415" y2="600" stroke="url(#gold)" stroke-width="1" opacity="0.3"/>',
                '<text x="250" y="635" font-family="Georgia,serif" font-size="12" fill="#606060" text-anchor="middle">&#10003; Cryptographically Verified</text>',
                '</svg>'
            )
        );
    }

    // Mapează predicateId la nume lizibil
    function getPredicateName(uint256 predicateId) internal pure returns (string memory) {
        if (predicateId == 0) return "Student FMI";
        if (predicateId == 1) return "Anul 3 Studii";
        if (predicateId == 2) return "Student Master";
        return string(abi.encodePacked("Credential #", Strings.toString(predicateId)));
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
