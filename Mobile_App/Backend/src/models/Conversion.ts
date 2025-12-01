import mongoose, { Document, Schema } from 'mongoose';

// Image schema for GridFS references
const imageSchema = new Schema({
  fileId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  size: Number,
  chunkIndex: Number,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Conversion interface
export interface IConversion extends Document {
  userId: string;
  conversionId: string;
  originalFileName: string;
  originalFileSize: number;
  audioFormat: string;
  masterKey: string; // Encrypted master key
  zipFileId: mongoose.Types.ObjectId;
  images: Array<{
    fileId: mongoose.Types.ObjectId;
    filename: string;
    size: number;
    chunkIndex: number;
    createdAt: Date;
  }>;
  metadata: {
    numChunks: number;
    totalImageSize: number;
    compressed: boolean;
    duration?: number;
  };
  status: 'processing' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// Conversion schema
const conversionSchema = new Schema<IConversion>(
  {
    // User reference
    userId: {
      type: String,
      required: true,
      index: true, // Fast lookup by userId
    },

    // Conversion identifiers
    conversionId: {
      type: String,
      required: true,
      unique: true,
      index: true, // Fast lookup by conversionId
    },

    // Original file info
    originalFileName: {
      type: String,
      required: true,
    },
    originalFileSize: Number,
    audioFormat: String,

    // MASTER KEY (ENCRYPTED!)
    masterKey: {
      type: String,
      required: true,
      select: false, // Don't return by default in queries
    },

    // GridFS references
    zipFileId: {
      type: Schema.Types.ObjectId,
      required: false, // Optional until ZIP is uploaded
    },

    images: [imageSchema],

    // Metadata
    metadata: {
      numChunks: Number,
      totalImageSize: Number,
      compressed: Boolean,
      duration: Number,
    },

    // Status tracking
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
conversionSchema.index({ userId: 1, createdAt: -1 });
conversionSchema.index({ userId: 1, status: 1 });

export const Conversion = mongoose.model<IConversion>('Conversion', conversionSchema);
