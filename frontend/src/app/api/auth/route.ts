// import { NextResponse } from 'next/server';
// import fs from 'fs';
// import path from 'path';

// export async function GET(request: Request) {
//     const { searchParams } = new URL(request.url);
//     const email = searchParams.get('email');

//     const csvPath = path.join(process.cwd(), 'data', 'studenti.csv');
//     const fileContent = fs.readFileSync(csvPath, 'utf8');
    
//     const lines = fileContent.split('\n').map(line => line.split(','));
//     // const student = lines.find(line => line[1]?.trim() === email);

//     const student = lines.find(line => 
//         line[1]?.trim().toLowerCase() === email?.trim().toLowerCase()
//     );

//     if (!student) {
//         return NextResponse.json({ error: "Studentul nu a fost găsit" }, { status: 404 });
//     }

//     return NextResponse.json({
//         nume: student[0].trim(),
//         permissions: [
//             student[2].trim() === 'True',
//             student[3].trim() === 'True',
//             student[4].trim() === 'True'
//         ]
//     });
// }

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email')?.trim().toLowerCase();

    // Debug: Vedem unde caută serverul fișierul
    const csvPath = path.join(process.cwd(), 'data', 'studenti.csv');
    console.log("Căutăm CSV la:", csvPath);

    if (!fs.existsSync(csvPath)) {
        console.error("FIȘIERUL NU EXISTĂ!");
        return NextResponse.json({ error: "Fișierul bazei de date lipsește de pe server" }, { status: 500 });
    }

    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== ''); // Eliminăm liniile goale

    // Debug: Vedem prima linie să verificăm structura
    console.log("Prima linie din CSV:", lines[0]);

    const student = lines.find(line => {
        const columns = line.split(',');
        const csvEmail = columns[1]?.replace(/"/g, '').trim().toLowerCase();
        return csvEmail === email;
    });

    if (!student) {
        console.log(`Studentul cu email-ul ${email} NU a fost găsit.`);
        return NextResponse.json({ error: "Email negăsit în baza de date!" }, { status: 404 });
    }

    const data = student.split(',').map(col => col.replace(/"/g, '').trim());
    return NextResponse.json({
        nume: data[0].trim(),
        permissions: [
            data[2]?.trim() === 'True',
            data[3]?.trim() === 'True',
            data[4]?.trim() === 'True'
        ]
    });
}