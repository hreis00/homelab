"use client";

interface ConfirmDialogProps {
	isOpen: boolean;
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmDialog({
	isOpen,
	title,
	message,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
				<div className="mt-3 text-center">
					<h3 className="text-lg leading-6 font-medium text-gray-900">
						{title}
					</h3>
					<div className="mt-2 px-7 py-3">
						<p className="text-sm text-gray-500">{message}</p>
					</div>
					<div className="items-center px-4 py-3">
						<button
							onClick={onConfirm}
							className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
						>
							Delete
						</button>
						<button
							onClick={onCancel}
							className="px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-24 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
						>
							Cancel
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
