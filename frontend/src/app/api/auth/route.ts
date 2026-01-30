import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Student from '@/models/Student';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!email) {
        return NextResponse.json({ error: "Email-ul este obligatoriu" }, { status: 400 });
    }

    try {
        await connectToDatabase();

        const student = await Student.findOne({ email });

        if (!student) {
            console.log(`Studentul cu email-ul ${email} NU a fost găsit în MongoDB.`);
            return NextResponse.json({ error: "Email negăsit în baza de date!" }, { status: 404 });
        }

        return NextResponse.json({
            nume: student.nume,
            permissions: student.permissions
        });

    } catch (error: any) {
        console.error('Eroare la autentificare:', error);
        return NextResponse.json({
            error: "Eroare la conectarea la baza de date",
            details: error.message
        }, { status: 500 });
    }
}