"use client";

import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition, RadioGroup } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { useTheme } from "next-themes";

interface SettingsDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

export default function SettingsDialog({
	isOpen,
	onClose,
}: SettingsDialogProps) {
	const { data: session, update } = useSession();
	const { theme, setTheme, resolvedTheme } = useTheme();
	const [selectedTheme, setSelectedTheme] = useState(theme || "system");
	const [name, setName] = useState(session?.user?.name || "");
	const [originalTheme, setOriginalTheme] = useState(theme || "system");

	useEffect(() => {
		if (session?.user?.name) {
			setName(session.user.name);
		}
	}, [session?.user?.name]);

	useEffect(() => {
		setSelectedTheme(theme || "system");
		setOriginalTheme(theme || "system");
	}, [theme]);

	// Preview theme when selected
	const handleThemeChange = (newTheme: string) => {
		setSelectedTheme(newTheme);
		setTheme(newTheme);
	};

	// Reset theme on dialog close
	const handleClose = () => {
		setTheme(originalTheme);
		onClose();
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			const response = await fetch("/api/user/settings", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ name, theme: selectedTheme }),
			});

			if (!response.ok) {
				throw new Error("Failed to update settings");
			}

			const data = await response.json();

			// Theme is already updated from preview
			setOriginalTheme(selectedTheme);

			// Update session with new user data
			await update({
				...session,
				user: {
					...session?.user,
					name: data.user.name,
				},
			});

			toast.success("Settings updated successfully");
			onClose();
		} catch (error) {
			console.error("Error updating settings:", error);
			toast.error("Failed to update settings");
		}
	};

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog as="div" className="relative z-50" onClose={handleClose}>
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
							<Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-card p-6 shadow-xl transition-all">
								<div className="flex items-center justify-between mb-6">
									<Dialog.Title className="text-lg font-medium text-foreground">
										Settings
									</Dialog.Title>
									<button
										type="button"
										className="rounded-md p-1 text-muted hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
										onClick={handleClose}
									>
										<XMarkIcon className="h-6 w-6" />
									</button>
								</div>

								<div className="space-y-6">
									<div>
										<label
											htmlFor="name"
											className="block text-sm font-medium text-foreground"
										>
											Display Name
										</label>
										<input
											type="text"
											id="name"
											value={name}
											onChange={(e) => setName(e.target.value)}
											className="mt-1 block w-full rounded-md border border-base bg-background px-3 py-2 text-foreground shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 sm:text-sm"
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-foreground mb-2">
											Theme
										</label>
										<RadioGroup
											value={selectedTheme}
											onChange={handleThemeChange}
										>
											<div className="space-y-2">
												<RadioGroup.Option
													value="light"
													className={({ checked }) =>
														`${
															checked
																? "bg-primary-50 border-primary-500 z-10"
																: "border-base"
														} relative border p-4 rounded-lg cursor-pointer flex focus:outline-none`
													}
												>
													{({ checked }) => (
														<>
															<div className="flex w-full items-center justify-between">
																<div className="flex items-center">
																	<div className="text-sm">
																		<RadioGroup.Label
																			as="p"
																			className="font-medium text-foreground"
																		>
																			Light
																		</RadioGroup.Label>
																	</div>
																</div>
																{checked && (
																	<div className="text-primary-600">
																		<CheckIcon className="h-5 w-5" />
																	</div>
																)}
															</div>
														</>
													)}
												</RadioGroup.Option>

												<RadioGroup.Option
													value="dark"
													className={({ checked }) =>
														`${
															checked
																? "bg-primary-50 border-primary-500 z-10"
																: "border-base"
														} relative border p-4 rounded-lg cursor-pointer flex focus:outline-none`
													}
												>
													{({ checked }) => (
														<>
															<div className="flex w-full items-center justify-between">
																<div className="flex items-center">
																	<div className="text-sm">
																		<RadioGroup.Label
																			as="p"
																			className="font-medium text-foreground"
																		>
																			Dark
																		</RadioGroup.Label>
																	</div>
																</div>
																{checked && (
																	<div className="text-primary-600">
																		<CheckIcon className="h-5 w-5" />
																	</div>
																)}
															</div>
														</>
													)}
												</RadioGroup.Option>

												<RadioGroup.Option
													value="system"
													className={({ checked }) =>
														`${
															checked
																? "bg-primary-50 border-primary-500 z-10"
																: "border-base"
														} relative border p-4 rounded-lg cursor-pointer flex focus:outline-none`
													}
												>
													{({ checked }) => (
														<>
															<div className="flex w-full items-center justify-between">
																<div className="flex items-center">
																	<div className="text-sm">
																		<RadioGroup.Label
																			as="p"
																			className="font-medium text-foreground"
																		>
																			System
																		</RadioGroup.Label>
																		<RadioGroup.Description
																			as="span"
																			className="text-muted"
																		>
																			{`Currently ${resolvedTheme}`}
																		</RadioGroup.Description>
																	</div>
																</div>
																{checked && (
																	<div className="text-primary-600">
																		<CheckIcon className="h-5 w-5" />
																	</div>
																)}
															</div>
														</>
													)}
												</RadioGroup.Option>
											</div>
										</RadioGroup>
									</div>

									<div className="mt-4 flex justify-end space-x-2">
										<button
											type="button"
											className="inline-flex justify-center rounded-md border border-base px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
											onClick={handleClose}
										>
											Cancel
										</button>
										<button
											type="submit"
											className="btn-primary inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
											onClick={handleSubmit}
										>
											Save Changes
										</button>
									</div>
								</div>
							</Dialog.Panel>
						</Transition.Child>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
}

function CheckIcon(props: React.ComponentProps<"svg">) {
	return (
		<svg viewBox="0 0 24 24" fill="none" {...props}>
			<circle cx={12} cy={12} r={12} fill="currentColor" opacity="0.2" />
			<path
				d="M7 13l3 3 7-7"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
