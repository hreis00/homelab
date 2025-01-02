import { ObjectId } from "mongodb";
import fs from "fs";
import path from "path";
import File from "@/models/File";
import { getBucket } from "./mongodb";

export const TEMPLATE_USER_ID = new ObjectId("000000000000000000000000");
export const WELCOME_TEMPLATE_ID = new ObjectId("000000000000000000000001");

async function uploadWelcomeToGridFS() {
    const welcomePath = path.join(process.cwd(), "src/assets/WELCOME.md");
    const welcomeContent = await fs.promises.readFile(welcomePath);

    // Upload to GridFS
    const bucket = getBucket();
    const uploadStream = bucket.openUploadStream("WELCOME.md", {
        contentType: "text/markdown"
    });

    // Upload the content
    await new Promise((resolve, reject) => {
        uploadStream.on('error', reject);
        uploadStream.on('finish', resolve);
        uploadStream.write(welcomeContent);
        uploadStream.end();
    });

    return {
        gridFSId: uploadStream.id,
        size: welcomeContent.length
    };
}

async function ensureWelcomeTemplate() {
    // Check if template welcome file exists
    let templateFile = await File.findOne({
        _id: WELCOME_TEMPLATE_ID,
        userId: TEMPLATE_USER_ID,
        isTemplate: true
    });

    // Check if GridFS file exists
    let gridFSExists = false;
    if (templateFile?.gridFSId) {
        const bucket = getBucket();
        const cursor = bucket.find({ _id: templateFile.gridFSId });
        const gridFSFile = await cursor.next();
        gridFSExists = !!gridFSFile;
    }

    // If either template record or GridFS file is missing, recreate both
    if (!templateFile || !gridFSExists) {

        // If template exists but GridFS is missing, delete the template
        if (templateFile) {
            await File.deleteOne({ _id: WELCOME_TEMPLATE_ID });
        }

        // Upload new file to GridFS
        const { gridFSId, size } = await uploadWelcomeToGridFS();

        // Create template file record
        templateFile = await File.create({
            _id: WELCOME_TEMPLATE_ID,
            filename: "WELCOME.md",
            userId: TEMPLATE_USER_ID,
            isTemplate: true,
            gridFSId: gridFSId,
            mimeType: "text/markdown",
            size: size,
            originalName: "WELCOME.md"
        });
    }
    return templateFile;
}

export async function setupUserFiles(userId: string | ObjectId) {
    try {
        const userObjectId = typeof userId === "string" ? new ObjectId(userId) : userId;

        // Check if user already has a welcome file record
        const existingFile = await File.findOne({
            userId: userObjectId,
            templateId: WELCOME_TEMPLATE_ID
        });

        if (existingFile) {
            return;
        }


        // Ensure template exists and get its details
        const templateFile = await ensureWelcomeTemplate();

        // Create welcome file record with template details
        await File.create({
            filename: templateFile.filename,
            userId: userObjectId,
            templateId: WELCOME_TEMPLATE_ID,
            gridFSId: templateFile.gridFSId,
            mimeType: templateFile.mimeType,
            size: templateFile.size,
            originalName: templateFile.originalName,
            deleted: false
        });

    } catch (error) {
        console.error("[SETUP] Error setting up user files:", error);
        throw error;
    }
}
