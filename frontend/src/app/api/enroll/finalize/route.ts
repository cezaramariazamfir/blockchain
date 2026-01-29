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

        const db = readDB();

        // Salvăm lista finalizată cu root-ul publicat
        db.finalized[predicateId] = {
            root,
            commitments,
            finalizedAt: new Date().toISOString()
        };

        // Golim lista de înscrieri pentru această categorie (opțional)
        // db.enrollments[predicateId] = [];

        writeDB(db);

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
