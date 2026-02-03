// PANOU DE CONTROL PENTRU ADMIN

// - vede cati studenti s-au inscris (si-au trimis commitmentul) pentru fiecare categorie
// - decide când să "sigileze" lista și să o trimită pe Blockchain sub formă de Merkle Root
'use client'; //ii spun browserului ca aceasta pagina e interactiva (are butoane)

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MerkleService } from '@/lib/merkle';
import { CONTRACT_ADDRESSES, REGISTRY_ABI } from '@/lib/constants';
import predicates from '@/lib/predicates.json';

export default function AdminPage() {
    const [enrollments, setEnrollments] = useState<Record<string, string[]>>({}); //listele de inscrieri: {"0": ["hash1", "hash2"], "1": ["hash3"]}
    const [registrationState, setRegistrationState] = useState<Record<string, string>>({}); // Starea înscrierii pentru fiecare predicat
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedPredicate, setSelectedPredicate] = useState<string | null>(null);
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Încărcăm commitment-urile primite de la studenți din baza de date (API)
    const fetchEnrollments = async () => {
        const res = await fetch('/api/enroll');
        const data = await res.json();
        setEnrollments(data);
    };

    // Încărcăm starea înscrierii
    const fetchRegistrationState = async () => {
        const res = await fetch('/api/registration/toggle');
        const data = await res.json();
        setRegistrationState(data.registrationState || {});
    };

    useEffect(() => {
        fetchEnrollments();
        fetchRegistrationState();
    }, []);

    // Deschide înscrierea
    const handleStartRegistration = async (predicateId: string) => {
        try {
            const res = await fetch('/api/registration/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ predicateId, state: 'open' })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchRegistrationState();
            }
        } catch (error) {
            console.error('Eroare:', error);
            alert('Eroare la deschiderea înscrierii');
        }
    };

    // Închide înscrierea
    const handleStopRegistration = async (predicateId: string) => {
        try {
            const res = await fetch('/api/registration/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ predicateId, state: 'closed' })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                fetchRegistrationState();
            }
        } catch (error) {
            console.error('Eroare:', error);
            alert('Eroare la închiderea înscrierii');
        }
    };

    // Deschide modal-ul pentru adăugare studenți
    const handleOpenAddModal = (predicateId: string) => {
        setSelectedPredicate(predicateId);
        setShowAddModal(true);
        setSearchEmail('');
        setSearchResults([]);
    };

    // Caută studenți
    const handleSearchStudents = async () => {
        if (!selectedPredicate) return;

        try {
            const res = await fetch(`/api/students/search?predicateId=${selectedPredicate}&email=${searchEmail}`);
            const data = await res.json();
            if (data.success) {
                setSearchResults(data.students);
            }
        } catch (error) {
            console.error('Eroare la căutare:', error);
            alert('Eroare la căutare studenți');
        }
    };

    // Adaugă student la categorie
    const handleAddStudent = async (studentId: string) => {
        if (!selectedPredicate) return;

        try {
            const res = await fetch('/api/students/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId,
                    predicateId: selectedPredicate,
                    value: true
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message);
                // Reîncărcăm lista
                handleSearchStudents();
            }
        } catch (error) {
            console.error('Eroare:', error);
            alert('Eroare la adăugare student');
        }
    };

    // const handlePublishRoot = async (predicateId: string) => {
    //     const commitments = enrollments[predicateId];
    //     if (!commitments || commitments.length === 0) return alert("Nu există înscrieri!");

    //     setLoading(true);
    //     try {
    //         const merkleService = new MerkleService();
    //         const tree = await merkleService.createTree(commitments);
    //         const root = tree.getHexRoot();

    //         if (window.ethereum) {
    //             // Forțăm schimbarea pe Sepolia
    //             try {
    //                 await window.ethereum.request({
    //                     method: 'wallet_switchEthereumChain',
    //                     params: [{ chainId: '0xaa36a7' }], // Sepolia chainId
    //                 });
    //             } catch (switchError: any) {
    //                 // Dacă Sepolia nu e adăugată, o adăugăm
    //                 if (switchError.code === 4902) {
    //                     await window.ethereum.request({
    //                         method: 'wallet_addEthereumChain',
    //                         params: [{
    //                             chainId: '0xaa36a7',
    //                             chainName: 'Sepolia',
    //                             rpcUrls: ['https://rpc.sepolia.org'],
    //                             nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    //                             blockExplorerUrls: ['https://sepolia.etherscan.io']
    //                         }]
    //                     });
    //                 }
    //             }

    //             const provider = new ethers.BrowserProvider(window.ethereum);
    //             const signer = await provider.getSigner();
    //             const contract = new ethers.Contract(CONTRACT_ADDRESSES.IdentityRegistry, REGISTRY_ABI, signer);

    //             const tx = await contract.updateMerkleRoot(predicateId, root);
    //             await tx.wait();

    //             // După publicare, salvăm lista finală de hash-uri pentru ca studenții să poată genera dovezi
    //             await fetch('/api/enroll/finalize', {
    //                 method: 'POST',
    //                 headers: { 'Content-Type': 'application/json' },
    //                 body: JSON.stringify({ predicateId, root, commitments })
    //             });

    //             alert(`Rădăcina pentru "${predicates[predicateId as keyof typeof predicates]}" a fost publicată!`);
    //         }
    //     } catch (error) {
    //         console.error(error);
    //         alert("Eroare la publicare.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const handlePublishRoot = async (predicateId: string) => {
        // Verificăm dacă înscrierea este închisă
        if (registrationState[predicateId] === 'open') {
            return alert("Trebuie să închizi mai întâi înscrierea înainte de a publica root-ul!");
        }

        setLoading(true);

        // Citim commitments direct din MongoDB (date proaspete)
        const enrollRes = await fetch('/api/enroll');
        const freshEnrollments = await enrollRes.json();
        const commitments = freshEnrollments[predicateId];

        if (!commitments || commitments.length === 0) {
            setLoading(false);
            return alert("Nu există înscrieri!");
        }
        try {
            const merkleService = new MerkleService();
            
            // 1. Calculăm numărul necesar de frunze pentru un arbore de înălțime 12
            // Circuitul tău MerkleTreeVerifier(12) are nevoie de exact 2^12 frunze
            const TREE_HEIGHT = 12; 
            const totalLeavesRequired = Math.pow(2, TREE_HEIGHT); // 4096
            
            // 2. Padding: Completăm lista cu "0" până la 4096
            // Modul acesta de construcție asigură că root-ul calculat aici coincide cu cel din circuit
            const paddedCommitments = [...commitments];
            while (paddedCommitments.length < totalLeavesRequired) {
                paddedCommitments.push("0");
            }

            // 3. Generăm arborele și obținem Root-ul sub formă de bytes32 (Hex)
            const tree = await merkleService.createTree(paddedCommitments);
            const root = tree.getHexRoot(); 

            // 4. Conectare la MetaMask și switch pe rețeaua Sepolia
            if (!window.ethereum) throw new Error("MetaMask nu este instalat!");
            
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // Sepolia ID
                });
            } catch (switchError: any) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xaa36a7',
                            chainName: 'Sepolia',
                            rpcUrls: ['https://rpc.sepolia.org'],
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            blockExplorerUrls: ['https://sepolia.etherscan.io']
                        }]
                    });
                }
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            
            // 5. Interacțiunea cu Contractul
            // Folosim IdentityRegistry pentru a actualiza root-ul public
            const contract = new ethers.Contract(
                CONTRACT_ADDRESSES.IdentityRegistry, 
                REGISTRY_ABI, 
                signer
            );

            console.log(`Publicăm root-ul pentru predicatul ${predicateId}: ${root}`);
            const tx = await contract.updateMerkleRoot(predicateId, root);
            await tx.wait();

            // 6. Finalizarea în baza de date
            // Salvăm commitments-urile ORIGINALE (fără padding) pentru ca studenții să-și găsească indexul
            await fetch('/api/enroll/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    predicateId, 
                    root, 
                    commitments: commitments // Lista scurtă
                }) 
            });

            alert(`Succes! Rădăcina pentru "${predicates[predicateId as keyof typeof predicates]}" a fost publicată pe Sepolia.`);
            fetchEnrollments(); // Reîmprospătăm datele în UI

        } catch (error: any) {
            console.error("Eroare Admin:", error);
            alert(error.reason || error.message || "Eroare la publicare.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            padding: '0'
        }}>
            {/* Navbar */}
            <nav style={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                padding: '20px 0',
                marginBottom: '40px'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <h1 style={{
                        margin: '0',
                        fontSize: '28px',
                        color: '#1a202c',
                        fontWeight: '800',
                        letterSpacing: '-0.5px'
                    }}>
                        🎓 Panou Administrare Facultate
                    </h1>
                    <p style={{ margin: '5px 0 0 0', color: '#4a5568', fontSize: '14px' }}>
                        Gestionare înscrieri și publicare credențiale blockchain
                    </p>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
                {Object.keys(predicates).map((id) => {
                    const isOpen = registrationState[id] === 'open';
                    const enrollmentCount = enrollments[id]?.length || 0;

                    return (
                        <div
                            key={id}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '32px',
                                marginBottom: '24px',
                                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                                transition: 'all 0.3s ease',
                                border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.15)';
                            }}
                        >
                            {/* Header Section */}
                            <div style={{ marginBottom: '24px', borderBottom: '2px solid #f0f0f0', paddingBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h3 style={{
                                            margin: '0 0 8px 0',
                                            fontSize: '22px',
                                            color: '#2d3748',
                                            fontWeight: '700'
                                        }}>
                                            {predicates[id as keyof typeof predicates]}
                                        </h3>
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#718096',
                                            fontWeight: '500'
                                        }}>
                                            Categorie ID: {id}
                                        </span>
                                    </div>

                                    {/* Status Badge */}
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        padding: '8px 16px',
                                        borderRadius: '20px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        background: isOpen
                                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        color: 'white',
                                        boxShadow: isOpen
                                            ? '0 4px 12px rgba(16, 185, 129, 0.4)'
                                            : '0 4px 12px rgba(239, 68, 68, 0.4)',
                                        animation: isOpen ? 'pulse 2s infinite' : 'none'
                                    }}>
                                        <span style={{ marginRight: '6px' }}>{isOpen ? '🟢' : '🔴'}</span>
                                        {isOpen ? 'Înscriere DESCHISĂ' : 'Înscriere ÎNCHISĂ'}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div style={{
                                background: 'linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%)',
                                borderRadius: '12px',
                                padding: '20px',
                                marginBottom: '24px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '24px'
                                    }}>
                                        👥
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#718096', fontWeight: '500' }}>
                                            Studenți înscriși
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: '700', color: '#2d3748' }}>
                                            {enrollmentCount}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => handleStartRegistration(id)}
                                    disabled={loading || isOpen}
                                    style={{
                                        background: (loading || isOpen)
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: (loading || isOpen) ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: (loading || isOpen) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: (loading || isOpen)
                                            ? 'none'
                                            : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && !isOpen) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading && !isOpen) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                        }
                                    }}
                                >
                                    ✅ Start Înscriere
                                </button>

                                <button
                                    onClick={() => handleStopRegistration(id)}
                                    disabled={loading || !isOpen}
                                    style={{
                                        background: (loading || !isOpen)
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: (loading || !isOpen) ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: (loading || !isOpen) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: (loading || !isOpen)
                                            ? 'none'
                                            : '0 4px 12px rgba(245, 158, 11, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && isOpen) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading && isOpen) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                                        }
                                    }}
                                >
                                    ⏸️ Stop Înscriere
                                </button>

                                <button
                                    onClick={() => handlePublishRoot(id)}
                                    disabled={loading}
                                    style={{
                                        background: loading
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: loading ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: loading
                                            ? 'none'
                                            : '0 4px 12px rgba(102, 126, 234, 0.4)',
                                        gridColumn: 'span 1'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                        }
                                    }}
                                >
                                    🚀 Publică Root pe Blockchain
                                </button>

                                <button
                                    onClick={() => handleOpenAddModal(id)}
                                    disabled={loading}
                                    style={{
                                        background: loading
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: loading ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: loading
                                            ? 'none'
                                            : '0 4px 12px rgba(59, 130, 246, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                        }
                                    }}
                                >
                                    ➕ Adaugă Student
                                </button>
                            </div>

                            {/* Loading Indicator */}
                            {loading && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    color: '#1e40af',
                                    fontSize: '14px',
                                    fontWeight: '600'
                                }}>
                                    ⏳ Se procesează...
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Modal pentru adăugare student */}
            {showAddModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setShowAddModal(false)}
                >
                    <div
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            padding: '32px',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{
                                margin: '0 0 8px 0',
                                fontSize: '24px',
                                color: '#2d3748',
                                fontWeight: '700'
                            }}>
                                Adaugă Student
                            </h2>
                            <p style={{ margin: 0, color: '#718096', fontSize: '14px' }}>
                                Categorie: {selectedPredicate && predicates[selectedPredicate as keyof typeof predicates]}
                            </p>
                        </div>

                        {/* Search Section */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#4a5568'
                            }}>
                                Caută după email
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={searchEmail}
                                    onChange={(e) => setSearchEmail(e.target.value)}
                                    placeholder="email@s.unibuc.ro"
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: '2px solid #e2e8f0',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        transition: 'border-color 0.3s ease'
                                    }}
                                    onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearchStudents();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSearchStudents}
                                    style={{
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: 'white',
                                        padding: '12px 24px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                    }}
                                >
                                    🔍 Caută
                                </button>
                            </div>
                        </div>

                        {/* Results Section */}
                        {searchResults.length > 0 && (
                            <div>
                                <h3 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '16px',
                                    color: '#4a5568',
                                    fontWeight: '600'
                                }}>
                                    Rezultate ({searchResults.length})
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {searchResults.map((student) => (
                                        <div
                                            key={student._id}
                                            style={{
                                                padding: '16px',
                                                background: '#f9fafb',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '12px'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontSize: '15px',
                                                    fontWeight: '600',
                                                    color: '#2d3748',
                                                    marginBottom: '4px'
                                                }}>
                                                    {student.nume}
                                                </div>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#718096'
                                                }}>
                                                    {student.email}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddStudent(student._id)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    padding: '8px 16px',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1.05)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                                                }}
                                            >
                                                ✅ Adaugă
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Empty State */}
                        {searchResults.length === 0 && searchEmail && (
                            <div style={{
                                padding: '32px',
                                textAlign: 'center',
                                color: '#718096',
                                fontSize: '14px'
                            }}>
                                Nu s-au găsit studenți fără permisiune pentru această categorie.
                            </div>
                        )}

                        {/* Close Button */}
                        <div style={{ marginTop: '24px', textAlign: 'right' }}>
                            <button
                                onClick={() => setShowAddModal(false)}
                                style={{
                                    background: '#e2e8f0',
                                    color: '#4a5568',
                                    padding: '12px 24px',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '15px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#cbd5e0';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#e2e8f0';
                                }}
                            >
                                Închide
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add keyframes for pulse animation */}
            <style jsx>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.85;
                    }
                }
            `}</style>
        </div>
    );
}