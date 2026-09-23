"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("timesheet_workplaces", "isDefault", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.sequelize.query(
      "UPDATE timesheet_workplaces SET \"isDefault\" = true WHERE name IN ('Комс', 'Цех')"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("timesheet_workplaces", "isDefault");
  },
};
