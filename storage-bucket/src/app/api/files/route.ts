import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import connectDB from "@/lib/mongodb";
import File from "@/models/File";
import { authOptions } from '../auth/[...nextauth]/auth';
import { ObjectId } from "mongodb";
import { getBucket } from "@/lib/mongodb";

export async function GET() {
    try {
        await connectDB();

        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userObjectId = new ObjectId(session.user.id);

        // Get user's regular files
        const files = (await File.find({
            userId: userObjectId,
            deleted: { $ne: true }
        }).lean()) as unknown as Array<{
            _id: ObjectId;
            filename: string;
            userId: ObjectId;
            deleted: boolean;
            isTemplate: boolean;
            templateId?: ObjectId;
            gridFSId?: ObjectId;
            mimeType?: string;
            size?: number;
            originalName?: string;
            createdAt: Date;
            updatedAt: Date;
        }>;

        // Get GridFS bucket
        const bucket = getBucket();

        // Enhance files with GridFS metadata
        const enhancedFiles = await Promise.all(files.map(async (file) => {
            try {
                // If this is a reference to a template, use the template's GridFS file
                const templateFile = file.templateId ? await File.findById(file.templateId) : null;
                const gridFSId = templateFile?.gridFSId || file.gridFSId;

                if (!gridFSId) {
                    throw new Error("GridFS ID not found");
                }

                const cursor = bucket.find({ _id: gridFSId });
                const gridFSFile = await cursor.next();

                if (!gridFSFile) {
                    throw new Error("GridFS file not found");
                }

                return {
                    _id: file._id.toString(),
                    originalName: file.originalName || templateFile?.originalName || file.filename,
                    filename: file.filename,
                    size: gridFSFile.length || 0,
                    mimeType: gridFSFile.contentType || 'text/markdown',
                    createdAt: file.createdAt?.toISOString() || new Date().toISOString(),
                    updatedAt: file.updatedAt?.toISOString() || new Date().toISOString(),
                    deleted: file.deleted,
                    isTemplate: file.isTemplate,
                    templateId: file.templateId?.toString()
                };
            } catch (error) {
                console.error("[GET] Error fetching GridFS metadata:", error);
                return {
                    _id: file._id.toString(),
                    originalName: file.originalName || file.filename,
                    filename: file.filename,
                    size: file.size || 0,
                    mimeType: file.mimeType || 'text/markdown',
                    createdAt: file.createdAt?.toISOString() || new Date().toISOString(),
                    updatedAt: file.updatedAt?.toISOString() || new Date().toISOString(),
                    deleted: file.deleted,
                    isTemplate: file.isTemplate,
                    templateId: file.templateId?.toString()
                };
            }
        }));

        return NextResponse.json(enhancedFiles);
    } catch (error) {
        console.error("[GET] Error fetching files:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Unknown error" },
            { status: 500 }
        );
    }
}
