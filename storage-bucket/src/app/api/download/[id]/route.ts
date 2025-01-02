import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import connectDB, { getBucket } from "@/lib/mongodb";
import File from "@/models/File";
import { authOptions } from "../../auth/[...nextauth]/auth";

export async function GET(
    request: NextRequest,
) {

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

        const bucket = getBucket();

        // Create a download stream
        const downloadStream = bucket.openDownloadStream(new ObjectId(file.gridFSId));

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of downloadStream) {
            chunks.push(chunk);
        }

        const fileData = Buffer.concat(chunks);

        return new NextResponse(fileData, {
            headers: {
                "Content-Type": file.mimeType,
                "Content-Disposition": `attachment; filename="${file.originalName}"`,
            },
        });
    } catch (error) {
        console.error("Error downloading file:", error);
        return NextResponse.json(
            { error: "Error downloading file" },
            { status: 500 }
        );
    }
}
