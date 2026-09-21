"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("timesheet_entries", {
      id: { type: Sequelize.UUID, primaryKey: true, allowNull: false },
      teamId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      hours: { type: Sequelize.DECIMAL(4, 2), allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: false, defaultValue: "" },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(
      "timesheet_entries",
      ["teamId", "userId", "date"],
      { unique: true, name: "timesheet_entries_team_user_date" }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("timesheet_entries");
  },
};
