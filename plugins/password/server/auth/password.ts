import Router from "koa-router";
import { Client } from "@shared/types";
import { AuthorizationError } from "@server/errors";
import { rateLimiter } from "@server/middlewares/rateLimiter";
import validate from "@server/middlewares/validate";
import { User } from "@server/models";
import type { APIContext } from "@server/types";
import { signIn } from "@server/utils/authentication";
import { RateLimiterStrategy } from "@server/utils/RateLimiter";
import { getTeamFromContext } from "@server/utils/passport";
import { verifyPassword } from "@server/utils/password";
import * as T from "./schema";

const router = new Router();

router.post(
  "password",
  rateLimiter(RateLimiterStrategy.FivePerMinute),
  validate(T.PasswordSchema),
  async (ctx: APIContext<T.PasswordReq>) => {
    const { email, password, client = Client.Web } = ctx.input.body;
    const team = await getTeamFromContext(ctx);
    const user = team
      ? await User.scope("withTeam").findOne({
          where: { teamId: team.id, email: email.trim().toLowerCase() },
        })
      : null;
    const passwordMatches = await verifyPassword(
      password,
      user?.passwordDigest ?? null
    );

    if (!user || !passwordMatches) {
      throw AuthorizationError("Invalid email or password");
    }

    await signIn(ctx, "password", {
      user,
      team: user.team,
      isNewUser: false,
      isNewTeam: false,
      client,
    });
  }
);

export default router;
