"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("attachments", "isPersonal", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("attachments", "isFolder", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("attachments", "parentAttachmentId", {
      type: Sequelize.UUID,
      allowNull: true,
    });
    await queryInterface.addIndex("attachments", [
      "teamId",
      "userId",
      "isPersonal",
      "parentAttachmentId",
    ]);
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("attachments", [
      "teamId",
      "userId",
      "isPersonal",
      "parentAttachmentId",
    ]);
    await queryInterface.removeColumn("attachments", "parentAttachmentId");
    await queryInterface.removeColumn("attachments", "isFolder");
    await queryInterface.removeColumn("attachments", "isPersonal");
  },
};
