import * as React from "react";
import { NotepadIcon, EditIcon, TrashIcon } from "outline-icons";
import { observer } from "mobx-react";
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

type Form = { id?: string; userId?: string; date: string; hours: string; comment: string };
const currentMonth = () => new Date().toISOString().slice(0, 7);
const initialForm = (): Form => ({ date: new Date().toISOString().slice(0, 10), hours: "8", comment: "" });

function Timesheet() {
  const user = useCurrentUser();
  const { timesheetEntries } = useStores();
  const [month, setMonth] = React.useState(currentMonth);
  const [all, setAll] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState<string>();
  const [form, setForm] = React.useState<Form>(initialForm);

  React.useEffect(() => {
    void timesheetEntries.fetchMonth(month, all ? { all: true } : {});
  }, [timesheetEntries, month, all]);

  const allEntries = timesheetEntries.orderedData;
  const entries = all && employeeId
    ? allEntries.filter((entry) => entry.userId === employeeId)
    : allEntries;
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const employees = Array.from(new Map(allEntries.map((entry) => [entry.userId, entry.userName ?? entry.userId])).entries());
  const totals = entries.reduce<Record<string, { name: string; hours: number }>>((result, entry) => {
    const item = result[entry.userId] ?? { name: entry.userName ?? entry.userId, hours: 0 };
    item.hours += Number(entry.hours);
    result[entry.userId] = item;
    return result;
  }, {});

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
      setForm(initialForm());
    } catch {
      toast.error("Не удалось сохранить запись");
    }
  };

  const edit = (entry: TimesheetEntry) => setForm({
    id: entry.id,
    userId: entry.userId,
    date: entry.date,
    hours: String(entry.hours),
    comment: entry.comment,
  });

  const remove = async (entry: TimesheetEntry) => {
    if (!window.confirm("Удалить запись?")) return;
    try {
      await entry.delete();
    } catch {
      toast.error("Не удалось удалить запись");
    }
  };

  const columns = React.useMemo<TableColumn<TimesheetEntry>[]>(() => {
    const base: TableColumn<TimesheetEntry>[] = [
      ...(all ? [{ id: "user", header: "Сотрудник", accessor: (entry: TimesheetEntry) => entry.userName ?? "", component: (entry: TimesheetEntry) => entry.userName ?? "—", width: "180px" } as TableColumn<TimesheetEntry>] : []),
      { id: "date", header: "Дата", accessor: (entry) => entry.date, component: (entry) => entry.date, width: "140px" },
      { id: "hours", header: "Часы", accessor: (entry) => entry.hours, component: (entry) => `${entry.hours} ч`, width: "100px" },
      { id: "comment", header: "Комментарий", accessor: (entry) => entry.comment, component: (entry) => entry.comment || "—", width: "minmax(180px, 1fr)" },
      { id: "actions", type: "action", component: (entry) => <Actions><Button icon={<EditIcon />} neutral aria-label="Изменить" onClick={() => edit(entry)} /><Button icon={<TrashIcon />} neutral aria-label="Удалить" onClick={() => void remove(entry)} /></Actions>, width: "72px" },
    ];
    return base;
  }, [all]);

  return (
    <Scene icon={<NotepadIcon />} title="Табель" wide>
      <Heading>Табель</Heading>
      {user.isAdmin && <Tabs><Tab active={!all} onClick={() => { setAll(false); setEmployeeId(undefined); }}>Мои часы</Tab><Tab active={all} onClick={() => setAll(true)}>Все сотрудники</Tab></Tabs>}
      <Controls>
        <Button neutral onClick={() => setMonth(shiftMonth(month, -1))}>←</Button>
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        <Button neutral onClick={() => setMonth(shiftMonth(month, 1))}>→</Button>
        {all && <select value={employeeId ?? ""} onChange={(event) => setEmployeeId(event.target.value || undefined)}><option value="">Все сотрудники</option>{employees.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>}
        <strong>{all ? "Всего" : "Мои часы"}: {total.toFixed(2)} ч</strong>
      </Controls>
      {all && <Totals>{Object.entries(totals).map(([id, value]) => <span key={id}>{value.name}: <b>{value.hours.toFixed(2)} ч</b></span>)}</Totals>}
      {!all && <FormRow>
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <input type="number" min="0" max="24" step="0.25" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
        <input value={form.comment} placeholder="Комментарий" onChange={(event) => setForm({ ...form, comment: event.target.value })} />
        <Button onClick={() => void save()}>{form.id ? "Сохранить" : "Добавить"}</Button>
      </FormRow>}
      {all && form.id && <FormRow>
        <input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <input type="number" min="0" max="24" step="0.25" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} />
        <input value={form.comment} placeholder="Комментарий" onChange={(event) => setForm({ ...form, comment: event.target.value })} />
        <Button onClick={() => void save()}>Сохранить</Button>
      </FormRow>}
      {!timesheetEntries.isFetching && entries.length === 0 ? <Empty>За этот месяц записей нет</Empty> : <Table data={entries} columns={columns} sort={{ id: "date", desc: true }} onChangeSort={() => undefined} loading={timesheetEntries.isFetching} page={{ hasNext: false }} rowHeight={52} />}
    </Scene>
  );
}

const shiftMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() + amount);
  return date.toISOString().slice(0, 7);
};

const Controls = styled.div`display: flex; align-items: center; gap: 8px; margin: 16px 0; input, select { height: 32px; border: 1px solid ${(props) => props.theme.inputBorder}; border-radius: 6px; padding: 0 8px; } strong { margin-left: auto; }`;
const FormRow = styled.div`display: grid; grid-template-columns: 150px 100px minmax(160px, 1fr) auto; gap: 8px; margin: 16px 0; input { height: 32px; border: 1px solid ${(props) => props.theme.inputBorder}; border-radius: 6px; padding: 0 8px; }`;
const Actions = styled.span`display: flex; gap: 4px;`;
const Totals = styled.div`display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; color: ${(props) => props.theme.textSecondary};`;

export default observer(Timesheet);
