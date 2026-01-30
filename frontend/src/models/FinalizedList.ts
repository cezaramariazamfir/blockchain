import mongoose, { Schema, Document } from 'mongoose';

export interface IFinalizedList extends Document {
    predicateId: string;
    root: string;
    commitments: string[];
    finalizedAt: Date;
}

const FinalizedListSchema: Schema = new Schema({
    predicateId: {
        type: String,
        required: true,
        unique: true
    },
    root: {
        type: String,
        required: true
    },
    commitments: {
        type: [String],
        required: true
    },
    finalizedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.models.FinalizedList || mongoose.model<IFinalizedList>('FinalizedList', FinalizedListSchema);
