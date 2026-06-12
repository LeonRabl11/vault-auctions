import {createAuthClient} from "better-auth/react";

// baseURL wird im Browser aus dem aktuellen Origin abgeleitet
export const authClient = createAuthClient();
