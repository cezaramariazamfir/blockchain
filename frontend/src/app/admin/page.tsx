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
    const [loading, setLoading] = useState<Record<string, boolean>>({}); // Loading specific pentru fiecare predicat
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
            alert('Eroare la deschiderea inscrierii');
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
            alert('Eroare la inchiderea inscrierii');
        }
    };

    // Deschide secțiunea pentru adăugare studenți
    const handleOpenAddModal = (predicateId: string) => {
        // Dacă deja este deschis pentru acest predicat, închidem
        if (selectedPredicate === predicateId) {
            setSelectedPredicate(null);
            setSearchEmail('');
            setSearchResults([]);
        } else {
            setSelectedPredicate(predicateId);
            setSearchEmail('');
            setSearchResults([]);
            // Facem căutarea inițială pentru a afișa toți studenții disponibili
            fetchStudentsForPredicate(predicateId, '');
        }
    };

    // Caută studenți în timp real
    const fetchStudentsForPredicate = async (predicateId: string, email: string) => {
        try {
            const res = await fetch(`/api/students/search?predicateId=${predicateId}&email=${email}`);
            const data = await res.json();
            if (data.success) {
                setSearchResults(data.students);
            }
        } catch (error) {
            console.error('Eroare la căutare:', error);
        }
    };

    // Handler pentru schimbarea textului de căutare
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const email = e.target.value;
        setSearchEmail(email);
        if (selectedPredicate) {
            fetchStudentsForPredicate(selectedPredicate, email);
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
                fetchStudentsForPredicate(selectedPredicate, searchEmail);
            }
        } catch (error) {
            console.error('Eroare:', error);
            alert('Eroare la adaugare student');
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
            return alert("Trebuie sa inchizi mai intai inscrierea inainte de a publica root-ul!");
        }

        setLoading(prev => ({ ...prev, [predicateId]: true }));

        // Citim commitments direct din MongoDB (date proaspete)
        const enrollRes = await fetch('/api/enroll');
        const freshEnrollments = await enrollRes.json();
        const commitments = freshEnrollments[predicateId];

        if (!commitments || commitments.length === 0) {
            setLoading(prev => ({ ...prev, [predicateId]: false }));
            return alert("Nu exista inscrieri!");
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

            alert(`Succes! Radacina pentru "${predicates[predicateId as keyof typeof predicates]}" a fost publicata pe Sepolia.`);
            fetchEnrollments(); // Reîmprospătăm datele în UI

        } catch (error: any) {
            console.error("Eroare Admin:", error);
            alert(error.reason || error.message || "Eroare la publicare.");
        } finally {
            setLoading(prev => ({ ...prev, [predicateId]: false }));
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
                        Panou Administrare Facultate
                    </h1>
                    <p style={{ margin: '5px 0 0 0', color: '#4a5568', fontSize: '14px' }}>
                        Gestionare inscrieri si publicare credentiale blockchain
                    </p>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
                {Object.keys(predicates).map((id) => {
                    const isOpen = registrationState[id] === 'open';
                    const enrollmentCount = enrollments[id]?.length || 0;
                    const isLoading = loading[id] || false;

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
                                        {isOpen ? 'Inscriere DESCHISA' : 'Inscriere INCHISA'}
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
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#718096', fontWeight: '500' }}>
                                            Studenti inscrisi
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
                                    disabled={isLoading || isOpen}
                                    style={{
                                        background: (isLoading || isOpen)
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: (isLoading || isOpen) ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: (isLoading || isOpen) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: (isLoading || isOpen)
                                            ? 'none'
                                            : '0 4px 12px rgba(16, 185, 129, 0.3)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading && !isOpen) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading && !isOpen) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                        }
                                    }}
                                >
                                    Start Inscriere
                                </button>

                                <button
                                    onClick={() => handleStopRegistration(id)}
                                    disabled={isLoading || !isOpen}
                                    style={{
                                        background: (isLoading || !isOpen)
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: (isLoading || !isOpen) ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: (isLoading || !isOpen) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: (isLoading || !isOpen)
                                            ? 'none'
                                            : '0 4px 12px rgba(245, 158, 11, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading && isOpen) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 158, 11, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading && isOpen) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                                        }
                                    }}
                                >
                                    Stop Inscriere
                                </button>

                                <button
                                    onClick={() => handlePublishRoot(id)}
                                    disabled={isLoading}
                                    style={{
                                        background: isLoading
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: isLoading ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: isLoading
                                            ? 'none'
                                            : '0 4px 12px rgba(102, 126, 234, 0.4)',
                                        gridColumn: 'span 1'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                                        }
                                    }}
                                >
                                    Publica Root pe Blockchain
                                </button>

                                <button
                                    onClick={() => handleOpenAddModal(id)}
                                    disabled={isLoading}
                                    style={{
                                        background: isLoading
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: isLoading ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: isLoading
                                            ? 'none'
                                            : '0 4px 12px rgba(59, 130, 246, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isLoading) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                                        }
                                    }}
                                >
                                    Adauga Student
                                </button>
                            </div>

                            {/* Loading Indicator */}
                            {isLoading && (
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
                                    Se proceseaza...
                                </div>
                            )}

                            {/* Secțiune adăugare studenți - apare inline */}
                            {selectedPredicate === id && (
                                <div style={{
                                    marginTop: '20px',
                                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                                    borderRadius: '12px',
                                    padding: '20px',
                                    border: '2px solid #3b82f6'
                                }}>
                                    <h4 style={{
                                        margin: '0 0 16px 0',
                                        fontSize: '16px',
                                        color: '#1e40af',
                                        fontWeight: '700'
                                    }}>
                                        Adauga studenti la aceasta categorie
                                    </h4>

                                    {/* Input de căutare */}
                                    <input
                                        type="text"
                                        value={searchEmail}
                                        onChange={handleSearchChange}
                                        placeholder="Cauta dupa email..."
                                        style={{
                                            width: '100%',
                                            padding: '12px 16px',
                                            border: '2px solid #3b82f6',
                                            borderRadius: '8px',
                                            fontSize: '15px',
                                            marginBottom: '16px',
                                            transition: 'all 0.3s ease',
                                            boxSizing: 'border-box'
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = '#2563eb';
                                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = '#3b82f6';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />

                                    {/* Lista scrollabilă de studenți */}
                                    <div style={{
                                        maxHeight: '300px',
                                        overflowY: 'auto',
                                        background: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb'
                                    }}>
                                        {searchResults.length > 0 ? (
                                            <div style={{ padding: '8px' }}>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#6b7280',
                                                    fontWeight: '600',
                                                    marginBottom: '8px',
                                                    padding: '0 8px'
                                                }}>
                                                    {searchResults.length} student{searchResults.length !== 1 ? 'i' : ''} gasit{searchResults.length !== 1 ? 'i' : ''}
                                                </div>
                                                {searchResults.map((student) => (
                                                    <div
                                                        key={student._id}
                                                        style={{
                                                            padding: '12px',
                                                            background: '#f9fafb',
                                                            border: '1px solid #e5e7eb',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            gap: '12px',
                                                            marginBottom: '6px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#f3f4f6';
                                                            e.currentTarget.style.borderColor = '#d1d5db';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#f9fafb';
                                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                                        }}
                                                    >
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontSize: '14px',
                                                                fontWeight: '600',
                                                                color: '#2d3748',
                                                                marginBottom: '2px',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {student.nume}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '12px',
                                                                color: '#718096',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {student.email}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleAddStudent(student._id)}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                color: 'white',
                                                                padding: '6px 14px',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                fontSize: '13px',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1.05)';
                                                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'scale(1)';
                                                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
                                                            }}
                                                        >
                                                            Adauga
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div style={{
                                                padding: '32px 20px',
                                                textAlign: 'center',
                                                color: '#9ca3af',
                                                fontSize: '14px'
                                            }}>
                                                {searchEmail
                                                    ? 'Nu s-au gasit studenti pentru aceasta cautare.'
                                                    : 'Toti studentii au deja permisiune pentru aceasta categorie.'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Buton închide */}
                                    <button
                                        onClick={() => {
                                            setSelectedPredicate(null);
                                            setSearchEmail('');
                                            setSearchResults([]);
                                        }}
                                        style={{
                                            marginTop: '12px',
                                            width: '100%',
                                            background: '#e5e7eb',
                                            color: '#4b5563',
                                            padding: '10px',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#d1d5db';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#e5e7eb';
                                        }}
                                    >
                                        Inchide
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

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