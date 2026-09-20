"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("attachments");
    if (!columns.isPersonal) {
      await queryInterface.addColumn("attachments", "isPersonal", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!columns.isFolder) {
      await queryInterface.addColumn("attachments", "isFolder", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!columns.parentAttachmentId) {
      await queryInterface.addColumn("attachments", "parentAttachmentId", {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }
    const indexName = "attachments_personal_files_index";
    const indexes = await queryInterface.showIndex("attachments");
    if (!indexes.some((index) => index.name === indexName)) {
      await queryInterface.addIndex(
        "attachments",
        ["teamId", "userId", "isPersonal", "parentAttachmentId"],
        { name: indexName }
      );
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable("attachments");
    const indexes = await queryInterface.showIndex("attachments");
    if (indexes.some((index) => index.name === "attachments_personal_files_index")) {
      await queryInterface.removeIndex(
        "attachments",
        "attachments_personal_files_index"
      );
    }
    if (columns.parentAttachmentId) {
      await queryInterface.removeColumn("attachments", "parentAttachmentId");
    }
    if (columns.isFolder) {
      await queryInterface.removeColumn("attachments", "isFolder");
    }
    if (columns.isPersonal) {
      await queryInterface.removeColumn("attachments", "isPersonal");
    }
  },
};
