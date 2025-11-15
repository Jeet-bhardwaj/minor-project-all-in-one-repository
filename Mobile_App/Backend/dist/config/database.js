"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
exports.disconnectDB = disconnectDB;
exports.isDBConnected = isDBConnected;
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'echocipher';
/**
 * Connect to MongoDB Atlas
 */
async function connectDB() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        await mongoose_1.default.connect(MONGODB_URI, {
            dbName: DB_NAME,
            maxPoolSize: 10,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority',
        });
        console.log('✅ MongoDB Atlas connected successfully');
        console.log(`📦 Database: ${DB_NAME}`);
    }
    catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
}
/**
 * Disconnect from MongoDB
 */
async function disconnectDB() {
    try {
        await mongoose_1.default.disconnect();
        console.log('✅ MongoDB disconnected');
    }
    catch (error) {
        console.error('❌ MongoDB disconnection error:', error);
    }
}
/**
 * Get MongoDB connection status
 */
function isDBConnected() {
    return mongoose_1.default.connection.readyState === 1;
}
exports.default = mongoose_1.default;
//# sourceMappingURL=database.js.map