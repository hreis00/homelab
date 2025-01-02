import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { setupUserFiles } from "@/lib/userSetup";

export async function POST(request: NextRequest) {
	try {
		const { email, password, name } = await request.json();

		// Validate input
		if (!email || !password || !name) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 }
			);
		}

		await connectDB();

		// Check if user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return NextResponse.json(
				{ error: "Email already registered" },
				{ status: 400 }
			);
		}

		// Hash password
		const hashedPassword = await hash(password, 12);

		// Create new user
		const user = await User.create({
			email,
			password: hashedPassword,
			name,
		});

        // Setup initial user files (like welcome file)
        await setupUserFiles(user._id);

		return NextResponse.json(
			{
				message: "User created successfully",
				user: {
					id: user._id.toString(),
					email: user.email,
					name: user.name,
				}
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Registration error:", error);
		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 500 });
		}
		return NextResponse.json({ error: "Error creating user" }, { status: 500 });
	}
}
