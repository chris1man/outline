import { UserRole } from "@shared/types";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import { Team, User } from "@server/models";
import { hashPassword } from "@server/utils/password";

/**
 * Creates the first workspace administrator when initial credentials are set.
 *
 * @returns A promise that resolves when bootstrapping is complete.
 */
export default async function bootstrapAdmin(): Promise<void> {
  const { INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, INITIAL_TEAM_NAME } = env;

  if (!INITIAL_ADMIN_EMAIL && !INITIAL_ADMIN_PASSWORD) {
    return;
  }
  if (!INITIAL_ADMIN_EMAIL || !INITIAL_ADMIN_PASSWORD) {
    throw new Error(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set together"
    );
  }
  if (INITIAL_ADMIN_PASSWORD.length < 12) {
    throw new Error("INITIAL_ADMIN_PASSWORD must be at least 12 characters");
  }

  let team = await Team.findOne();
  if (!team) {
    team = await Team.create({
      name: INITIAL_TEAM_NAME ?? "Outline",
      subdomain: "outline",
    });
  }

  const email = INITIAL_ADMIN_EMAIL.toLowerCase();
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    if (existingUser.passwordDigest) {
      return;
    }

    existingUser.passwordDigest = await hashPassword(INITIAL_ADMIN_PASSWORD);
    existingUser.role = UserRole.Admin;
    await existingUser.save();
    Logger.info("authentication", "Set password for initial local administrator");
    return;
  }

  await User.create({
    email,
    name: "Administrator",
    role: UserRole.Admin,
    teamId: team.id,
    passwordDigest: await hashPassword(INITIAL_ADMIN_PASSWORD),
  });

  Logger.info("authentication", "Created initial local administrator");
}
