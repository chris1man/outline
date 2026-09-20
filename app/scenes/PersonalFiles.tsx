import { CollectionIcon, PlusIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { toast } from "sonner";
import styled from "styled-components";
import FileExtension from "@shared/editor/components/FileExtension";
import { AttachmentPreset } from "@shared/types";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import { client } from "~/utils/ApiClient";
import { uploadFile } from "~/utils/files";

type PersonalFile = {
  id: string;
  name: string;
  size: number;
  url: string;
  isFolder: boolean;
  createdAt: string;
};

type Folder = Pick<PersonalFile, "id" | "name">;

export default function PersonalFiles() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<PersonalFile[]>([]);
  const [folders, setFolders] = React.useState<Folder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const parentId = folders.at(-1)?.id ?? null;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.post("/attachments.list", {
        personal: true,
        parentId,
      });
      setFiles(response.data);
    } catch {
      toast.error("Не удалось загрузить файлы");
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploads = Array.from(event.target.files ?? []);
    if (!uploads.length) {
      return;
    }

    try {
      await Promise.all(
        uploads.map((file) =>
          uploadFile(file, {
            personal: true,
            parentId,
            preset: AttachmentPreset.DocumentAttachment,
          })
        )
      );
      await load();
    } catch {
      toast.error("Не удалось загрузить файл");
    } finally {
      event.target.value = "";
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt("Название папки");
    if (!name?.trim()) {
      return;
    }

    try {
      await client.post("/attachments.createFolder", {
        name: name.trim(),
        parentId,
      });
      await load();
    } catch {
      toast.error("Не удалось создать папку");
    }
  };

  const handleDelete = async (file: PersonalFile) => {
    if (
      !window.confirm(
        `Удалить ${file.isFolder ? "папку" : "файл"} «${file.name}»?`
      )
    ) {
      return;
    }

    try {
      await client.post("/attachments.delete", { id: file.id });
      await load();
    } catch {
      toast.error("Не удалось удалить");
    }
  };

  return (
    <>
      <Actions gap={8} justify="end">
        <input ref={inputRef} type="file" multiple onChange={handleUpload} />
        <Button icon={<PlusIcon />} neutral onClick={handleCreateFolder}>
          Папка
        </Button>
        <Button onClick={() => inputRef.current?.click()}>Загрузить</Button>
      </Actions>
      {folders.length > 0 && (
        <Breadcrumb>
          <button type="button" onClick={() => setFolders([])}>Файлы</button>
          {folders.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <span>/</span>
              <button
                type="button"
                onClick={() => setFolders(folders.slice(0, index + 1))}
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
        </Breadcrumb>
      )}
      {!loading && files.length === 0 ? (
        <Empty>В этой папке пока нет файлов</Empty>
      ) : (
        <List>
          {files.map((file) => (
            <Row key={file.id}>
              <FileButton
                type="button"
                onClick={() =>
                  file.isFolder
                    ? setFolders([...folders, file])
                    : window.open(file.url, "_blank", "noopener")
                }
              >
                {file.isFolder ? (
                  <CollectionIcon size={28} />
                ) : (
                  <FileExtension title={file.name} />
                )}
                <span>{file.name}</span>
              </FileButton>
              <Meta>{file.isFolder ? "Папка" : formatSize(file.size)}</Meta>
              <Button
                icon={<TrashIcon />}
                neutral
                aria-label="Удалить"
                onClick={() => handleDelete(file)}
              />
            </Row>
          ))}
        </List>
      )}
    </>
  );
}

const formatSize = (size: number) =>
  size < 1024 * 1024
    ? `${Math.ceil(size / 1024)} КБ`
    : `${(size / 1024 / 1024).toFixed(1)} МБ`;

const Actions = styled(Flex)`
  margin: 12px 0 20px;

  input {
    display: none;
  }
`;

const Breadcrumb = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  color: ${(props) => props.theme.textSecondary};

  button {
    border: 0;
    padding: 0;
    color: inherit;
    background: none;
    cursor: var(--pointer);
  }
`;

const List = styled.div`
  border-top: 1px solid ${(props) => props.theme.divider};
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 90px 32px;
  align-items: center;
  min-height: 52px;
  border-bottom: 1px solid ${(props) => props.theme.divider};
`;

const FileButton = styled.button`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  border: 0;
  padding: 8px 0;
  color: ${(props) => props.theme.text};
  background: none;
  text-align: left;
  cursor: var(--pointer);

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Meta = styled.span`
  color: ${(props) => props.theme.textTertiary};
  font-size: 13px;
  text-align: right;
`;
