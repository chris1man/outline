import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import * as Scenes from "~/routes/scenes";
import { personalPath } from "~/utils/routeHelpers";
import SidebarLink from "./SidebarLink";

export const PersonalLink = observer(() => {
  const { t } = useTranslation();

  return (
    <SidebarLink
      to={personalPath()}
      onClickIntent={Scenes.Personal.preload}
      icon={<DraftsIcon />}
      label={t("Personal")}
    />
  );
});
