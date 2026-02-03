import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import Student from '@/models/Student';

export async function POST(request: Request) {
    try {
        const { email, password, nume } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email-ul și parola sunt obligatorii' },
                { status: 400 }
            );
        }

        // Verificăm că email-ul este de la Unibuc
        if (!email.endsWith('@s.unibuc.ro')) {
            return NextResponse.json({
                error: 'Doar email-urile @s.unibuc.ro sunt permise!'
            }, { status: 403 });
        }

        // Validare parolă (minim 6 caractere)
        if (password.length < 6) {
            return NextResponse.json({
                error: 'Parola trebuie să aibă minim 6 caractere'
            }, { status: 400 });
        }

        await connectToDatabase();

        // Verificăm dacă email-ul există deja
        const existingStudent = await Student.findOne({ email: email.toLowerCase() });
        if (existingStudent) {
            return NextResponse.json({
                error: 'Acest email este deja înregistrat! Folosește funcția de Login.'
            }, { status: 409 });
        }

        // Hash-uim parola
        const hashedPassword = await bcrypt.hash(password, 10);

        // Extragem numele din email dacă nu e furnizat
        let studentName = nume;
        if (!studentName) {
            const namePart = email.split('@')[0];
            const nameParts = namePart.split('.');
            studentName = nameParts
                .map((part: string) => {
                    // Tratăm cazurile cu "-" în nume (ex: cezara-maria → Cezara Maria)
                    return part.split('-')
                        .map((subPart: string) => subPart.charAt(0).toUpperCase() + subPart.slice(1))
                        .join(' ');
                })
                .join(' ');
        }

        // Creăm studentul
        const student = await Student.create({
            nume: studentName,
            email: email.toLowerCase(),
            password: hashedPassword,
            permissions: [false, false, false]
        });

        console.log(`Student nou înregistrat: ${student.nume} (${student.email})`);

        return NextResponse.json({
            success: true,
            message: 'Cont creat cu succes!',
            student: {
                nume: student.nume,
                email: student.email,
                permissions: student.permissions
            }
        });

    } catch (error: any) {
        console.error('Eroare la signup:', error);
        return NextResponse.json({
            error: 'Eroare la crearea contului',
            details: error.message
        }, { status: 500 });
    }
}
