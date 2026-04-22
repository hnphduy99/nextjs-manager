import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { type NextRequest, NextResponse } from "next/server";

interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = (await req.json()) as RegisterBody;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const exists = await db.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: "Email already registered." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create user and assign default "user" role in a transaction
    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: { name, email, passwordHash },
        select: { id: true, email: true, name: true }
      });

      const userRole = await tx.role.findUnique({ where: { name: "user" } });
      if (userRole) {
        await tx.userRole.create({ data: { userId: newUser.id, roleId: userRole.id } });
      }

      return newUser;
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
