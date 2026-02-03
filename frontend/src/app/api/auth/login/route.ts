import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import Student from '@/models/Student';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email-ul și parola sunt obligatorii' },
                { status: 400 }
            );
        }

        await connectToDatabase();

        // Căutăm studentul după email
        const student = await Student.findOne({ email: email.toLowerCase() });

        if (!student) {
            return NextResponse.json({
                error: 'Email sau parolă incorectă!'
            }, { status: 401 });
        }

        // Verificăm parola
        const isPasswordValid = await bcrypt.compare(password, student.password);

        if (!isPasswordValid) {
            return NextResponse.json({
                error: 'Email sau parolă incorectă!'
            }, { status: 401 });
        }

        console.log(`Login reușit: ${student.nume} (${student.email})`);

        return NextResponse.json({
            success: true,
            message: 'Autentificare reușită!',
            student: {
                nume: student.nume,
                email: student.email,
                permissions: student.permissions
            }
        });

    } catch (error: any) {
        console.error('Eroare la login:', error);
        return NextResponse.json({
            error: 'Eroare la autentificare',
            details: error.message
        }, { status: 500 });
    }
}
