import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import FinalizedList from '@/models/FinalizedList';

// GET - Returnează lista de commitments pentru un predicat specific
// Folosit de student pentru a genera dovada ZK
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const predicateId = searchParams.get('predicateId');

        if (!predicateId) {
            return NextResponse.json(
                { error: 'Lipsește predicateId' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Verificăm dacă există o listă finalizată (publicată pe blockchain)
        const finalized = await FinalizedList.findOne({ predicateId });

        if (finalized) {
            return NextResponse.json({
                commitments: finalized.commitments,
                root: finalized.root,
                finalized: true
            });
        }

        // Altfel returnăm lista curentă (nefinalizată)
        const enrollments = await Enrollment.find({ predicateId });
        const commitments = enrollments.map(e => e.commitment);

        return NextResponse.json({
            commitments,
            finalized: false
        });

    } catch (error) {
        console.error('Eroare la citirea listei:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
