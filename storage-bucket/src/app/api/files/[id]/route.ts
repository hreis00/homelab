import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/auth";
import { ObjectId } from "mongodb";
import File from "@/models/File";
import { getBucket } from "@/lib/mongodb";
import connectDB from "@/lib/mongodb";

export async function DELETE(
    request: NextRequest
) {
    try {
        const fileId = request.url.split('/').pop();
        await connectDB();

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;

        // Find the file and verify ownership
        const file = await File.findOne({
            _id: new ObjectId(fileId),
            userId: new ObjectId(userId),
        });

        if (!file) {
            return NextResponse.json(
                { error: "File not found or unauthorized" },
                { status: 404 }
            );
        }

        // Only delete from GridFS if it's not a template file
        if (file.gridFSId && !file.templateId) {
            try {
                const bucket = getBucket();
                await bucket.delete(file.gridFSId);
            } catch (error) {
								console.error("[DELETE] Error deleting file from GridFS:", error);
								return NextResponse.json(
										{ error: "Failed to delete file from GridFS" },
										{ status: 500 }
								);
            }
        } else {
						// Mark file as deleted in MongoDB
						file.deleted = true;
						await file.save();
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[DELETE] Error deleting file:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
