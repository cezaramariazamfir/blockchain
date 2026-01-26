// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


interface ISoulboundToken {
    function mint(address to, uint256 predicateId, bytes32 nullifier) external returns (uint256);
    function isNullifierUsed(bytes32 nullifier) external view returns (bool);
}

interface IIdentityRegistry {
    function getMerkleRoot(uint256 predicateId) external view returns (bytes32);
    function verifyMerkleProof(
        bytes32 leaf,
        bytes32[] calldata proof,
        uint256[] calldata positions,
        uint256 predicateId
    ) external view returns (bool);
}

// nu il avem inca - va fi implemntat in circuit
interface IVerifier {
    function verifyProof(
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[2] calldata _pubSignals  // [merkleRoot, nullifier]
    ) external view returns (bool);
}


contract AcademicCredentials {


    address public admin;

    ISoulboundToken public soulboundToken;
    IIdentityRegistry public registry;
    IVerifier public verifier;

    // flag pentru a activa/dezactiva verificarea ZK 
    bool public zkVerificationEnabled;

    // taxa va fi 0 
    uint256 public issuanceFee;


    event CredentialClaimed(
        address indexed student,
        uint256 indexed predicateId,
        bytes32 nullifier,
        uint256 tokenId,
        uint256 feePaid
    );

    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ZKVerificationToggled(bool enabled);
    event IssuanceFeeUpdated(uint256 oldFee, uint256 newFee);
    event FundsWithdrawn(address indexed to, uint256 amount);


    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor(
        address _soulboundToken,
        address _registry,
        uint256 _issuanceFee      
    ) {
        admin = msg.sender;
        soulboundToken = ISoulboundToken(_soulboundToken);
        registry = IIdentityRegistry(_registry);
        zkVerificationEnabled = false;  // dezactivat pana la impl din circuit
        issuanceFee = _issuanceFee;
    }

    // verificare cu zk 
    function claimCredential(
        uint256 predicateId,
        bytes32 nullifier,
        uint256[2] calldata _pA,
        uint256[2][2] calldata _pB,
        uint256[2] calldata _pC,
        uint256[2] calldata _pubSignals  // [merkleRoot, nullifier]
    ) external payable returns (uint256) {

        // verifica taxa de eliberare
        require(msg.value >= issuanceFee, "Insufficient issuance fee");

        // verifica ca nullifier ul nu a fost folosit
        require(!soulboundToken.isNullifierUsed(nullifier), "Nullifier already used");

        // verifica ca exista un merkle root pt predicateId
        bytes32 expectedRoot = registry.getMerkleRoot(predicateId);
        require(expectedRoot != bytes32(0), "Predicate not active");

        // verificare ZK proof
        require(zkVerificationEnabled, "ZK verification not enabled");
        require(address(verifier) != address(0), "Verifier not set");

        // verifica ca root ul din proof e cel stocat on-chain
        require(bytes32(_pubSignals[0]) == expectedRoot, "Invalid merkle root in proof");

        // verifica ca nullifier ul din proof e cel trimis
        require(bytes32(_pubSignals[1]) == nullifier, "Nullifier mismatch");

        bool validProof = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(validProof, "Invalid ZK proof");

        // mint
        uint256 tokenId = soulboundToken.mint(msg.sender, predicateId, nullifier);

        emit CredentialClaimed(msg.sender, predicateId, nullifier, tokenId, msg.value);

        return tokenId;
    }


    // verificare on-chain pentru testare
    function claimCredentialWithMerkleProof(
        uint256 predicateId,
        bytes32 commitment,      // leaf ul = hash(secret)
        bytes32 nullifier,
        bytes32[] calldata merkleProof,
        uint256[] calldata proofPositions
    ) external payable returns (uint256) {

        // verifica taxa 
        require(msg.value >= issuanceFee, "Insufficient issuance fee");

        require(!soulboundToken.isNullifierUsed(nullifier), "Nullifier already used");

        // verifica Merkle proof on-chain
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
