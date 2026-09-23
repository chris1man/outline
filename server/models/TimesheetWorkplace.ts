import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, Default, ForeignKey, Table } from "sequelize-typescript";
import Team from "./Team";
import IdModel from "./base/IdModel";

@Table({ tableName: "timesheet_workplaces", modelName: "timesheetWorkplace" })
class TimesheetWorkplace extends IdModel<
  InferAttributes<TimesheetWorkplace>,
  Partial<InferCreationAttributes<TimesheetWorkplace>>
> {
  @Column(DataType.STRING(100))
  name: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;
}

export default TimesheetWorkplace;
