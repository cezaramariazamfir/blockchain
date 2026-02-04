// Adresele contractelor tale proaspăt deployate pe Sepolia
export const CONTRACT_ADDRESSES = {
    SoulboundToken:      "0xa177E436E05C47150443180616dd5AC10fd2251e",
    IdentityRegistry:    "0xcd2858A6C964b982FBb1c867B0bD3E985511904E",
    Groth16Verifier:     "0xe485991E2c961A07440F236B662933B35912Ab16",
    AcademicCredentials: "0x685fdf574A670e2Ec7E6C7987546A8C2F30Df640"
};

// ABI-ul necesar pentru ca AdminPage să poată interacționa cu IdentityRegistry
export const REGISTRY_ABI = [
    "function updateMerkleRoot(uint256 predicateId, bytes32 newRoot) external",
    "function getMerkleRoot(uint256 predicateId) view returns (bytes32)",
    // Event pentru Observer Pattern
    "event MerkleRootUpdated(uint256 indexed predicateId, bytes32 indexed oldRoot, bytes32 indexed newRoot)"
];

// ABI-ul necesar pentru ca StudentPage sa poata chema functia de claim
export const CREDENTIALS_ABI = [
    "function claimCredential(uint256 predicateId, uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[3] input) external payable",
    "function getIssuanceFee() view returns (uint256)",
    // Event pentru Observer Pattern
    "event CredentialClaimed(address indexed student, uint256 indexed predicateId, bytes32 indexed nullifier, uint256 tokenId, uint256 feePaid)"
];