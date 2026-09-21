import { NotepadIcon } from "outline-icons";
import * as Scenes from "~/routes/scenes";
import { timesheetPath } from "~/utils/routeHelpers";
import SidebarLink from "./SidebarLink";

export const TimesheetLink = () => (
  <SidebarLink
    to={timesheetPath()}
    onClickIntent={Scenes.Timesheet.preload}
    icon={<NotepadIcon />}
    label="Табель"
  />
);
