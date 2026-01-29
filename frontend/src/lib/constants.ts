// Adresele contractelor tale proaspăt deployate pe Sepolia
export const CONTRACT_ADDRESSES = {
    SoulboundToken: "0x010F6e0C97E151E5eD79A20fb49Efc07E3ac0A7b",
    IdentityRegistry: "0x41f16fAbbF8779D4F8E36c47d0402448a5aD1724",
    Groth16Verifier: "0x9f6f1246aB5246ACfec7D95e01389299E1F0aE13",
    AcademicCredentials: "0x74c740c60B447036839eF63eF706d7Ef9E795720"
};

// ABI-ul necesar pentru ca AdminPage să poată interacționa cu IdentityRegistry
export const REGISTRY_ABI = [
    "function setMerkleRoot(uint256 predicateId, bytes32 merkleRoot) external",
    "function getMerkleRoot(uint256 predicateId) view returns (bytes32)"
];

// ABI-ul necesar pentru ca StudentPage să poată chema funcția de claim
export const CREDENTIALS_ABI = [
    "function claimCredential(uint256 predicateId, uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[1] input) external payable"
];