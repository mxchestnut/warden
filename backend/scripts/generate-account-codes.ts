import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq, isNull } from 'drizzle-orm';

async function generateAccountCodes() {
  console.log('Generating account codes for existing users...');
  
  const usersWithoutCodes = await db.select().from(users).where(isNull(users.accountCode));
  
  console.log(`Found ${usersWithoutCodes.length} users without account codes`);
  
  for (const user of usersWithoutCodes) {
    let accountCode: string;
    let codeExists = true;
    
    while (codeExists) {
      accountCode = Math.floor(100000 + Math.random() * 900000).toString();
      const [existing] = await db.select().from(users).where(eq(users.accountCode, accountCode));
      codeExists = !!existing;
    }
    
    await db.update(users)
      .set({ accountCode })
      .where(eq(users.id, user.id));
    
    console.log(`✓ User ${user.username} -> ${accountCode}`);
  }
  
  console.log('Done!');
  process.exit(0);
}

generateAccountCodes().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
