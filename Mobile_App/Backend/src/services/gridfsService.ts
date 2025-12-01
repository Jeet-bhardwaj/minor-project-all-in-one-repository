import mongoose from 'mongoose';
import { GridFSBucket, GridFSBucketReadStream } from 'mongodb';
import { Readable } from 'stream';

let gridFSBucket: GridFSBucket;

/**
 * Initialize GridFS bucket
 * Must be called after MongoDB connection is established
 */
export const initGridFS = (): void => {
  const db = mongoose.connection.db;
  
  if (!db) {
    throw new Error('MongoDB connection not established');
  }
  
  gridFSBucket = new GridFSBucket(db, {
    bucketName: 'uploads', // Collection name prefix: uploads.files, uploads.chunks
  });
  
  console.log('✅ GridFS initialized with bucket: uploads');
};

/**
 * Upload a file to GridFS
 * @param fileBuffer - File data as Buffer
 * @param filename - Name of the file
 * @param metadata - Optional metadata object
 * @returns GridFS file ID as string
 */
export const uploadToGridFS = async (
  fileBuffer: Buffer,
  filename: string,
  metadata?: any
): Promise<mongoose.Types.ObjectId> => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      reject(new Error('GridFS not initialized. Call initGridFS() first.'));
      return;
    }

    const readableStream = Readable.from(fileBuffer);
    
    const uploadStream = gridFSBucket.openUploadStream(filename, {
      metadata: metadata || {},
    });

    readableStream.pipe(uploadStream);

    uploadStream.on('finish', () => {
      resolve(uploadStream.id as mongoose.Types.ObjectId);
    });

    uploadStream.on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Download a file from GridFS
 * @param fileId - GridFS file ID
 * @returns File data as Buffer
 */
export const downloadFromGridFS = async (
  fileId: string | mongoose.Types.ObjectId
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      reject(new Error('GridFS not initialized'));
      return;
    }

    const chunks: Buffer[] = [];
    const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;

    const downloadStream = gridFSBucket.openDownloadStream(objectId);

    downloadStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    downloadStream.on('error', (error) => {
      reject(error);
    });
  });
};

/**
 * Get a read stream from GridFS (for large files)
 * @param fileId - GridFS file ID
 * @returns Readable stream
 */
export const streamFromGridFS = (
  fileId: string | mongoose.Types.ObjectId
): GridFSBucketReadStream => {
  if (!gridFSBucket) {
    throw new Error('GridFS not initialized');
  }

  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  return gridFSBucket.openDownloadStream(objectId);
};

/**
 * Delete a file from GridFS
 * @param fileId - GridFS file ID
 */
export const deleteFromGridFS = async (
  fileId: string | mongoose.Types.ObjectId
): Promise<void> => {
  if (!gridFSBucket) {
    throw new Error('GridFS not initialized');
  }

  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  await gridFSBucket.delete(objectId);
};

/**
 * Get file metadata from GridFS
 * @param fileId - GridFS file ID
 * @returns File metadata
 */
export const getFileInfo = async (
  fileId: string | mongoose.Types.ObjectId
): Promise<any> => {
  if (!gridFSBucket) {
    throw new Error('GridFS not initialized');
  }

  const objectId = typeof fileId === 'string' ? new mongoose.Types.ObjectId(fileId) : fileId;
  
  const files = await gridFSBucket.find({ _id: objectId }).toArray();
  
  if (files && files.length > 0) {
    return files[0];
  } else {
    throw new Error('File not found');
  }
};

/**
 * Check if a file exists in GridFS
 * @param fileId - GridFS file ID
 * @returns boolean
 */
export const fileExistsInGridFS = async (
  fileId: string | mongoose.Types.ObjectId
): Promise<boolean> => {
  try {
    await getFileInfo(fileId);
    return true;
  } catch {
    return false;
  }
};
