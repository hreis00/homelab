import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB, { getBucket } from "@/lib/mongodb";
import File from "@/models/File";
import { authOptions } from "../../auth/[...nextauth]/auth";
import { ObjectId } from "mongodb";

export async function GET(request: NextRequest) {
    try {
        // Get the ID from the URL
        const segments = request.nextUrl.pathname.split('/');
        const fileId = segments[segments.length - 1];

        if (!fileId) {
            return NextResponse.json({ error: "Missing file ID" }, { status: 400 });
        }

        // Verify authentication first
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await connectDB();

        // Find the file and verify ownership
        const file = await File.findOne({
            _id: fileId,
            userId: session.user.id,
        });

        if (!file) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        if (!file.gridFSId) {
            return NextResponse.json({ error: "File content not found" }, { status: 404 });
        }

        // Get file from GridFS
        const bucket = getBucket();

        async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
            const chunks: Buffer[] = [];

            for await (const chunk of stream) {
                chunks.push(Buffer.from(chunk));
            }

            return Buffer.concat(chunks);
        }

        try {
            const downloadStream = bucket.openDownloadStream(new ObjectId(file.gridFSId));
            const buffer = await streamToBuffer(downloadStream);

            // For text files, return JSON response
            if (file.mimeType.startsWith("text/") || file.mimeType === "application/json") {
                return NextResponse.json({
                    content: buffer.toString('utf-8'),
                    mimeType: file.mimeType
                });
            }

            // For binary files, return raw buffer with correct content type
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': file.mimeType,
                    'Content-Length': buffer.length.toString(),
                    'Content-Disposition': `inline; filename="${file.filename}"`,
                }
            });

        } catch (error) {
            console.error('Error downloading from GridFS:', error);
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return NextResponse.json({ error: "File not found" }, { status: 404 });
            }
            throw error;
        }

    } catch (error) {
        console.error("Error loading file content:", error);
        return NextResponse.json({ error: "Error loading content" }, { status: 500 });
    }
}
