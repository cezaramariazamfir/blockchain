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

// GET - Returnează toate înscrierile (pentru admin)
export async function GET() {
    try {
        const db = readDB();
        return NextResponse.json(db.enrollments);
    } catch (error) {
        console.error('Eroare la citirea bazei de date:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}

// POST - Studentul trimite commitment-ul său
export async function POST(request: Request) {
    try {
        const { email, commitment, predicateId } = await request.json();

        if (!commitment || predicateId === undefined) {
            return NextResponse.json(
                { error: 'Lipsesc date: commitment sau predicateId' },
                { status: 400 }
            );
        }

        const db = readDB();

        // Verificăm dacă înscrierea este deschisă
        const registrationState = db.registrationState?.[predicateId] || 'closed';
        if (registrationState !== 'open') {
            return NextResponse.json(
                { error: 'Înscrierea este închisă pentru această categorie!' },
                { status: 403 }
            );
        }

        // Inițializăm array-ul dacă nu există
        if (!db.enrollments[predicateId]) {
            db.enrollments[predicateId] = [];
        }

        // Verificăm dacă commitment-ul există deja (pentru a evita duplicatele)
        if (db.enrollments[predicateId].includes(commitment)) {
            return NextResponse.json(
                { error: 'Ești deja înscris pentru această categorie!' },
                { status: 409 }
            );
        }

        // Adăugăm commitment-ul la listă
        db.enrollments[predicateId].push(commitment);
        writeDB(db);

        console.log(`Nou commitment pentru predicat ${predicateId}: ${commitment.substring(0, 20)}...`);

        return NextResponse.json({
            success: true,
            message: 'Înscrierea a fost înregistrată cu succes!'
        });

    } catch (error) {
        console.error('Eroare la înscriere:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
