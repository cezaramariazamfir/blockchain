import mongoose, { Schema, Document } from 'mongoose';

export interface IEnrollment extends Document {
    predicateId: string;
    commitment: string;
    createdAt: Date;
}

const EnrollmentSchema: Schema = new Schema({
    predicateId: {
        type: String,
        required: true,
        index: true
    },
    commitment: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Index compus pentru căutare rapidă și unicitate
EnrollmentSchema.index({ predicateId: 1, commitment: 1 }, { unique: true });

export default mongoose.models.Enrollment || mongoose.model<IEnrollment>('Enrollment', EnrollmentSchema);
