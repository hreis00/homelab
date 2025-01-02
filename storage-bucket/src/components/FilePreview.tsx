import { Dialog, Transition } from "@headlessui/react";
import { Fragment, useState, useEffect, useCallback } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import Image from "next/image";

interface FilePreviewProps {
	fileId: string;
	fileName: string;
	mimeType: string;
	isOpen: boolean;
	onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({
	fileId,
	fileName,
	mimeType,
	isOpen,
	onClose,
}) => {
	const [content, setContent] = useState<string>("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string>("");

	// File type checks
	const isMarkdown = mimeType === "text/markdown";
	const isText =
		mimeType.startsWith("text/") || mimeType === "application/json";
	const isImage = mimeType.startsWith("image/");
	const isPDF = mimeType === "application/pdf";
	const isAudio = mimeType.startsWith("audio/");
	const isVideo = mimeType.startsWith("video/");

	const previewUrl = `/api/preview/${fileId}`;

	const handlePreview = useCallback(async () => {
		if (!fileId) return;

		setLoading(true);
		setError("");

		try {
			const response = await fetch(previewUrl);
			if (!response.ok) {
				throw new Error("Failed to load file preview");
			}

			// For text files, parse JSON response
			if (isText) {
				const data = await response.json();
				if (data.error) {
					throw new Error(data.error);
				}
				setContent(data.content);
			} else {
				// For binary files, create object URL
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				setContent(url);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
			console.error("Error loading preview:", err);
		} finally {
			setLoading(false);
		}
	}, [fileId, isText, previewUrl]);

	// Clean up object URLs when component unmounts
	useEffect(() => {
		return () => {
			if (content && !isText) {
				URL.revokeObjectURL(content);
				setContent("");
			}
		};
	}, [content, isText]);

	// Load preview when fileId or mimeType changes
	useEffect(() => {
		if (fileId && mimeType && isOpen) {
			handlePreview();
		}
	}, [fileId, mimeType, isOpen, handlePreview]);

	if (!isOpen) return null;

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={onClose}>
				<Transition.Child
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 bg-black/50" />
				</Transition.Child>

				<div className="fixed inset-0 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4">
						<Transition.Child
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-card p-6 shadow-xl transition-all">
								<div className="flex items-center justify-between mb-4">
									<Dialog.Title className="text-lg font-medium flex items-center gap-2">
										<span>{fileName}</span>
										<span className="text-sm text-gray-400">({mimeType})</span>
									</Dialog.Title>
									<button
										onClick={onClose}
										className="rounded-full p-1 hover:bg-gray-700/50"
									>
										<XMarkIcon className="h-5 w-5" />
									</button>
								</div>

								<div className="mt-4">
									{loading ? (
										<div className="text-center p-4">Loading...</div>
									) : error ? (
										<div className="text-red-500 p-4">{error}</div>
									) : !content ? (
										<button
											onClick={handlePreview}
											className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
										>
											Preview
										</button>
									) : isMarkdown ? (
										<div className="prose prose-invert max-w-none bg-gray-800 p-4 rounded-lg">
											<ReactMarkdown
												remarkPlugins={[remarkGfm]}
												rehypePlugins={[rehypeRaw]}
											>
												{content}
											</ReactMarkdown>
										</div>
									) : isText ? (
										<div className="relative">
											<pre className="whitespace-pre-wrap break-words text-gray-200 font-mono text-sm p-4 bg-gray-800 rounded-lg overflow-x-auto">
												{content}
											</pre>
										</div>
									) : isImage ? (
										<div className="relative w-full h-64">
											<Image
												src={content}
												alt={fileName || "Preview"}
												fill
												className="object-contain"
												priority
											/>
										</div>
									) : isPDF ? (
										<div className="w-full h-[70vh] rounded-lg overflow-hidden border border-gray-700">
											<iframe
												src={content}
												className="w-full h-full"
												title={fileName}
											/>
										</div>
									) : isVideo ? (
										<div className="relative w-full">
											<video
												src={content}
												controls
												className="w-full max-h-[70vh] rounded-lg"
											>
												Your browser does not support the video tag.
											</video>
										</div>
									) : isAudio ? (
										<div className="relative w-full bg-gray-800 p-4 rounded-lg">
											<audio src={content} controls className="w-full">
												Your browser does not support the audio tag.
											</audio>
										</div>
									) : (
										<div className="text-center p-4">
											<p className="text-gray-400 mb-4">
												Preview not available for this file type ({mimeType})
											</p>
											<a
												href={content}
												download={fileName}
												className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
											>
												Download {fileName}
											</a>
										</div>
									)}
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};

export default FilePreview;
