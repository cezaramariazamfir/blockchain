import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Student from '@/models/Student';

// POST - Actualizează permisiunile unui student
export async function POST(request: Request) {
    try {
        const { studentId, predicateId, value } = await request.json();

        if (!studentId || predicateId === undefined || value === undefined) {
            return NextResponse.json({
                error: 'studentId, predicateId și value sunt obligatorii'
            }, { status: 400 });
        }

        const predicateIndex = parseInt(predicateId);
        if (predicateIndex < 0 || predicateIndex > 2) {
            return NextResponse.json({ error: 'predicateId invalid (0-2)' }, { status: 400 });
        }

        await connectToDatabase();

        // Găsim studentul
        const student = await Student.findById(studentId);
        if (!student) {
            return NextResponse.json({ error: 'Student negăsit' }, { status: 404 });
        }

        // Actualizăm permisiunea
        student.permissions[predicateIndex] = value;
        await student.save();

        console.log(`Permisiune actualizată pentru ${student.email}: permissions[${predicateIndex}] = ${value}`);

        return NextResponse.json({
            success: true,
            message: `Permisiune ${value ? 'adăugată' : 'revocată'} cu succes!`,
            student: {
                _id: student._id,
                nume: student.nume,
                email: student.email,
                permissions: student.permissions
            }
        });

    } catch (error: any) {
        console.error('Eroare la actualizare permisiuni:', error);
        return NextResponse.json({
            error: 'Eroare server',
            details: error.message
        }, { status: 500 });
    }
}
