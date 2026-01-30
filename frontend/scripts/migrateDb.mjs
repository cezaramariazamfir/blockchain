// Script de migrare: db.json -> MongoDB
// Rulează cu: node scripts/migrateDb.mjs

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = 'mongodb+srv://is-user:morzlf0z3lKRarmU@clusteris.lnmkkke.mongodb.net/academic_credentials?retryWrites=true&w=majority&appName=ClusterIS';

// Schemas
const EnrollmentSchema = new mongoose.Schema({
    predicateId: { type: String, required: true, index: true },
    commitment: { type: String, required: true }
}, { timestamps: true });
EnrollmentSchema.index({ predicateId: 1, commitment: 1 }, { unique: true });

const RegistrationStateSchema = new mongoose.Schema({
    predicateId: { type: String, required: true, unique: true },
    state: { type: String, enum: ['open', 'closed'], default: 'closed' }
}, { timestamps: true });

const FinalizedListSchema = new mongoose.Schema({
    predicateId: { type: String, required: true, unique: true },
    root: { type: String, required: true },
    commitments: { type: [String], required: true },
    finalizedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
const RegistrationState = mongoose.model('RegistrationState', RegistrationStateSchema);
const FinalizedList = mongoose.model('FinalizedList', FinalizedListSchema);

async function migrate() {
    try {
        console.log('Conectare la MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Conectat!');

        const dbPath = path.join(__dirname, '..', 'data', 'db.json');
        console.log(`Citire db.json: ${dbPath}`);

        const fileContent = fs.readFileSync(dbPath, 'utf8');
        const db = JSON.parse(fileContent);

        // 1. Migrare enrollments
        console.log('\n--- Migrare Enrollments ---');
        await Enrollment.deleteMany({});
        let enrollmentCount = 0;

        for (const [predicateId, commitments] of Object.entries(db.enrollments || {})) {
            for (const commitment of commitments) {
                await Enrollment.create({ predicateId, commitment });
                enrollmentCount++;
            }
        }
        console.log(`Inserate ${enrollmentCount} enrollments`);

        // 2. Migrare registrationState
        console.log('\n--- Migrare RegistrationState ---');
        await RegistrationState.deleteMany({});
        let stateCount = 0;

        for (const [predicateId, state] of Object.entries(db.registrationState || {})) {
            await RegistrationState.create({ predicateId, state });
            stateCount++;
        }
        console.log(`Inserate ${stateCount} registration states`);

        // 3. Migrare finalized
        console.log('\n--- Migrare FinalizedList ---');
        await FinalizedList.deleteMany({});
        let finalizedCount = 0;

        for (const [predicateId, data] of Object.entries(db.finalized || {})) {
            await FinalizedList.create({
                predicateId,
                root: data.root,
                commitments: data.commitments,
                finalizedAt: new Date(data.finalizedAt)
            });
            finalizedCount++;
        }
        console.log(`Inserate ${finalizedCount} finalized lists`);

        console.log('\n=== Migrare completă! ===');

    } catch (error) {
        console.error('Eroare:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Deconectat de la MongoDB');
        process.exit(0);
    }
}

migrate();
