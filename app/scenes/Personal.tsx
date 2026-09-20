import { observer } from "mobx-react";
import { AttachmentIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import { Tab, Tabs } from "~/components/Tabs";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import { personalPath } from "~/utils/routeHelpers";
import PersonalFiles from "./PersonalFiles";

function Personal() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const { search } = useLocation();
  const files = new URLSearchParams(search).get("tab") === "files";

  return (
    <Scene
      icon={<AttachmentIcon />}
      title="Личное"
      left={<InputSearchPage source="personal" label={t("Search documents")} />}
      actions={!files && <Action><NewDocumentMenu personal /></Action>}
    >
      <Heading>Личное</Heading>
      <Tabs>
        <Tab to={personalPath()} exactQueryString>Документы</Tab>
        <Tab
          to={{ pathname: personalPath(), search: "?tab=files" }}
          exactQueryString
        >
          Файлы
        </Tab>
      </Tabs>
      {files ? (
        <PersonalFiles />
      ) : (
        <>
          <Subheading sticky>{t("Documents")}</Subheading>
          <PaginatedDocumentList
            empty={
              <Empty>{t("You haven’t created any personal documents yet.")}</Empty>
            }
            fetch={documents.fetchPersonal}
            documents={documents.personal}
            showParentDocuments
          />
        </>
      )}
    </Scene>
  );
}

export default observer(Personal);
