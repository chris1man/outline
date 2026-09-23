import { observable } from "mobx";
import type TimesheetEntriesStore from "~/stores/TimesheetEntriesStore";
import Model from "./base/Model";
import Field from "./decorators/Field";

class TimesheetEntry extends Model {
  static modelName = "TimesheetEntry";

  constructor(fields: Record<string, unknown>, store: TimesheetEntriesStore) {
    super(fields, store);
    this.initialize(fields);
  }

  store: TimesheetEntriesStore;

  @Field
  @observable
  date: string;

  @Field
  @observable
  hours: number;

  @Field
  @observable
  workplace: string;

  @Field
  @observable
  comment: string;
  @Field userId: string;
  @Field userName?: string;
  @Field userAvatarUrl?: string | null;
  @Field userRole?: string;
}

export default TimesheetEntry;
