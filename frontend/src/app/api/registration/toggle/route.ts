import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import RegistrationState from '@/models/RegistrationState';

// POST - Adminul deschide/închide înscrierea pentru un predicat
export async function POST(request: Request) {
    try {
        const { predicateId, state } = await request.json();

        if (!predicateId || !state) {
            return NextResponse.json(
                { error: 'Lipsesc date: predicateId sau state' },
                { status: 400 }
            );
        }

        if (state !== 'open' && state !== 'closed') {
            return NextResponse.json(
                { error: 'State invalid. Foloseste "open" sau "closed"' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Upsert - creează sau actualizează
        await RegistrationState.findOneAndUpdate(
            { predicateId: String(predicateId) },
            { state },
            { upsert: true, new: true }
        );

        console.log(`Registration pentru predicatul ${predicateId} este acum: ${state}`);

        return NextResponse.json({
            success: true,
            predicateId,
            state,
            message: `Inscrierea a fost ${state === 'open' ? 'deschisa' : 'inchisa'}`
        });

    } catch (error) {
        console.error('Eroare la schimbarea stării înscrierii:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}

// GET - Obține starea curentă a înscrierii pentru un predicat
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const predicateId = searchParams.get('predicateId');

        await connectToDatabase();

        if (predicateId) {
            const regState = await RegistrationState.findOne({ predicateId });
            const state = regState?.state || 'closed';
            return NextResponse.json({ predicateId, state });
        }

        // Returnează toate stările
        const allStates = await RegistrationState.find({});
        const registrationState: Record<string, string> = {};

        for (const s of allStates) {
            registrationState[s.predicateId] = s.state;
        }

        return NextResponse.json({ registrationState });

    } catch (error) {
        console.error('Eroare la citirea stării înscrierii:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
