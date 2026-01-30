import mongoose, { Schema, Document } from 'mongoose';

export interface IStudent extends Document {
    nume: string;
    email: string;
    permissions: boolean[]; // [predicate0, predicate1, predicate2]
}

const StudentSchema: Schema = new Schema({
    nume: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    permissions: {
        type: [Boolean],
        required: true,
        default: [false, false, false]
    }
}, {
    timestamps: true
});

// Index pentru căutare rapidă după email
StudentSchema.index({ email: 1 });

export default mongoose.models.Student || mongoose.model<IStudent>('Student', StudentSchema);
