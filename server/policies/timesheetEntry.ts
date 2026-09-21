import { TimesheetEntry, Team, User } from "@server/models";
import { allow } from "./cancan";
import { and, isTeamModel, or } from "./utils";

allow(User, "accessTimesheet", Team, (actor, team) =>
  and(isTeamModel(actor, team), !actor.isGuest, !actor.isViewer)
);

allow(User, ["read", "update", "delete"], TimesheetEntry, (actor, entry) =>
  and(
    isTeamModel(actor, entry),
    !actor.isGuest,
    !actor.isViewer,
    or(actor.isAdmin, actor.id === entry?.userId)
  )
);
