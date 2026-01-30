import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FinalizedList from '@/models/FinalizedList';

// POST - Adminul finalizează lista după publicarea Merkle root pe blockchain
// Salvează snapshot-ul listei pentru ca studenții să poată genera dovezi
export async function POST(request: Request) {
    try {
        const { predicateId, root, commitments } = await request.json();

        if (!predicateId || !root || !commitments) {
            return NextResponse.json(
                { error: 'Lipsesc date: predicateId, root sau commitments' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Upsert - creează sau actualizează lista finalizată
        await FinalizedList.findOneAndUpdate(
            { predicateId: String(predicateId) },
            {
                root,
                commitments,
                finalizedAt: new Date()
            },
            { upsert: true, new: true }
        );

        console.log(`Lista pentru predicat ${predicateId} a fost finalizată cu root: ${root}`);

        return NextResponse.json({
            success: true,
            message: 'Lista a fost finalizată și salvată!',
            root,
            totalCommitments: commitments.length
        });

    } catch (error) {
        console.error('Eroare la finalizare:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
