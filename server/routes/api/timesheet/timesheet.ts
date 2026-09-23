import Router from "koa-router";
import { Op, Transaction } from "sequelize";
import { UserRole } from "@shared/types";
import { AuthorizationError, ValidationError } from "@server/errors";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import validate from "@server/middlewares/validate";
import { TimesheetEntry, TimesheetWorkplace, User } from "@server/models";
import { authorize } from "@server/policies";
import { presentPolicies } from "@server/presenters";
import presentTimesheetEntry from "@server/presenters/timesheetEntry";
import type { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();

const monthRange = (month: string) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  return { start, end };
};

const targetUserId = (user: User, requestedUserId?: string) => {
  if (requestedUserId && requestedUserId !== user.id && !user.isAdmin) {
    throw AuthorizationError();
  }
  return requestedUserId ?? user.id;
};

router.post(
  "timesheet.list",
  auth(),
  validate(T.TimesheetListSchema),
  async (ctx: APIContext<T.TimesheetListReq>) => {
    const { user } = ctx.state.auth;
    authorize(user, "accessTimesheet", user.team);
    const { all, userId: requestedUserId } = ctx.input.body;
    if (all && !user.isAdmin) {
      throw AuthorizationError();
    }
    const userId = all ? requestedUserId : targetUserId(user, requestedUserId);
    const { start, end } = monthRange(ctx.input.body.month);
    const defaultWorkplaces = await Promise.all(
      ["Комс", "Цех"].map((name) =>
        TimesheetWorkplace.findOrCreate({
          where: { teamId: user.teamId, name },
          defaults: { teamId: user.teamId, name, isDefault: true },
        })
      )
    );
    await Promise.all(
      defaultWorkplaces
        .map(([workplace]) => workplace)
        .filter((workplace) => !workplace.isDefault)
        .map((workplace) => workplace.update({ isDefault: true }))
    );
    const [entries, workplaces, employees] = await Promise.all([
      TimesheetEntry.findAll({
      where: {
        teamId: user.teamId,
        ...(userId ? { userId } : {}),
        date: { [Op.gte]: start, [Op.lt]: end },
      },
      include: [{ model: User, as: "user", paranoid: false }],
      order: [["date", "DESC"]],
      }),
      TimesheetWorkplace.findAll({
        where: { teamId: user.teamId },
        attributes: ["id", "name", "isDefault"],
        order: [["name", "ASC"]],
      }),
      user.isAdmin
        ? User.findAll({
            where: {
              teamId: user.teamId,
              role: { [Op.in]: [UserRole.Admin, UserRole.Member] },
            },
            attributes: ["id", "name", "avatarUrl", "role"],
            order: [["name", "ASC"]],
          })
        : Promise.resolve([]),
    ]);
    ctx.body = {
      data: entries.map(presentTimesheetEntry),
      policies: presentPolicies(user, entries),
      workplaces: workplaces.map((workplace) => ({
        id: workplace.id,
        name: workplace.name,
        isDefault: workplace.isDefault,
      })),
      employees: employees.map((employee) => ({
        id: employee.id,
        name: employee.name,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
      })),
    };
  }
);

router.post(
  "timesheet.upsert",
  auth(),
  validate(T.TimesheetUpsertSchema),
  transaction(),
  async (ctx: APIContext<T.TimesheetUpsertReq>) => {
    const { user } = ctx.state.auth;
    const { id, date, hours, comment, workplace } = ctx.input.body;
    const { transaction: dbTransaction } = ctx.state;
    authorize(user, "accessTimesheet", user.team);
    if (workplace) {
      await TimesheetWorkplace.findOrCreate({
        where: { teamId: user.teamId, name: workplace },
        defaults: { teamId: user.teamId, name: workplace },
        transaction: dbTransaction,
      });
    }

    let entry = id
      ? await TimesheetEntry.findByPk(id, { transaction: dbTransaction, lock: Transaction.LOCK.UPDATE })
      : undefined;
    let created = false;
    if (entry) {
      authorize(user, "update", entry);
    } else {
      const userId = targetUserId(user, ctx.input.body.userId);
      if (userId !== user.id) {
        const target = await User.findOne({ where: { id: userId, teamId: user.teamId }, transaction: dbTransaction });
        if (!target) throw AuthorizationError();
      }
      entry = await TimesheetEntry.findOne({
        where: { teamId: user.teamId, userId, date },
        transaction: dbTransaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (entry) authorize(user, "update", entry);
      else {
        entry = await TimesheetEntry.createWithCtx(ctx, {
          teamId: user.teamId,
          userId,
          date,
          hours,
          workplace,
          comment,
        });
        created = true;
      }
    }

    if (entry.userId !== targetUserId(user, ctx.input.body.userId) && ctx.input.body.userId) {
      throw ValidationError("userId cannot be changed");
    }
    if (!created) {
      await entry.updateWithCtx(ctx, { date, hours, workplace, comment });
    }
    await entry.reload({
      include: [{ model: User, as: "user", paranoid: false }],
      transaction: dbTransaction,
    });
    ctx.body = { data: presentTimesheetEntry(entry), policies: presentPolicies(user, [entry]) };
  }
);

router.post(
  "timesheet.delete",
  auth(),
  validate(T.TimesheetDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.TimesheetDeleteReq>) => {
    const { user } = ctx.state.auth;
    authorize(user, "accessTimesheet", user.team);
    const entry = await TimesheetEntry.findByPk(ctx.input.body.id, { transaction: ctx.state.transaction, rejectOnEmpty: true });
    authorize(user, "delete", entry);
    await entry.destroyWithCtx(ctx);
    ctx.body = { success: true };
  }
);

router.post(
  "timesheet.workplace_delete",
  auth(),
  validate(T.TimesheetWorkplaceDeleteSchema),
  transaction(),
  async (ctx: APIContext<T.TimesheetWorkplaceDeleteReq>) => {
    const { user } = ctx.state.auth;
    authorize(user, "accessTimesheet", user.team);
    if (!user.isAdmin) {
      throw AuthorizationError();
    }
    const workplace = await TimesheetWorkplace.findOne({
      where: { id: ctx.input.body.id, teamId: user.teamId },
      transaction: ctx.state.transaction,
      rejectOnEmpty: true,
    });
    if (workplace.isDefault) {
      throw ValidationError("Default workplaces cannot be deleted");
    }
    await workplace.destroy({ transaction: ctx.state.transaction });
    ctx.body = { success: true };
  }
);

export default router;
