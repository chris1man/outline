import { action, runInAction } from "mobx";
import TimesheetEntry from "~/models/TimesheetEntry";
import type RootStore from "./RootStore";
import Store from "./base/Store";
import { client } from "~/utils/ApiClient";

export default class TimesheetEntriesStore extends Store<TimesheetEntry> {
  apiEndpoint = "timesheet";

  constructor(rootStore: RootStore) {
    super(rootStore, TimesheetEntry);
  }

  @action
  async fetchMonth(month: string, options: { all?: boolean; userId?: string } = {}) {
    this.clear();
    this.isFetching = true;
    try {
      const response = await client.post("/timesheet.list", { month, ...options });
      return runInAction(() => response.data.map(this.add));
    } finally {
      runInAction(() => {
        this.isFetching = false;
      });
    }
  }

  @action
  async upsert(params: {
    id?: string;
    userId?: string;
    date: string;
    hours: number;
    comment: string;
  }) {
    this.isSaving = true;
    try {
      const response = await client.post("/timesheet.upsert", params);
      return runInAction(() => this.add(response.data));
    } finally {
      runInAction(() => {
        this.isSaving = false;
      });
    }
  }
}
