import { action, observable, runInAction } from "mobx";
import TimesheetEntry from "~/models/TimesheetEntry";
import type RootStore from "./RootStore";
import Store from "./base/Store";
import { client } from "~/utils/ApiClient";

export default class TimesheetEntriesStore extends Store<TimesheetEntry> {
  apiEndpoint = "timesheet";

  @observable workplaces: { id: string; name: string }[] = [];
  @observable employees: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    role: string;
  }[] = [];

  constructor(rootStore: RootStore) {
    super(rootStore, TimesheetEntry);
  }

  @action
  async fetchMonth(month: string, options: { all?: boolean; userId?: string } = {}) {
    this.clear();
    this.isFetching = true;
    try {
      const response = await client.post("/timesheet.list", { month, ...options });
      return runInAction(() => {
        this.workplaces = response.workplaces ?? [];
        this.employees = response.employees ?? [];
        return response.data.map(this.add);
      });
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
    workplace: string;
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

  @action
  async deleteWorkplace(id: string) {
    await client.post("/timesheet.workplace_delete", { id });
    runInAction(() => {
      this.workplaces = this.workplaces.filter((workplace) => workplace.id !== id);
    });
  }
}
