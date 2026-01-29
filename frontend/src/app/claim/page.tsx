
'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { MerkleService } from '@/lib/merkle';
import { CONTRACT_ADDRESSES, CREDENTIALS_ABI } from '@/lib/constants';
import predicates from '@/lib/predicates.json';

export default function StudentPage() {
    // 1. TOATE stările trebuie să fie aici, la început
    const [email, setEmail] = useState("");
    const [authData, setAuthData] = useState<any>(null);
    const [secret, setSecret] = useState("");
    const [loading, setLoading] = useState(false);
    const [snarkjs, setSnarkjs] = useState<any>(null); // Mutat aici de jos

    useEffect(() => {
        // Încărcăm snarkjs doar pe client (browser)
        if (typeof window !== "undefined") {
            setSnarkjs((window as any).snarkjs);
        }
    }, []);

    // 1. Verificăm drepturile studentului în CSV
    const handleLogin = async () => {
        // AM ȘTERS: const [snarkjs, setSnarkjs] = useState<any>(null); // NU se pune aici!
        
        const res = await fetch(`/api/auth?email=${email}`);
        const data = await res.json();
        
        if (data.error) return alert("Email negăsit în baza de date!");
        
        setAuthData(data);

        // Generăm sau recuperăm secretul unic din browser
        let storedSecret = localStorage.getItem(`secret_${email}`);
        if (!storedSecret) {
            storedSecret = ethers.toBigInt(ethers.randomBytes(31)).toString();
            localStorage.setItem(`secret_${email}`, storedSecret);
        }
        setSecret(storedSecret);
    };

    // 2. Trimitem commitment-ul (anonim)
    const handleEnroll = async (predicateId: string) => {
        setLoading(true);
        const merkleService = new MerkleService();
        const commitment = merkleService.hashFn([secret]); 

        const res = await fetch('/api/enroll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, commitment, predicateId })
        });

        if (res.ok) alert("Te-ai înscris cu succes!");
        setLoading(false);
    };

    // 3. Generăm dovada ZK și dăm Claim
    const handleClaim = async (predicateId: string) => {
        if (!snarkjs) return alert("Eroare: snarkjs nu este încărcat!");
        
        setLoading(true);
        try {
            const res = await fetch(`/api/enroll/list?predicateId=${predicateId}`);
            const { commitments } = await res.json();
            
            const merkleService = new MerkleService();
            const tree = await merkleService.createTree(commitments);
            const myIndex = commitments.indexOf(merkleService.hashFn([secret]));

            if (myIndex === -1) throw new Error("Nu ești înscris în această listă!");

            const proofData = await merkleService.getProofData(tree, myIndex);
            const input = { secret, pathElements: proofData.pathElements, pathIndices: proofData.pathIndices };

            // Folosim variabila snarkjs din state
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
            alert("Diplomă obținută!");
        } catch (e) { 
            console.error(e); 
            alert("Eroare la claim! Verifică dacă adminul a publicat rădăcina."); 
        } finally { 
            setLoading(false); 
        }
    };

    // Randarea interfeței rămâne la fel...
    if (!authData) {
        return (
            <div style={{ padding: '40px' }}>
                <h2>Login Student</h2>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email unibuc..." style={{ color: 'black', padding: '5px' }} />
                <button onClick={handleLogin} style={{ marginLeft: '10px' }}>Intră</button>
            </div>
        );
    }

    return (
        <div style={{ padding: '40px' }}>
            <h2>Salut, {authData.nume}!</h2>
            <p>Secretul tău este salvat securizat în browser.</p>
            {authData.permissions.map((canJoin: boolean, id: number) => canJoin && (
                <div key={id} style={{ marginBottom: '10px', border: '1px solid #eee', padding: '10px' }}>
                    <span>{predicates[id.toString() as keyof typeof predicates]}</span>
                    <button onClick={() => handleEnroll(id.toString())} disabled={loading} style={{ marginLeft: '10px' }}>Înscrie-te</button>
                    <button onClick={() => handleClaim(id.toString())} disabled={loading} style={{ marginLeft: '10px' }}>Claim Diplomă</button>
                </div>
            ))}
        </div>
    );
}