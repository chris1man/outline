import { TimesheetEntry, TimesheetWorkplace } from "@server/models";
import {
  buildAdmin,
  buildGuestUser,
  buildUser,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("timesheet access", () => {
  it("allows an employee to create their own entry", async () => {
    const user = await buildUser();

    const response = await server.post("/api/timesheet.upsert", user, {
      body: {
        date: "2026-09-01",
        hours: 8,
        workplace: "Комс",
        comment: "Работа",
      },
    });

    expect(response.status).toEqual(200);
    expect(
      await TimesheetWorkplace.count({
        where: { teamId: user.teamId, name: "Комс" },
      })
    ).toEqual(1);
  });

  it("does not allow an employee to list another employee's entries", async () => {
    const user = await buildUser();
    const anotherUser = await buildUser({ teamId: user.teamId });
    await TimesheetEntry.create({
      teamId: user.teamId,
      userId: anotherUser.id,
      date: "2026-09-01",
      hours: 8,
      comment: "Работа",
    });

    const response = await server.post("/api/timesheet.list", user, {
      body: { month: "2026-09", userId: anotherUser.id },
    });

    expect(response.status).toEqual(403);
  });

  it("does not allow an employee to update another employee's entry", async () => {
    const user = await buildUser();
    const anotherUser = await buildUser({ teamId: user.teamId });
    const entry = await TimesheetEntry.create({
      teamId: user.teamId,
      userId: anotherUser.id,
      date: "2026-09-01",
      hours: 8,
      comment: "Работа",
    });

    const response = await server.post("/api/timesheet.upsert", user, {
      body: { id: entry.id, date: "2026-09-01", hours: 4, comment: "Нет" },
    });

    expect(response.status).toEqual(403);
  });

  it("does not allow an employee to create an entry for another employee", async () => {
    const user = await buildUser();
    const anotherUser = await buildUser({ teamId: user.teamId });

    const response = await server.post("/api/timesheet.upsert", user, {
      body: {
        userId: anotherUser.id,
        date: "2026-09-01",
        hours: 8,
        comment: "Работа",
      },
    });

    expect(response.status).toEqual(403);
  });

  it("allows an admin to update an employee's entry", async () => {
    const admin = await buildAdmin();
    const employee = await buildUser({ teamId: admin.teamId });
    const entry = await TimesheetEntry.create({
      teamId: admin.teamId,
      userId: employee.id,
      date: "2026-09-01",
      hours: 8,
      comment: "Работа",
    });

    const response = await server.post("/api/timesheet.upsert", admin, {
      body: { id: entry.id, userId: employee.id, date: entry.date, hours: 6, comment: "Исправлено" },
    });

    expect(response.status).toEqual(200);
    expect(Number((await entry.reload()).hours)).toEqual(6);
  });

  it.each([buildGuestUser, buildViewer])("does not allow guests and viewers", async (build) => {
    const user = await build();
    const response = await server.post("/api/timesheet.list", user, {
      body: { month: "2026-09" },
    });
    expect(response.status).toEqual(403);
  });

  it("does not allow an employee to remove a shared workplace", async () => {
    const user = await buildUser();
    const workplace = await TimesheetWorkplace.create({
      teamId: user.teamId,
      name: "Комс",
    });

    const response = await server.post("/api/timesheet.workplace_delete", user, {
      body: { id: workplace.id },
    });

    expect(response.status).toEqual(403);
  });
});
