import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

function readDB() {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
}

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

        const db = readDB();

        // Verificăm dacă există o listă finalizată (publicată pe blockchain)
        if (db.finalized[predicateId]) {
            return NextResponse.json({
                commitments: db.finalized[predicateId].commitments,
                root: db.finalized[predicateId].root,
                finalized: true
            });
        }

        // Altfel returnăm lista curentă (nefinalizată)
        const commitments = db.enrollments[predicateId] || [];
        return NextResponse.json({
            commitments,
            finalized: false
        });

    } catch (error) {
        console.error('Eroare la citirea listei:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
