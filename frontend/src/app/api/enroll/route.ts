import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Enrollment from '@/models/Enrollment';
import RegistrationState from '@/models/RegistrationState';

// GET - Returnează toate înscrierile (pentru admin)
export async function GET() {
    try {
        await connectToDatabase();

        const enrollments = await Enrollment.find({});

        // Grupăm pe predicateId pentru compatibilitate cu frontend-ul existent
        const grouped: Record<string, string[]> = {};
        for (const e of enrollments) {
            if (!grouped[e.predicateId]) {
                grouped[e.predicateId] = [];
            }
            grouped[e.predicateId].push(e.commitment);
        }

        return NextResponse.json(grouped);

    } catch (error) {
        console.error('Eroare la citirea bazei de date:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}

// POST - Studentul trimite commitment-ul său
export async function POST(request: Request) {
    try {
        const { commitment, predicateId } = await request.json();

        if (!commitment || predicateId === undefined) {
            return NextResponse.json(
                { error: 'Lipsesc date: commitment sau predicateId' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Verificăm dacă înscrierea este deschisă
        const regState = await RegistrationState.findOne({ predicateId: String(predicateId) });
        if (!regState || regState.state !== 'open') {
            return NextResponse.json(
                { error: 'Inscrierea este inchisa pentru aceasta categorie!' },
                { status: 403 }
            );
        }

        // Verificăm dacă commitment-ul există deja
        const existing = await Enrollment.findOne({
            predicateId: String(predicateId),
            commitment
        });

        if (existing) {
            return NextResponse.json(
                { error: 'Esti deja inscris pentru aceasta categorie!' },
                { status: 409 }
            );
        }

        // Adăugăm commitment-ul
        await Enrollment.create({
            predicateId: String(predicateId),
            commitment
        });

        console.log(`Nou commitment pentru predicat ${predicateId}: ${commitment.substring(0, 20)}...`);

        return NextResponse.json({
            success: true,
            message: 'Inscrierea a fost inregistrata cu succes!'
        });

    } catch (error) {
        console.error('Eroare la înscriere:', error);
        return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
    }
}
