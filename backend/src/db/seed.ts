import { createApplication } from '@specific-dev/framework';
import * as appSchema from './schema.js';
import * as authSchema from './auth-schema.js';
import { eq } from 'drizzle-orm';
import { hash } from '@node-rs/argon2';

const schema = { ...appSchema, ...authSchema };

async function seedAdminUser() {
  const app = await createApplication(schema);

  const email = 'hungry.hustler@yahoo.com';
  const password = 'Afroman420!';
  const name = 'Hungry Hustler Admin';

  try {
    console.log('Starting admin user seed...');

    // Check if user already exists
    const existingUsers = await app.db
      .select()
      .from(authSchema.user)
      .where(eq(authSchema.user.email, email));

    let userId: string;

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      console.log(`User ${email} already exists with ID: ${userId}`);

      // Update the account with new password
      const hashedPassword = await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      const accounts = await app.db
        .select()
        .from(authSchema.account)
        .where(eq(authSchema.account.userId, userId));

      if (accounts.length > 0) {
        await app.db
          .update(authSchema.account)
          .set({ password: hashedPassword })
          .where(eq(authSchema.account.userId, userId));
        console.log('Password updated for existing user');
      } else {
        // Create account with email/password provider
        await app.db.insert(authSchema.account).values({
          id: `account_${Date.now()}`,
          accountId: email,
          providerId: 'credential',
          userId,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('Account created for existing user');
      }
    } else {
      // Create new user
      userId = `user_${Date.now()}`;
      const hashedPassword = await hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      await app.db.insert(authSchema.user).values({
        id: userId,
        name,
        email,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create account with email/password provider
      await app.db.insert(authSchema.account).values({
        id: `account_${Date.now()}`,
        accountId: email,
        providerId: 'credential',
        userId,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`New user created: ${email} with ID: ${userId}`);
    }

    // Check if user is already an admin
    const adminRecords = await app.db
      .select()
      .from(appSchema.adminUsers)
      .where(eq(appSchema.adminUsers.userId, userId));

    if (adminRecords.length > 0) {
      if (adminRecords[0].isAdmin) {
        console.log('User is already marked as admin');
      } else {
        // Update to admin
        await app.db
          .update(appSchema.adminUsers)
          .set({ isAdmin: true })
          .where(eq(appSchema.adminUsers.userId, userId));
        console.log('User updated to admin status');
      }
    } else {
      // Create admin record
      await app.db.insert(appSchema.adminUsers).values({
        userId,
        isAdmin: true,
        createdAt: new Date(),
      });
      console.log('Admin user record created');
    }

    console.log('Admin user seed completed successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seedAdminUser();
