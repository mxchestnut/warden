import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export function setupPassport() {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.username, username));

        if (!user) {
          return done(null, false, { message: 'Incorrect username.' });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    console.log('Deserializing user with ID:', id);
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      console.log('Deserialized user:', user ? user.username : 'not found');
      done(null, user);
    } catch (err) {
      console.error('Deserialize error:', err);
      done(err);
    }
  });
}
