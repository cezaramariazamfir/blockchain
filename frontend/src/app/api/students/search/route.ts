import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Student from '@/models/Student';

// GET - Caută studenți care NU au permisiune pentru un predicat
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        const predicateId = searchParams.get('predicateId');

        if (!predicateId) {
            return NextResponse.json({ error: 'predicateId este obligatoriu' }, { status: 400 });
        }

        await connectToDatabase();

        const predicateIndex = parseInt(predicateId);
        if (predicateIndex < 0 || predicateIndex > 2) {
            return NextResponse.json({ error: 'predicateId invalid (0-2)' }, { status: 400 });
        }

        // Construim query-ul
        const query: any = {};

        // Filtrăm doar studenții care NU au permisiune pentru acest predicat
        query[`permissions.${predicateIndex}`] = false;

        // Dacă există căutare după email, adăugăm filtru
        if (email && email.trim()) {
            query.email = { $regex: email.trim(), $options: 'i' };
        }

        const students = await Student.find(query)
            .select('nume email permissions')
            .limit(20)
            .sort({ nume: 1 });

        return NextResponse.json({
            success: true,
            students: students.map(s => ({
                _id: s._id,
                nume: s.nume,
                email: s.email,
                permissions: s.permissions
            }))
        });

    } catch (error: any) {
        console.error('Eroare la căutare studenți:', error);
        return NextResponse.json({
            error: 'Eroare server',
            details: error.message
        }, { status: 500 });
    }
}
