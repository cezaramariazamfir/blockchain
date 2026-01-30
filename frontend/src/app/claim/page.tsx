
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MerkleService } from '@/lib/merkle';
import { CONTRACT_ADDRESSES, CREDENTIALS_ABI } from '@/lib/constants';
import predicates from '@/lib/predicates.json';

export default function StudentPage() {
    const [email, setEmail] = useState("");
    const [authData, setAuthData] = useState<any>(null);
    const [secret, setSecret] = useState("");
    const [loading, setLoading] = useState(false);
    const [snarkjs, setSnarkjs] = useState<any>(null);
    const [claimedDiplomas, setClaimedDiplomas] = useState<Set<string>>(new Set());
    const [enrolledCategories, setEnrolledCategories] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (typeof window !== "undefined") {
            setSnarkjs((window as any).snarkjs);
        }
    }, []);

    useEffect(() => {
        // Încărcăm diploma claim-uite din localStorage
        if (email) {
            const claimed = localStorage.getItem(`claimed_${email}`);
            if (claimed) {
                setClaimedDiplomas(new Set(JSON.parse(claimed)));
            }
            const enrolled = localStorage.getItem(`enrolled_${email}`);
            if (enrolled) {
                setEnrolledCategories(new Set(JSON.parse(enrolled)));
            }
        }
    }, [email]);

    const handleLogin = async () => {
        const res = await fetch(`/api/auth?email=${email}`);
        const data = await res.json();

        if (data.error) return alert("Email negăsit în baza de date!");

        setAuthData(data);

        let storedSecret = localStorage.getItem(`secret_${email}`);
        if (!storedSecret) {
            storedSecret = ethers.toBigInt(ethers.randomBytes(31)).toString();
            localStorage.setItem(`secret_${email}`, storedSecret);
        }
        setSecret(storedSecret);
    };

    const handleEnroll = async (predicateId: string) => {
        setLoading(true);
        try {
            const merkleService = new MerkleService();
            await merkleService.init();
            const commitment = merkleService.computeCommitment(secret);

            const res = await fetch('/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, commitment, predicateId })
            });

            const data = await res.json();

            if (res.status === 403) {
                // Înscrierea este închisă
                alert("⚠️ Înscrierea este închisă pentru această categorie! Contactează administratorul.");
                setLoading(false);
                return;
            }

            if (res.status === 409) {
                // Deja înscris
                alert("Ești deja înscris pentru această categorie!");
                setLoading(false);
                return;
            }

            if (res.ok) {
                alert("Te-ai înscris cu succes!");
                const newEnrolled = new Set(enrolledCategories);
                newEnrolled.add(predicateId);
                setEnrolledCategories(newEnrolled);
                localStorage.setItem(`enrolled_${email}`, JSON.stringify(Array.from(newEnrolled)));
            } else {
                alert(data.error || "Eroare la înscriere");
            }
        } catch (error) {
            console.error(error);
            alert("Eroare de rețea la înscriere");
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (predicateId: string) => {
        // Verificăm dacă a mai claim-uit deja
        if (claimedDiplomas.has(predicateId)) {
            alert("Ai deja această diplomă! Nu poți revendica de două ori aceeași diploma!");
            return;
        }

        if (!snarkjs) return alert("Eroare: snarkjs nu este încărcat!");

        setLoading(true);
        try {
            const res = await fetch(`/api/enroll/list?predicateId=${predicateId}`);
            const { commitments, root: finalizedRoot, finalized } = await res.json();

            const merkleService = new MerkleService();
            await merkleService.init();

            const TREE_HEIGHT = 12;
            const totalLeavesRequired = Math.pow(2, TREE_HEIGHT);
            const paddedCommitments = [...commitments];
            while (paddedCommitments.length < totalLeavesRequired) {
                paddedCommitments.push("0");
            }

            const tree = await merkleService.createTree(paddedCommitments);

            const root = finalized && finalizedRoot
                ? BigInt(finalizedRoot).toString()
                : BigInt(tree.getHexRoot()).toString();

            const myCommitment = merkleService.computeCommitment(secret);
            const myIndex = paddedCommitments.indexOf(myCommitment);

            if (myIndex === -1) throw new Error("Nu ești înscris în această listă!");

            const proofData = await merkleService.getProofData(tree, myIndex);

            const input = {
                secret: secret.toString(),
                pathElements: proofData.pathElements,
                pathIndices: proofData.pathIndices,
                merkleRoot: root,
                predicateId: predicateId.toString()
            };

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                "/zk/merkle_membership.wasm",
                "/zk/merkle_membership_final.zkey"
            );

            const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
            const jsonProof = JSON.parse(`[${calldata}]`);

            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESSES.AcademicCredentials, CREDENTIALS_ABI, signer);

            const tx = await contract.claimCredential(predicateId, jsonProof[0], jsonProof[1], jsonProof[2], jsonProof[3]);
            await tx.wait();

            // Salvăm în localStorage că a claim-uit
            const newClaimed = new Set(claimedDiplomas);
            newClaimed.add(predicateId);
            setClaimedDiplomas(newClaimed);
            localStorage.setItem(`claimed_${email}`, JSON.stringify(Array.from(newClaimed)));

            alert("Diplomă obținută cu succes!");
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes("Nu ești înscris")) {
                alert("Nu ești înscris sau adminul nu a publicat root-ul pe blockchain!");
            } else {
                alert("Eroare la claim! Verifică dacă adminul a publicat rădăcina.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!authData) {
        return (
            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '48px',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                    maxWidth: '500px',
                    width: '100%'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎓</div>
                        <h2 style={{
                            margin: '0 0 8px 0',
                            fontSize: '28px',
                            color: '#1a202c',
                            fontWeight: '700'
                        }}>
                            Portal Student
                        </h2>
                        <p style={{ margin: '0', color: '#718096', fontSize: '14px' }}>
                            Autentifică-te pentru a accesa credențialele
                        </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#4a5568'
                        }}>
                            Email Universitar
                        </label>
                        <input
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                            placeholder="nume.prenume@s.unibuc.ro"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                border: '2px solid #e2e8f0',
                                borderRadius: '10px',
                                fontSize: '15px',
                                color: '#2d3748',
                                outline: 'none',
                                transition: 'all 0.3s ease',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <button
                        onClick={handleLogin}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '14px',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
                        }}
                    >
                        Autentificare
                    </button>
                </div>
            </div>
        );
    }

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
                        Salut, {authData.nume}!
                    </h1>
                    <p style={{ margin: '5px 0 0 0', color: '#4a5568', fontSize: '14px' }}>
                        Secretul tău este salvat securizat în browser
                    </p>
                </div>
            </nav>

            {/* Main Content */}
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 40px' }}>
                {authData.permissions.map((canJoin: boolean, id: number) => {
                    if (!canJoin) return null;

                    const predicateName = predicates[id.toString() as keyof typeof predicates];
                    const isClaimed = claimedDiplomas.has(id.toString());

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
                            {/* Header */}
                            <div style={{ marginBottom: '24px', borderBottom: '2px solid #f0f0f0', paddingBottom: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h3 style={{
                                            margin: '0 0 8px 0',
                                            fontSize: '22px',
                                            color: '#2d3748',
                                            fontWeight: '700'
                                        }}>
                                            {predicateName}
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
                                    {isClaimed && (
                                        <div style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            padding: '8px 16px',
                                            borderRadius: '20px',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                                        }}>
                                            
                                            Diplomă Obținută
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => handleEnroll(id.toString())}
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
                                    Înscrie-te
                                </button>

                                <button
                                    onClick={() => handleClaim(id.toString())}
                                    disabled={loading || isClaimed}
                                    style={{
                                        background: (loading || isClaimed)
                                            ? '#e2e8f0'
                                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: (loading || isClaimed) ? '#94a3b8' : 'white',
                                        padding: '14px 24px',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        cursor: (loading || isClaimed) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.3s ease',
                                        boxShadow: (loading || isClaimed)
                                            ? 'none'
                                            : '0 4px 12px rgba(16, 185, 129, 0.3)'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!loading && !isClaimed) {
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!loading && !isClaimed) {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                                        }
                                    }}
                                >
                                    Claim Diplomă
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
        </div>
    );
}