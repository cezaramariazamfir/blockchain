// Script de migrare: CSV -> MongoDB
// Rulează cu: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/migrateStudents.ts

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = 'mongodb+srv://is-user:morzlf0z3lKRarmU@clusteris.lnmkkke.mongodb.net/academic_credentials?retryWrites=true&w=majority&appName=ClusterIS';

// Schema inline pentru script standalone
const StudentSchema = new mongoose.Schema({
    nume: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    permissions: { type: [Boolean], required: true, default: [false, false, false] }
}, { timestamps: true });

const Student = mongoose.model('Student', StudentSchema);

async function migrateStudents() {
    try {
        console.log('Conectare la MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Conectat!');

        // Citește CSV
        const csvPath = path.join(__dirname, '..', 'data', 'studenti.csv');
        console.log(`Citire CSV de la: ${csvPath}`);

        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        // Sari peste header
        const dataLines = lines.slice(1);

        console.log(`Găsite ${dataLines.length} studenți în CSV`);

        // Șterge studenții existenți (opțional - pentru migrare curată)
        await Student.deleteMany({});
        console.log('Colecția studenți curățată');

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
        console.log(`Inserați ${result.length} studenți în MongoDB`);

        // Verificare
        const count = await Student.countDocuments();
        console.log(`Total studenți în baza de date: ${count}`);

        // Afișează primii 3 pentru verificare
        const sample = await Student.find().limit(3);
        console.log('\nExemple de studenți inserați:');
        sample.forEach(s => {
            console.log(`  - ${s.nume} (${s.email}): [${s.permissions.join(', ')}]`);
        });

    } catch (error) {
        console.error('Eroare la migrare:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDeconectat de la MongoDB');
    }
}

migrateStudents();
