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
    const [loading, setLoading] = useState(false);

    // Încărcăm commitment-urile primite de la studenți din baza de date (API)
    const fetchEnrollments = async () => {
        const res = await fetch('/api/enroll');
        const data = await res.json();
        setEnrollments(data);
    };

    useEffect(() => { fetchEnrollments(); }, []);

    const handlePublishRoot = async (predicateId: string) => {
        const commitments = enrollments[predicateId];
        if (!commitments || commitments.length === 0) return alert("Nu există înscrieri!");

        setLoading(true);
        try {
            const merkleService = new MerkleService();
            const tree = await merkleService.createTree(commitments);
            const root = tree.getHexRoot();

            if (window.ethereum) {
                const provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const contract = new ethers.Contract(CONTRACT_ADDRESSES.IdentityRegistry, REGISTRY_ABI, signer);

                const tx = await contract.setMerkleRoot(predicateId, root);
                await tx.wait();

                // După publicare, salvăm lista finală de hash-uri pentru ca studenții să poată genera dovezi
                await fetch('/api/enroll/finalize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ predicateId, root, commitments })
                });

                alert(`Rădăcina pentru "${predicates[predicateId as keyof typeof predicates]}" a fost publicată!`);
            }
        } catch (error) {
            console.error(error);
            alert("Eroare la publicare.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '40px' }}>
            <h1>Panou Administrare Facultate</h1>
            {Object.keys(predicates).map((id) => (
                <div key={id} style={{ border: '1px solid #ccc', padding: '20px', margin: '10px 0' }}>
                    <h3>{predicates[id as keyof typeof predicates]} (ID: {id})</h3>
                    <p>Studenți înscriși (commitment-uri): {enrollments[id]?.length || 0}</p>
                    <button 
                        onClick={() => handlePublishRoot(id)}
                        disabled={loading}
                        style={{ backgroundColor: '#0070f3', color: 'white', padding: '10px' }}
                    >
                        Finalizează și Publică pe Blockchain
                    </button>
                </div>
            ))}
        </div>
    );
}