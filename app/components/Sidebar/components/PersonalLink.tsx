import { observer } from "mobx-react";
import { AttachmentIcon } from "outline-icons";
import * as Scenes from "~/routes/scenes";
import { personalPath } from "~/utils/routeHelpers";
import SidebarLink from "./SidebarLink";

export const PersonalLink = observer(() => {
  return (
    <SidebarLink
      to={personalPath()}
      onClickIntent={Scenes.Personal.preload}
      icon={<AttachmentIcon />}
      label="Личное"
    />
  );
});
