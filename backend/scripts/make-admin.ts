import dotenv from 'dotenv';
import path from 'path';
import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '../.env') });

async function makeAdmin(username: string) {
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    
    if (!user) {
      console.error(`User ${username} not found`);
      process.exit(1);
    }

    await db.update(users)
      .set({ isAdmin: true })
      .where(eq(users.username, username));

    console.log(`✓ User ${username} is now an admin`);
    process.exit(0);
  } catch (error) {
    console.error('Error making user admin:', error);
    process.exit(1);
  }
}

const username = process.argv[2];
if (!username) {
  console.error('Usage: tsx scripts/make-admin.ts <username>');
  process.exit(1);
}

makeAdmin(username);
