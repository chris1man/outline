import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";

function Drafts() {
  const { t } = useTranslation();
  const { documents } = useStores();
  return (
    <Scene
      icon={<DraftsIcon />}
      title={t("Personal")}
      left={
        <InputSearchPage source="personal" label={t("Search documents")} />
      }
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <Heading>{t("Personal")}</Heading>
      <Subheading sticky>{t("Documents")}</Subheading>

      <PaginatedDocumentList
        empty={
          <Empty>
            {t("You haven’t created any personal documents yet.")}
          </Empty>
        }
        fetch={documents.fetchPersonal}
        documents={documents.personal}
        showParentDocuments
      />
    </Scene>
  );
}

export default observer(Drafts);
