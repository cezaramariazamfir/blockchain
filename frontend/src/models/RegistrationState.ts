import mongoose, { Schema, Document } from 'mongoose';

export interface IRegistrationState extends Document {
    predicateId: string;
    state: 'open' | 'closed';
    updatedAt: Date;
}

const RegistrationStateSchema: Schema = new Schema({
    predicateId: {
        type: String,
        required: true,
        unique: true
    },
    state: {
        type: String,
        enum: ['open', 'closed'],
        default: 'closed'
    }
}, {
    timestamps: true
});

export default mongoose.models.RegistrationState || mongoose.model<IRegistrationState>('RegistrationState', RegistrationStateSchema);
