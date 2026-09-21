import { EditIcon, NotepadIcon, TrashIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import styled from "styled-components";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import Table, { type Column as TableColumn } from "~/components/Table";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import type TimesheetEntry from "~/models/TimesheetEntry";

type Form = {
  id?: string;
  userId?: string;
  date: string;
  hours: string;
  comment: string;
};

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};
const currentMonth = () => localDate().slice(0, 7);
const initialForm = (): Form => ({ date: localDate(), hours: "8", comment: "" });
const formatMonth = (month: string) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(
    new Date(`${month}-01T12:00:00`)
  );
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));

function Timesheet() {
  const user = useCurrentUser();
  const { timesheetEntries } = useStores();
  const [month, setMonth] = React.useState(currentMonth);
  const [all, setAll] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState<string>();
  const [form, setForm] = React.useState<Form>(initialForm);

  React.useEffect(() => {
    void timesheetEntries.fetchMonth(month, all ? { all: true } : {});
  }, [all, month, timesheetEntries]);

  const allEntries = timesheetEntries.orderedData;
  const entries = all && employeeId
    ? allEntries.filter((entry) => entry.userId === employeeId)
    : allEntries;
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const employees = Array.from(
    new Map(allEntries.map((entry) => [entry.userId, entry.userName ?? entry.userId])).entries()
  );
  const totals = entries.reduce<Record<string, { name: string; hours: number }>>(
    (result, entry) => {
      const item = result[entry.userId] ?? {
        name: entry.userName ?? entry.userId,
        hours: 0,
      };
      item.hours += Number(entry.hours);
      result[entry.userId] = item;
      return result;
    },
    {}
  );

  const save = async () => {
    try {
      await timesheetEntries.upsert({
        id: form.id,
        userId: form.userId,
        date: form.date,
        hours: Number(form.hours),
        comment: form.comment,
      });
      toast.success("Запись сохранена");
      setForm({
        ...initialForm(),
        date: month === currentMonth() ? localDate() : `${month}-01`,
      });
    } catch {
      toast.error("Не удалось сохранить запись");
    }
  };

  const edit = (entry: TimesheetEntry) =>
    setForm({
      id: entry.id,
      userId: entry.userId,
      date: entry.date,
      hours: String(entry.hours),
      comment: entry.comment,
    });

  const remove = async (entry: TimesheetEntry) => {
    if (!window.confirm("Удалить запись?")) {
      return;
    }
    try {
      await entry.delete();
    } catch {
      toast.error("Не удалось удалить запись");
    }
  };

  const columns = React.useMemo<TableColumn<TimesheetEntry>[]>(
    () => [
      ...(all
        ? [
            {
              id: "user",
              header: "Сотрудник",
              accessor: (entry: TimesheetEntry) => entry.userName ?? "",
              component: (entry: TimesheetEntry) => entry.userName ?? "—",
              width: "180px",
            } as TableColumn<TimesheetEntry>,
          ]
        : []),
      {
        id: "date",
        header: "Дата",
        accessor: (entry) => entry.date,
        component: (entry) => formatDate(entry.date),
        width: "180px",
      },
      {
        id: "hours",
        header: "Часы",
        accessor: (entry) => entry.hours,
        component: (entry) => `${entry.hours} ч`,
        width: "100px",
      },
      {
        id: "comment",
        header: "Комментарий",
        accessor: (entry) => entry.comment,
        component: (entry) => entry.comment || "—",
        width: "minmax(180px, 1fr)",
      },
      {
        id: "actions",
        type: "action",
        component: (entry) => (
          <Actions>
            <Button icon={<EditIcon />} neutral aria-label="Изменить" onClick={() => edit(entry)} />
            <Button icon={<TrashIcon />} neutral aria-label="Удалить" onClick={() => void remove(entry)} />
          </Actions>
        ),
        width: "72px",
      },
    ],
    [all]
  );

  return (
    <Scene icon={<NotepadIcon />} title="Табель" wide>
      <Heading>Табель</Heading>
      {user.isAdmin && (
        <Tabs>
          <Tab active={!all} onClick={() => { setAll(false); setEmployeeId(undefined); }}>
            Мои часы
          </Tab>
          <Tab active={all} onClick={() => setAll(true)}>Все сотрудники</Tab>
        </Tabs>
      )}
      <MonthNavigation month={month} onChange={setMonth} />
      {all ? (
        <>
          <AdminControls>
            <select value={employeeId ?? ""} onChange={(event) => setEmployeeId(event.target.value || undefined)}>
              <option value="">Все сотрудники</option>
              {employees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <strong>Всего: {total.toFixed(2)} ч</strong>
          </AdminControls>
          <Totals>{Object.entries(totals).map(([id, value]) => <span key={id}>{value.name}: <b>{value.hours.toFixed(2)} ч</b></span>)}</Totals>
          {form.id && <EntryForm form={form} setForm={setForm} onSave={save} />}
          {!timesheetEntries.isFetching && entries.length === 0 ? <Empty>За этот месяц записей нет</Empty> : <Table data={entries} columns={columns} sort={{ id: "date", desc: true }} onChangeSort={() => undefined} loading={timesheetEntries.isFetching} page={{ hasNext: false }} rowHeight={52} />}
        </>
      ) : (
        <>
          <EntryForm form={form} setForm={setForm} onSave={save} />
          <HistoryTitle>История за месяц <span>{total.toFixed(2)} ч</span></HistoryTitle>
          {!timesheetEntries.isFetching && entries.length === 0 ? <Empty>За этот месяц записей нет</Empty> : (
            <History>
              {entries.map((entry) => (
                <HistoryRow key={entry.id}>
                  <DateCell>{formatDate(entry.date)}</DateCell>
                  <Hours>{entry.hours} ч</Hours>
                  <Comment>{entry.comment || "Без комментария"}</Comment>
                  <Actions>
                    <Button icon={<EditIcon />} neutral aria-label="Изменить" onClick={() => edit(entry)} />
                    <Button icon={<TrashIcon />} neutral aria-label="Удалить" onClick={() => void remove(entry)} />
                  </Actions>
                </HistoryRow>
              ))}
            </History>
          )}
        </>
      )}
    </Scene>
  );
}

function MonthNavigation({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <Months>
      <button onClick={() => onChange(shiftMonth(month, -1))}>{formatMonth(shiftMonth(month, -1))}</button>
      <MonthCurrent>{formatMonth(month)}</MonthCurrent>
      <button onClick={() => onChange(shiftMonth(month, 1))}>{formatMonth(shiftMonth(month, 1))}</button>
    </Months>
  );
}

function EntryForm({ form, setForm, onSave }: { form: Form; setForm: React.Dispatch<React.SetStateAction<Form>>; onSave: () => Promise<void> }) {
  return (
    <EntryCard>
      <DateInput>
        <span>{formatDate(form.date)}</span>
        <input type="date" value={form.date} aria-label="Дата" onChange={(event) => setForm({ ...form, date: event.target.value })} />
      </DateInput>
      <HoursInput>
        <label htmlFor="timesheet-hours">Часы</label>
        <input id="timesheet-hours" type="number" min="0" max="24" step="0.25" inputMode="decimal" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
      </HoursInput>
      <CommentInput value={form.comment} placeholder="Добавить комментарий" onChange={(event) => setForm({ ...form, comment: event.target.value })} />
      <Button onClick={() => void onSave()}>{form.id ? "Сохранить" : "Добавить часы"}</Button>
    </EntryCard>
  );
}

const shiftMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return date.toISOString().slice(0, 7);
};

const Months = styled.nav`
  display: flex; align-items: center; justify-content: center; gap: 16px; margin: 22px 0;
  button { border: 0; background: none; color: ${(props) => props.theme.textTertiary}; cursor: var(--pointer); filter: blur(.4px); font-size: 14px; opacity: .7; text-transform: capitalize; }
`;
const MonthCurrent = styled.strong`
  min-width: 145px; text-align: center; font-size: 18px; text-transform: capitalize;
`;
const EntryCard = styled.section`
  display: grid; grid-template-columns: auto minmax(112px, 160px) minmax(160px, 1fr) auto; align-items: end; gap: 12px; padding: 16px; border: 1px solid ${(props) => props.theme.inputBorder}; border-radius: 10px; background: ${(props) => props.theme.backgroundSecondary};
  @media (max-width: 700px) { grid-template-columns: 1fr 1fr; > :nth-child(3) { grid-column: 1 / -1; } }
`;
const DateInput = styled.label`
  display: grid; gap: 3px; font-size: 14px; font-weight: 500; text-transform: capitalize;
  input { width: 126px; border: 0; background: transparent; color: ${(props) => props.theme.textSecondary}; font-size: 12px; }
`;
const HoursInput = styled.div`
  display: grid; gap: 3px; color: ${(props) => props.theme.textTertiary}; font-size: 12px;
  input { width: 100%; border: 0; border-bottom: 2px solid ${(props) => props.theme.accent}; border-radius: 0; background: transparent; color: ${(props) => props.theme.text}; font-size: 28px; font-weight: 600; line-height: 1.15; outline: none; }
`;
const CommentInput = styled.input`
  width: 100%; border: 0; border-bottom: 1px solid ${(props) => props.theme.inputBorder}; background: transparent; color: ${(props) => props.theme.text}; font-size: 13px; outline: none; padding: 8px 0;
  &::placeholder { color: ${(props) => props.theme.textTertiary}; }
`;
const HistoryTitle = styled.h2`
  display: flex; justify-content: space-between; margin: 28px 0 8px; font-size: 14px;
  span { color: ${(props) => props.theme.textSecondary}; font-weight: 500; }
`;
const History = styled.div`border-top: 1px solid ${(props) => props.theme.inputBorder};`;
const HistoryRow = styled.div`
  display: grid; grid-template-columns: 145px 72px minmax(0, 1fr) 70px; align-items: center; gap: 12px; min-height: 48px; border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  @media (max-width: 700px) { grid-template-columns: 1fr auto 58px; > :nth-child(3) { display: none; } }
`;
const DateCell = styled.span`font-size: 13px; text-transform: capitalize;`;
const Hours = styled.strong`font-size: 13px;`;
const Comment = styled.span`overflow: hidden; color: ${(props) => props.theme.textSecondary}; font-size: 13px; text-overflow: ellipsis; white-space: nowrap;`;
const Actions = styled.span`display: flex; gap: 2px;`;
const AdminControls = styled.div`
  display: flex; align-items: center; gap: 12px; margin-bottom: 14px;
  select { height: 32px; border: 1px solid ${(props) => props.theme.inputBorder}; border-radius: 6px; padding: 0 8px; }
  strong { margin-left: auto; }
`;
const Totals = styled.div`display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; color: ${(props) => props.theme.textSecondary}; font-size: 13px;`;

export default observer(Timesheet);
