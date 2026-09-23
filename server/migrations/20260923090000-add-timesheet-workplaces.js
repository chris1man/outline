"use strict";

const { randomUUID } = require("node:crypto");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("timesheet_entries", "workplace", {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: "",
    });
    await queryInterface.createTable("timesheet_workplaces", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
      },
      name: { type: Sequelize.STRING(100), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("timesheet_workplaces", ["teamId", "name"], {
      unique: true,
      name: "timesheet_workplaces_team_name",
    });
    const [teams] = await queryInterface.sequelize.query("SELECT id FROM teams");
    const now = new Date();
    await queryInterface.bulkInsert(
      "timesheet_workplaces",
      teams.flatMap((team) => ["Комс", "Цех"].map((name) => ({
        id: randomUUID(),
        teamId: team.id,
        name,
        createdAt: now,
        updatedAt: now,
      })))
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("timesheet_workplaces");
    await queryInterface.removeColumn("timesheet_entries", "workplace");
  },
};
