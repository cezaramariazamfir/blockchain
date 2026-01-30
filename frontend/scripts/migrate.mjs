// Script de migrare: CSV -> MongoDB
// Rulează cu: node scripts/migrate.mjs

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = 'mongodb+srv://is-user:morzlf0z3lKRarmU@clusteris.lnmkkke.mongodb.net/academic_credentials?retryWrites=true&w=majority&appName=ClusterIS';

const StudentSchema = new mongoose.Schema({
    nume: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    permissions: { type: [Boolean], required: true, default: [false, false, false] }
}, { timestamps: true });

const Student = mongoose.model('Student', StudentSchema);

async function migrate() {
    try {
        console.log('Conectare la MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Conectat!');

        const csvPath = path.join(__dirname, '..', 'data', 'studenti.csv');
        console.log(`Citire CSV: ${csvPath}`);

        const fileContent = fs.readFileSync(csvPath, 'utf8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');
        const dataLines = lines.slice(1); // skip header

        console.log(`Găsiți ${dataLines.length} studenți`);

        await Student.deleteMany({});
        console.log('Colecția curățată');

        const students = dataLines.map(line => {
            const cols = line.split(',').map(c => c.replace(/"/g, '').trim());
            return {
                nume: cols[0],
                email: cols[1].toLowerCase(),
                permissions: [cols[2] === 'True', cols[3] === 'True', cols[4] === 'True']
            };
        });

        const result = await Student.insertMany(students);
        console.log(`\nMigrare completă! ${result.length} studenți inserați în MongoDB.`);

        const sample = await Student.find().limit(3);
        console.log('\nExemple:');
        sample.forEach(s => console.log(`  - ${s.nume} (${s.email})`));

    } catch (error) {
        console.error('Eroare:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nGata!');
        process.exit(0);
    }
}

migrate();
