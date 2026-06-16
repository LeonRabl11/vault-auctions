import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "./db";
import {account, session, user, verification} from "./db/auth-schema";
import {sendVerificationEmail} from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {user, session, account, verification},
  }),
  // requireEmailVerification = false: Login bleibt auch unverifiziert möglich.
  emailAndPassword: {enabled: true, requireEmailVerification: false},
  emailVerification: {
    // Verifizierungs-Mail automatisch bei der Registrierung verschicken.
    sendOnSignUp: true,
    // url ist bereits absolut (basiert auf BETTER_AUTH_URL). Mailfehler dürfen
    // den Signup nicht abbrechen -> tolerant fangen und nur loggen.
    sendVerificationEmail: async ({user: recipient, url}) => {
      try {
        await sendVerificationEmail({
          to: recipient.email,
          name: recipient.name,
          url,
        });
      } catch (e) {
        console.error("[email] verification send failed", e);
      }
    },
  },
});
