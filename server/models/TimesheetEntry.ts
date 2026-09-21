import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { BelongsTo, Column, DataType, ForeignKey, Table } from "sequelize-typescript";
import Team from "./Team";
import User from "./User";
import IdModel from "./base/IdModel";

@Table({ tableName: "timesheet_entries", modelName: "timesheetEntry" })
class TimesheetEntry extends IdModel<
  InferAttributes<TimesheetEntry>,
  Partial<InferCreationAttributes<TimesheetEntry>>
> {
  @Column(DataType.DATEONLY)
  date: string;

  @Column(DataType.DECIMAL(4, 2))
  hours: number;

  @Column(DataType.TEXT)
  comment: string;

  @BelongsTo(() => Team, "teamId")
  team: Team;

  @ForeignKey(() => Team)
  @Column(DataType.UUID)
  teamId: string;

  @BelongsTo(() => User, "userId")
  user: User;

  @ForeignKey(() => User)
  @Column(DataType.UUID)
  userId: string;
}

export default TimesheetEntry;
