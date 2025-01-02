import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    deleted: {
        type: Boolean,
        default: false
    },
    isTemplate: {
        type: Boolean,
        default: false
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File'
    },
    gridFSId: {
        type: mongoose.Schema.Types.ObjectId
    },
    mimeType: {
        type: String
    },
    size: {
        type: Number
    },
    originalName: {
        type: String
    }
}, {
    timestamps: true
});

const File = mongoose.models.File || mongoose.model("File", fileSchema);

export default File;
