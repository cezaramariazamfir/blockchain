import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

function writeDB(data: any) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

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
                { error: 'State invalid. Folosește "open" sau "closed"' },
                { status: 400 }
            );
        }

        const db = readDB();

        // Inițializează registrationState dacă nu există
        if (!db.registrationState) {
            db.registrationState = {};
        }

        // Setează starea
        db.registrationState[predicateId] = state;

        writeDB(db);

        console.log(`Registration pentru predicatul ${predicateId} este acum: ${state}`);

        return NextResponse.json({
            success: true,
            predicateId,
            state,
            message: `Înscrierea a fost ${state === 'open' ? 'deschisă' : 'închisă'}`
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

        const db = readDB();

        if (predicateId) {
            const state = db.registrationState?.[predicateId] || 'closed';
            return NextResponse.json({ predicateId, state });
        }

        // Returnează toate stările
        return NextResponse.json({
            registrationState: db.registrationState || {}
        });

    } catch (error) {
        console.error('Eroare la citirea stării înscrierii:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
