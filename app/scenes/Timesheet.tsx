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
  const [adminView, setAdminView] = React.useState<"calendar" | "list">(
    "calendar"
  );
  const [selectedDate, setSelectedDate] = React.useState(localDate);
  const [form, setForm] = React.useState<Form>(initialForm);

  React.useEffect(() => {
    void timesheetEntries.fetchMonth(month, all ? { all: true } : {});
  }, [all, month, timesheetEntries]);

  React.useEffect(() => {
    if (!selectedDate.startsWith(month)) {
      setSelectedDate(`${month}-01`);
    }
  }, [month, selectedDate]);

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
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate);

  const startEntry = () => {
    setAll(false);
    window.requestAnimationFrame(() =>
      document.getElementById("timesheet-hours")?.focus()
    );
  };

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
      <Topbar>
        <TitleGroup>
          <Eyebrow>Учет времени</Eyebrow>
          <Heading>Табель</Heading>
        </TitleGroup>
        <MonthNavigation month={month} onChange={setMonth} />
        <Button onClick={startEntry}>Добавить часы</Button>
      </Topbar>
      {user.isAdmin && (
        <Tabs>
          <Tab active={!all} onClick={() => { setAll(false); setEmployeeId(undefined); }}>
            Мои часы
          </Tab>
          <Tab active={all} onClick={() => setAll(true)}>Все сотрудники</Tab>
        </Tabs>
      )}
      {all ? (
        <AdminLayout>
          <TeamPanel>
            <TeamPanelHeading>
              <span>Команда</span>
              <strong>{total.toFixed(2)} ч</strong>
            </TeamPanelHeading>
            <select
              value={employeeId ?? ""}
              onChange={(event) => setEmployeeId(event.target.value || undefined)}
            >
              <option value="">Все сотрудники</option>
              {employees.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <TeamTotals>
              {Object.entries(totals)
                .sort(([, left], [, right]) => right.hours - left.hours)
                .map(([id, value]) => (
                  <TeamTotal key={id}>
                    <span>{value.name}</span>
                    <strong>{value.hours.toFixed(2)} ч</strong>
                  </TeamTotal>
                ))}
            </TeamTotals>
          </TeamPanel>
          <CalendarPanel>
            <CalendarHeading>
              <div>
                <span>Календарь</span>
                <strong>{employeeId ? "Сотрудник" : "Все сотрудники"}</strong>
              </div>
              <ViewSwitch>
                <button
                  data-active={adminView === "calendar"}
                  onClick={() => setAdminView("calendar")}
                >
                  Календарь
                </button>
                <button
                  data-active={adminView === "list"}
                  onClick={() => setAdminView("list")}
                >
                  Список
                </button>
              </ViewSwitch>
            </CalendarHeading>
            {adminView === "calendar" ? (
              <>
                <TimesheetCalendar
                  month={month}
                  entries={entries}
                  selectedDate={selectedDate}
                  onSelect={setSelectedDate}
                />
                <DayDetails date={selectedDate} entries={selectedEntries} />
              </>
            ) : !timesheetEntries.isFetching && entries.length === 0 ? (
              <Empty>За этот месяц записей нет</Empty>
            ) : (
              <Table
                data={entries}
                columns={columns}
                sort={{ id: "date", desc: true }}
                onChangeSort={() => undefined}
                loading={timesheetEntries.isFetching}
                page={{ hasNext: false }}
                rowHeight={52}
              />
            )}
          </CalendarPanel>
        </AdminLayout>
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

function TimesheetCalendar({
  month,
  entries,
  selectedDate,
  onSelect,
}: {
  month: string;
  entries: TimesheetEntry[];
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const entriesByDate = entries.reduce<Record<string, TimesheetEntry[]>>(
    (result, entry) => {
      (result[entry.date] ??= []).push(entry);
      return result;
    },
    {}
  );

  return (
    <Calendar>
      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <CalendarWeekday key={day}>{day}</CalendarWeekday>)}
      {calendarDays(month).map((date) => {
        const dayEntries = entriesByDate[date] ?? [];
        const hours = dayEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
        return (
          <CalendarDay
            key={date}
            data-current={date.startsWith(month)}
            data-selected={date === selectedDate}
            data-worked={hours > 0}
            onClick={() => onSelect(date)}
          >
            <span>{Number(date.slice(-2))}</span>
            {hours > 0 && <strong>{hours.toFixed(2)} ч</strong>}
            {dayEntries.length > 1 && <small>{dayEntries.length} сотрудников</small>}
          </CalendarDay>
        );
      })}
    </Calendar>
  );
}

function DayDetails({ date, entries }: { date: string; entries: TimesheetEntry[] }) {
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  return (
    <DaySummary>
      <DaySummaryTitle>
        <span>{formatFullDate(date)}</span>
        <strong>{total.toFixed(2)} ч</strong>
      </DaySummaryTitle>
      {entries.length ? entries.map((entry) => (
        <DayEntry key={entry.id}>
          <span>{entry.userName ?? 'Сотрудник'}</span>
          <span>{entry.comment || 'Без комментария'}</span>
          <strong>{entry.hours} ч</strong>
        </DayEntry>
      )) : <Empty>За этот день записей нет</Empty>}
    </DaySummary>
  );
}

function calendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthNumber - 1, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateString(date);
  });
}

function toDateString(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

const shiftMonth = (month: string, amount: number) => {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + amount);
  return date.toISOString().slice(0, 7);
};

const formatFullDate = (date: string) => new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
  weekday: "long",
}).format(new Date(`${date}T12:00:00`));

const Topbar = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  margin-bottom: 8px;

  > button {
    justify-self: end;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr auto;

    nav {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
`;

const TitleGroup = styled.div`
  h1 { margin: 0; }
`;

const Eyebrow = styled.div`
  color: ${(props) => props.theme.textTertiary};
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const AdminLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 18px;
  margin-top: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const TeamPanel = styled.aside`
  padding: 16px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 10px;
  background: ${(props) => props.theme.backgroundSecondary};

  select {
    width: 100%;
    height: 36px;
    margin: 16px 0 10px;
    border: 1px solid ${(props) => props.theme.inputBorder};
    border-radius: 6px;
    background: ${(props) => props.theme.background};
    color: ${(props) => props.theme.text};
    padding: 0 8px;
  }
`;

const TeamPanelHeading = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 16px;
  font-weight: 600;

  strong { font-size: 20px; }
`;

const TeamTotals = styled.div`
  display: grid;
`;

const TeamTotal = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  font-size: 13px;

  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  strong { white-space: nowrap; }
`;

const CalendarPanel = styled.section`
  min-width: 0;
  padding: 16px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 10px;
`;

const CalendarHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  div:first-child {
    display: grid;
    gap: 2px;
    color: ${(props) => props.theme.textTertiary};
    font-size: 12px;
  }

  strong { color: ${(props) => props.theme.text}; font-size: 16px; }
`;

const ViewSwitch = styled.div`
  display: flex;
  padding: 3px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 7px;

  button {
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.textSecondary};
    cursor: var(--pointer);
    font-size: 12px;
    padding: 6px 10px;

    &[data-active="true"] {
      background: ${(props) => props.theme.accent};
      color: ${(props) => props.theme.accentText};
    }
  }
`;

const Calendar = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border-top: 1px solid ${(props) => props.theme.inputBorder};
  border-left: 1px solid ${(props) => props.theme.inputBorder};
`;

const CalendarWeekday = styled.div`
  padding: 8px;
  border-right: 1px solid ${(props) => props.theme.inputBorder};
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  color: ${(props) => props.theme.textTertiary};
  font-size: 11px;
  text-align: center;
`;

const CalendarDay = styled.button`
  display: grid;
  align-content: start;
  gap: 5px;
  min-height: 84px;
  padding: 8px;
  border: 0;
  border-right: 1px solid ${(props) => props.theme.inputBorder};
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  text-align: left;

  &[data-current="false"] { color: ${(props) => props.theme.textTertiary}; opacity: .55; }
  &[data-worked="true"] { background: ${(props) => props.theme.backgroundSecondary}; }
  &[data-selected="true"] { box-shadow: inset 0 0 0 2px ${(props) => props.theme.accent}; }
  strong { font-size: 14px; }
  small { font-size: 10px; }
`;

const DaySummary = styled.div`
  margin-top: 14px;
  border-top: 1px solid ${(props) => props.theme.inputBorder};
`;

const DaySummaryTitle = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  font-size: 14px;
  text-transform: capitalize;
`;

const DayEntry = styled.div`
  display: grid;
  grid-template-columns: minmax(120px, .7fr) minmax(0, 1.5fr) auto;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid ${(props) => props.theme.inputBorder};
  font-size: 13px;

  span:nth-child(2) { color: ${(props) => props.theme.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const Months = styled.nav`
  display: flex; align-items: center; justify-content: center; gap: 16px; margin: 0;
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
export default observer(Timesheet);
