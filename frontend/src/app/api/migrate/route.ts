// API route pentru migrare CSV -> MongoDB
// Accesează: GET /api/migrate pentru a rula migrarea

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import Student from '@/models/Student';

export async function GET() {
    try {
        await connectToDatabase();

        // Citește CSV
        const csvPath = path.join(process.cwd(), 'data', 'studenti.csv');

        if (!fs.existsSync(csvPath)) {
            return NextResponse.json({ error: 'Fișierul CSV nu există' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        // Sari peste header
        const dataLines = lines.slice(1);

        // Șterge studenții existenți
        await Student.deleteMany({});

        // Procesează și inserează fiecare student
        const students = dataLines.map(line => {
            const columns = line.split(',').map(col => col.replace(/"/g, '').trim());

            return {
                nume: columns[0],
                email: columns[1].toLowerCase(),
                permissions: [
                    columns[2] === 'True',
                    columns[3] === 'True',
                    columns[4] === 'True'
                ]
            };
        });

        // Inserare în batch
        const result = await Student.insertMany(students);

        return NextResponse.json({
            success: true,
            message: `Migrare completă! ${result.length} studenți inserați.`,
            count: result.length,
            sample: result.slice(0, 3).map(s => ({
                nume: s.nume,
                email: s.email,
                permissions: s.permissions
            }))
        });

    } catch (error: any) {
        console.error('Eroare la migrare:', error);
        return NextResponse.json({
            error: 'Eroare la migrare',
            details: error.message
        }, { status: 500 });
    }
}
