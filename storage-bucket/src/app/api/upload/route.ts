import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB, { getBucket } from "@/lib/mongodb";
import File from "@/models/File";
import { authOptions } from '../auth/[...nextauth]/auth';
import { Readable } from "stream";

export async function POST(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const formData = await request.formData();
		const file = formData.get("file") as File;

		if (!file) {
			return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
		}

		const bytes = await file.arrayBuffer();
		const buffer = Buffer.from(bytes);

		// Determine correct MIME type for markdown files
		let mimeType = file.type;
		if (
			file.name.toLowerCase().endsWith(".md") ||
			file.name.toLowerCase().endsWith(".markdown")
		) {
			mimeType = "text/markdown";
		}

		await connectDB();

		// Upload file to GridFS
		const bucket = getBucket();
		const uploadStream = bucket.openUploadStream(file.name, {
			contentType: mimeType,
		});

		const readableStream = Readable.from(buffer);
		await new Promise((resolve, reject) => {
			readableStream
				.pipe(uploadStream)
				.on("error", reject)
				.on("finish", resolve);
		});

		// Create file metadata document
		const newFile = await File.create({
			filename: file.name,
			originalName: file.name,
			size: buffer.length,
			mimeType: mimeType,
			userId: session.user.id,
			gridFSId: uploadStream.id
		});

		return NextResponse.json(newFile);
	} catch (error) {
		console.error("Error uploading file:", error);
		return NextResponse.json(
			{ error: "Error uploading file" },
			{ status: 500 }
		);
	}
}
