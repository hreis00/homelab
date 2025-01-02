import mongoose from "mongoose"
import { GridFSBucket } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
	throw new Error("Please define the MONGODB_URI environment variable inside .env")
}

let bucket: GridFSBucket | null = null

async function connectDB() {
	try {
		// If already connected, initialize bucket if needed and return
		if (mongoose.connection.readyState >= 1) {
			if (!bucket && mongoose.connection.db) {
				bucket = new GridFSBucket(mongoose.connection.db, {
					bucketName: "uploads",
				})
			}
			return
		}

		// Connect to MongoDB
		const conn = await mongoose.connect(MONGODB_URI)

		// Initialize GridFS bucket
		if (!mongoose.connection.db) {
			throw new Error("MongoDB connection database not initialized")
		}
		bucket = new GridFSBucket(mongoose.connection.db, {
			bucketName: "uploads",
		})

		return conn
	} catch (error) {
		console.error("Error connecting to MongoDB:", error)
		throw error
	}
}

export function getBucket() {
	if (!bucket) {
		throw new Error("Call connectDB before accessing the bucket")
	}
	return bucket
}

export default connectDB
