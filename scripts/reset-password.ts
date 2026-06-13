import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

async function main() {
    const hash = await bcrypt.hash("Admin@123", 12);

    await db
        .update(users)
        .set({ password: hash })
        .where(eq(users.email, "admin@edupredict.ai"));

    console.log("Admin password updated successfully.");
}

main()
    .catch(console.error)
    .finally(() => process.exit());