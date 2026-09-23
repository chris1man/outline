import { EditIcon, NotepadIcon, TrashIcon } from "outline-icons";
import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import styled from "styled-components";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { Tab, Tabs } from "~/components/Tabs";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import type TimesheetEntry from "~/models/TimesheetEntry";

type Form = {
  id?: string;
  userId?: string;
  date: string;
  hours: string;
  workplace: string;
  comment: string;
};

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
};
const currentMonth = () => localDate().slice(0, 7);
const initialForm = (): Form => ({
  date: localDate(),
  hours: "8",
  workplace: "",
  comment: "",
});
const formatMonth = (month: string) =>
  new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" })
    .format(new Date(`${month}-01T12:00:00`))
    .replace(" г.", "");
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(`${date}T12:00:00`));

function Timesheet() {
  const user = useCurrentUser();
  const { dialogs, timesheetEntries } = useStores();
  const [month, setMonth] = React.useState(currentMonth);
  const [all, setAll] = React.useState(false);
  const [employeeId, setEmployeeId] = React.useState<string>();
  const [workplace, setWorkplace] = React.useState<string>();
  const [adminView, setAdminView] = React.useState<"calendar" | "list">(
    "calendar"
  );
  const [selectedDate, setSelectedDate] = React.useState(localDate);
  const [form, setForm] = React.useState<Form>(initialForm);
  const [editingDate, setEditingDate] = React.useState<string>();

  React.useEffect(() => {
    void timesheetEntries.fetchMonth(month, all ? { all: true } : {});
  }, [all, month, timesheetEntries]);

  React.useEffect(() => {
    if (!selectedDate.startsWith(month)) {
      setSelectedDate(`${month}-01`);
    }
  }, [month, selectedDate]);

  const allEntries = timesheetEntries.orderedData;
  const entries = allEntries.filter(
    (entry) =>
      (!all || !employeeId || entry.userId === employeeId) &&
      (!workplace || entry.workplace === workplace)
  );
  const total = entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
  const totals = timesheetEntries.employees.reduce<Record<string, {
    name: string;
    hours: number;
    avatarUrl?: string | null;
    role?: string;
  }>>((result, employee) => {
      result[employee.id] = {
        name: employee.name,
        hours: 0,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
      };
      return result;
    }, {});
  entries.forEach((entry) => {
    const item = totals[entry.userId] ?? {
      name: entry.userName ?? entry.userId,
      hours: 0,
      avatarUrl: entry.userAvatarUrl,
      role: entry.userRole,
    };
    item.hours += Number(entry.hours);
    totals[entry.userId] = item;
  });
  const maximumHours = Math.max(
    1,
    ...Object.values(totals).map((entry) => entry.hours)
  );
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate);

  const saveForm = async (value: Form) => {
    try {
      await timesheetEntries.upsert({
        id: value.id,
        userId: value.userId,
        date: value.date,
        hours: Number(value.hours),
        workplace: value.workplace,
        comment: value.comment,
      });
      await timesheetEntries.fetchMonth(month, all ? { all: true } : {});
      toast.success("Запись сохранена");
      return true;
    } catch {
      toast.error("Не удалось сохранить запись");
      return false;
    }
  };

  const selectDate = (date: string, entry?: TimesheetEntry) => {
    setForm({
      ...(entry
        ? {
            id: entry.id,
            userId: entry.userId,
            date: entry.date,
            hours: String(entry.hours),
            workplace: entry.workplace,
            comment: entry.comment,
          }
        : { ...initialForm(), date }),
    });
    setEditingDate(date);
  };

  const saveInline = async () => {
    if (await saveForm(form)) {
      setEditingDate(undefined);
    }
  };

  const openEntryModal = (entry?: TimesheetEntry) => {
    const initial = entry
      ? {
          id: entry.id,
          userId: entry.userId,
          date: entry.date,
          hours: String(entry.hours),
          workplace: entry.workplace,
          comment: entry.comment,
        }
      : {
          ...initialForm(),
          date: month === currentMonth() ? localDate() : `${month}-01`,
        };
    dialogs.openModal({
      title: entry ? "Изменить часы" : "Добавить часы",
      width: 560,
      content: (
        <TimesheetEntryModal
          initial={initial}
          workplaces={timesheetEntries.workplaces}
          onSave={saveForm}
          onClose={dialogs.closeAllModals}
        />
      ),
    });
  };

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

  return (
    <Scene icon={<NotepadIcon />} title="Табель" wide>
      <Topbar>
        <TitleGroup>
          <Eyebrow>Учет времени</Eyebrow>
          <Heading>Табель</Heading>
        </TitleGroup>
        <MonthNavigation month={month} onChange={setMonth} />
        <Button onClick={() => openEntryModal()}>Добавить часы</Button>
      </Topbar>
      {user.isAdmin && (
        <Tabs>
          <Tab active={!all} onClick={() => { setAll(false); setEmployeeId(undefined); setWorkplace(undefined); }}>
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
              {timesheetEntries.employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>
            <FilterLabel>
              Место
              <select value={workplace ?? ""} onChange={(event) => setWorkplace(event.target.value || undefined)}>
                <option value="">Все места</option>
                {timesheetEntries.workplaces.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </FilterLabel>
            <TeamTotals>
              {Object.entries(totals)
                .sort(([, left], [, right]) => right.hours - left.hours)
                .map(([id, value]) => (
                  <TeamTotal key={id} data-selected={id === employeeId} onClick={() => setEmployeeId(id)}>
                    <Avatar
                      model={{
                        id,
                        name: value.name,
                        avatarUrl: value.avatarUrl ?? null,
                      }}
                      size={AvatarSize.Large}
                      showHoverCard={false}
                    />
                    <PersonMeta>
                      <strong>{value.name}</strong>
                      <span>{formatRole(value.role)} · группа не указана</span>
                    </PersonMeta>
                    <HoursSummary>
                      <strong>{value.hours.toFixed(2)} ч</strong>
                      <ProgressTrack>
                        <ProgressFill $percent={(value.hours / maximumHours) * 100} />
                      </ProgressTrack>
                    </HoursSummary>
                  </TeamTotal>
                ))}
            </TeamTotals>
            <WorkplaceSettings>
              <span>Места работы</span>
              {timesheetEntries.workplaces.filter((item) => !item.isDefault).length ? timesheetEntries.workplaces.filter((item) => !item.isDefault).map((item) => (
                <WorkplaceSetting key={item.id}>
                  {item.name}
                  <button aria-label={`Удалить ${item.name}`} onClick={() => void timesheetEntries.deleteWorkplace(item.id)}>×</button>
                </WorkplaceSetting>
              )) : <small>Добавляются при заполнении табеля</small>}
            </WorkplaceSettings>
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
              <TimesheetList entries={entries} onEdit={openEntryModal} onDelete={remove} />
            )}
          </CalendarPanel>
        </AdminLayout>
      ) : (
        <>
          <PersonalLedger
            month={month}
            entries={entries}
            total={total}
            form={form}
            editingDate={editingDate}
            workplaces={timesheetEntries.workplaces}
            onSelect={selectDate}
            onChange={setForm}
            onSave={saveInline}
            onCancel={() => setEditingDate(undefined)}
            onRemove={async (entry) => {
              await remove(entry);
              setEditingDate(undefined);
            }}
          />
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

type Workplace = { id: string; name: string; isDefault: boolean };

function PersonalLedger({ month, entries, total, form, editingDate, workplaces, onSelect, onChange, onSave, onCancel, onRemove }: {
  month: string;
  entries: TimesheetEntry[];
  total: number;
  form: Form;
  editingDate?: string;
  workplaces: Workplace[];
  onSelect: (date: string, entry?: TimesheetEntry) => void;
  onChange: React.Dispatch<React.SetStateAction<Form>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onRemove: (entry: TimesheetEntry) => Promise<void>;
}) {
  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));

  return (
    <PersonalLedgerWrap>
      <PersonalSummary><span>Всего за {formatMonth(month)}</span><strong>{total.toFixed(2)} ч</strong></PersonalSummary>
      <LedgerHeader><span>Дата</span><span>Часы</span><span>Место работы</span><span>Заметка</span></LedgerHeader>
      <Ledger>
        {monthDates(month).map((date) => {
          const entry = entriesByDate.get(date);
          const isEditing = editingDate === date;
          return isEditing ? (
            <LedgerEditRow key={date}>
              <LedgerDate><strong>{formatDate(date)}</strong>{date === localDate() && <small>Сегодня</small>}</LedgerDate>
              <InlineHours value={form.hours} onChange={(event) => onChange({ ...form, hours: event.target.value })} type="number" min="0" max="24" step="0.25" inputMode="decimal" autoFocus aria-label="Часы" />
              <WorkplacePicker form={form} workplaces={workplaces} onChange={onChange} inputId={`workplace-${date}`} />
              <CommentInput value={form.comment} placeholder="Комментарий (необязательно)" onChange={(event) => onChange({ ...form, comment: event.target.value })} />
              <LedgerActions><Button onClick={() => void onSave()}>Сохранить</Button><Button neutral onClick={onCancel}>Отмена</Button>{entry && <Button icon={<TrashIcon />} neutral aria-label="Удалить" onClick={() => void onRemove(entry)} />}</LedgerActions>
            </LedgerEditRow>
          ) : (
            <LedgerRow key={date} data-today={date === localDate()}>
              <LedgerDateButton onClick={() => onSelect(date, entry)}><strong>{formatDate(date)}</strong>{date === localDate() && <small>Сегодня</small>}</LedgerDateButton>
              <LedgerHours onClick={() => onSelect(date, entry)}>{entry ? `${entry.hours} ч` : "—"}</LedgerHours>
              <LedgerPlace onClick={() => onSelect(date, entry)}>{entry?.workplace ? <WorkplaceTag>{entry.workplace}</WorkplaceTag> : <AddHours>＋ Добавить часы</AddHours>}</LedgerPlace>
              <LedgerComment onClick={() => onSelect(date, entry)}>{entry?.comment || ""}</LedgerComment>
            </LedgerRow>
          );
        })}
      </Ledger>
    </PersonalLedgerWrap>
  );
}

function TimesheetEntryModal({ initial, workplaces, onSave, onClose }: { initial: Form; workplaces: Workplace[]; onSave: (form: Form) => Promise<boolean>; onClose: () => void }) {
  const [form, setForm] = React.useState(initial);
  const save = async () => {
    if (await onSave(form)) {
      onClose();
    }
  };

  return <ModalForm>
    <DateInput><span>Дата</span><input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></DateInput>
    <HoursInput><label htmlFor="timesheet-modal-hours">Часы</label><input id="timesheet-modal-hours" type="number" min="0" max="24" step="0.25" inputMode="decimal" value={form.hours} onChange={(event) => setForm({ ...form, hours: event.target.value })} autoFocus /></HoursInput>
    <ModalField><span>Место работы</span><WorkplacePicker form={form} workplaces={workplaces} onChange={setForm} inputId="timesheet-modal-workplace" /></ModalField>
    <ModalField><span>Комментарий <em>(необязательно)</em></span><CommentInput value={form.comment} placeholder="Чем занимались?" onChange={(event) => setForm({ ...form, comment: event.target.value })} /></ModalField>
    <ModalActions><Button onClick={() => void save()}>{form.id ? "Сохранить" : "Добавить часы"}</Button><Button neutral onClick={onClose}>Отмена</Button></ModalActions>
  </ModalForm>;
}

function WorkplacePicker({ form, workplaces, onChange, inputId }: { form: Form; workplaces: Workplace[]; onChange: React.Dispatch<React.SetStateAction<Form>>; inputId: string }) {
  const defaultPlaces = workplaces.filter((place) => place.isDefault);
  const isCustom = !!form.workplace && !defaultPlaces.some((place) => place.name === form.workplace);
  return <WorkplaceChoice>
    {defaultPlaces.map((place) => <button key={place.id} type="button" data-active={form.workplace === place.name} onClick={() => onChange({ ...form, workplace: place.name })}>{place.name}</button>)}
    <input id={inputId} list={`${inputId}-options`} value={isCustom ? form.workplace : ""} placeholder="Другое" onChange={(event) => onChange({ ...form, workplace: event.target.value })} />
    <datalist id={`${inputId}-options`}>{workplaces.filter((place) => !place.isDefault).map((place) => <option key={place.id} value={place.name} />)}</datalist>
  </WorkplaceChoice>;
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
            {hours > 0 && <CalendarEntries>{dayEntries.map((entry) => (
              <CalendarEntry key={entry.id}>
                <Avatar model={{ id: entry.userId, name: entry.userName ?? "Сотрудник", avatarUrl: entry.userAvatarUrl ?? null }} size={AvatarSize.Small} showHoverCard={false} />
                <span>{entry.userName ?? "Сотрудник"}</span>
                <strong>{entry.hours} ч</strong>
                {entry.workplace && <small>{entry.workplace}</small>}
              </CalendarEntry>
            ))}</CalendarEntries>}
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
          <Avatar model={{ id: entry.userId, name: entry.userName ?? "Сотрудник", avatarUrl: entry.userAvatarUrl ?? null }} size={AvatarSize.Small} showHoverCard={false} />
          <span>{entry.userName ?? 'Сотрудник'}</span>
          <span>{entry.workplace || '—'}</span>
          <span>{entry.comment || '—'}</span>
          <strong>{entry.hours} ч</strong>
        </DayEntry>
      )) : <Empty>За этот день записей нет</Empty>}
    </DaySummary>
  );
}

function TimesheetList({ entries, onEdit, onDelete }: { entries: TimesheetEntry[]; onEdit: (entry: TimesheetEntry) => void; onDelete: (entry: TimesheetEntry) => Promise<void> }) {
  return <History>{entries.map((entry) => (
    <HistoryRow key={entry.id}>
      <Avatar model={{ id: entry.userId, name: entry.userName ?? "Сотрудник", avatarUrl: entry.userAvatarUrl ?? null }} size={AvatarSize.Small} showHoverCard={false} />
      <DateCell>{formatDate(entry.date)}</DateCell>
      <PersonMeta><strong>{entry.userName ?? "Сотрудник"}</strong><span>{entry.workplace || "Место не указано"}</span></PersonMeta>
      <Comment>{entry.comment || "—"}</Comment>
      <Hours>{entry.hours} ч</Hours>
      <Actions><Button icon={<EditIcon />} neutral aria-label="Изменить" onClick={() => onEdit(entry)} /><Button icon={<TrashIcon />} neutral aria-label="Удалить" onClick={() => void onDelete(entry)} /></Actions>
    </HistoryRow>
  ))}</History>;
}

function calendarDays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, monthNumber - 1, 1 - offset);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateString(date);
  });
}

function monthDates(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: days }, (_, index) =>
    `${month}-${String(index + 1).padStart(2, "0")}`
  );
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

const formatRole = (role?: string) => {
  switch (role) {
    case "admin":
      return "Администратор";
    case "member":
      return "Сотрудник";
    case "viewer":
      return "Наблюдатель";
    case "guest":
      return "Гость";
    default:
      return "Сотрудник";
  }
};

const Topbar = styled.header`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
  margin-bottom: 14px;
  padding: 10px 0;

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
  h1 { margin: 0; font-size: 40px; letter-spacing: -0.04em; }
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

const TeamTotal = styled.button`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 76px;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  width: 100%;
  border: 0;
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  background: transparent;
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  text-align: left;

  &[data-selected="true"] { background: ${(props) => props.theme.background}; }
`;

const FilterLabel = styled.label`
  display: grid;
  gap: 4px;
  color: ${(props) => props.theme.textTertiary};
  font-size: 11px;

  select { margin-top: 0 !important; }
`;

const WorkplaceSettings = styled.section`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 18px;
  color: ${(props) => props.theme.textTertiary};
  font-size: 11px;

  > span { width: 100%; font-weight: 600; }
  small { width: 100%; }
`;

const WorkplaceSetting = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 5px 3px 7px;
  border-radius: 999px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.textSecondary};

  button { border: 0; background: transparent; color: inherit; cursor: var(--pointer); font-size: 15px; line-height: 1; padding: 0; }
`;

const PersonMeta = styled.div`
  display: grid;
  min-width: 0;
  gap: 2px;

  strong, span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  strong { font-size: 12px; }
  span { color: ${(props) => props.theme.textTertiary}; font-size: 10px; }
`;

const HoursSummary = styled.div`
  display: grid;
  gap: 4px;
  text-align: right;

  strong { font-size: 11px; white-space: nowrap; }
`;

const ProgressTrack = styled.div`
  height: 4px;
  overflow: hidden;
  border-radius: 4px;
  background: ${(props) => props.theme.inputBorder};
`;

const ProgressFill = styled.div<{ $percent: number }>`
  width: ${(props) => props.$percent}%;
  height: 100%;
  border-radius: inherit;
  background: ${(props) => props.theme.accent};
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
  min-height: 104px;
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
`;

const CalendarEntries = styled.div`
  display: grid;
  gap: 3px;
`;

const CalendarEntry = styled.div`
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  border-radius: 4px;
  background: ${(props) => props.theme.background};
  font-size: 10px;

  span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  strong { font-size: 10px; }
  small { grid-column: 2 / -1; color: ${(props) => props.theme.textTertiary}; font-size: 9px; text-align: left; }
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
  grid-template-columns: 20px minmax(90px, .7fr) minmax(80px, .6fr) minmax(0, 1.5fr) auto;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid ${(props) => props.theme.inputBorder};
  font-size: 13px;

  span:nth-child(4) { color: ${(props) => props.theme.textSecondary}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

const Months = styled.nav`
  display: flex; align-items: center; justify-content: center; gap: 16px; margin: 0;
  button { border: 0; background: none; color: ${(props) => props.theme.textTertiary}; cursor: var(--pointer); filter: blur(.4px); font-size: 14px; opacity: .6; text-transform: capitalize; }
`;
const MonthCurrent = styled.strong`
  min-width: 175px; text-align: center; font-size: 20px; text-transform: capitalize;
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
const History = styled.div`border-top: 1px solid ${(props) => props.theme.inputBorder};`;
const HistoryRow = styled.div`
  display: grid; grid-template-columns: 20px 135px minmax(130px, .8fr) minmax(0, 1.4fr) 52px 70px; align-items: center; gap: 12px; min-height: 54px; border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  @media (max-width: 700px) { grid-template-columns: 20px 1fr auto 58px; > :nth-child(2), > :nth-child(4) { display: none; } }
`;
const DateCell = styled.span`font-size: 13px; text-transform: capitalize;`;
const Hours = styled.strong`font-size: 13px;`;
const Comment = styled.span`overflow: hidden; color: ${(props) => props.theme.textSecondary}; font-size: 13px; text-overflow: ellipsis; white-space: nowrap;`;
const Actions = styled.span`display: flex; gap: 2px;`;

const PersonalLedgerWrap = styled.section`
  margin-top: 22px;
`;

const PersonalSummary = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 0 0 14px;

  span { color: ${(props) => props.theme.textSecondary}; font-size: 14px; text-transform: capitalize; }
  strong { font-size: 28px; letter-spacing: -0.04em; }
`;

const LedgerHeader = styled.div`
  display: grid;
  grid-template-columns: 176px 110px 170px minmax(0, 1fr);
  gap: 12px;
  padding: 0 10px 8px;
  color: ${(props) => props.theme.textTertiary};
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;

  @media (max-width: 700px) { grid-template-columns: 1fr 58px 96px; > :last-child { display: none; } }
`;

const Ledger = styled.div`
  border-top: 1px solid ${(props) => props.theme.inputBorder};
`;

const LedgerRow = styled.div`
  display: grid;
  grid-template-columns: 176px 110px 170px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 48px;
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};

  &[data-today="true"] { background: ${(props) => props.theme.backgroundSecondary}; }
  @media (max-width: 700px) { grid-template-columns: 1fr 58px 96px; > :last-child { display: none; } }
`;

const LedgerEditRow = styled(LedgerRow)`
  grid-template-columns: 176px 110px minmax(200px, .9fr) minmax(180px, 1fr) auto;
  min-height: 76px;
  padding: 10px;
  border: 1px solid ${(props) => props.theme.accent};
  border-radius: 8px;
  background: ${(props) => props.theme.backgroundSecondary};

  @media (max-width: 900px) { grid-template-columns: 1fr 100px minmax(160px, 1fr); > :nth-child(4) { grid-column: 1 / -1; } > :last-child { display: flex; grid-column: 1 / -1; } }
`;

const LedgerDate = styled.div`
  display: grid;
  gap: 2px;
  padding: 0 10px;
  text-transform: capitalize;
  strong { font-size: 13px; }
  small { color: ${(props) => props.theme.accent}; font-size: 10px; font-weight: 600; }
`;

const LedgerDateButton = styled.button`
  display: grid;
  gap: 2px;
  align-self: stretch;
  padding: 0 10px;
  border: 0;
  background: transparent;
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  text-align: left;
  text-transform: capitalize;
  strong { font-size: 13px; }
  small { color: ${(props) => props.theme.accent}; font-size: 10px; font-weight: 600; }
`;

const LedgerHours = styled.button`
  border: 0;
  background: transparent;
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  font-weight: 600;
  text-align: left;
`;

const LedgerPlace = styled.button`
  border: 0;
  background: transparent;
  cursor: var(--pointer);
  text-align: left;
`;

const LedgerComment = styled.button`
  overflow: hidden;
  border: 0;
  background: transparent;
  color: ${(props) => props.theme.textSecondary};
  cursor: var(--pointer);
  font-size: 13px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const WorkplaceTag = styled.span`
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.textSecondary};
  font-size: 12px;
`;

const AddHours = styled.span`
  color: ${(props) => props.theme.accent};
  font-size: 12px;
  font-weight: 600;
`;

const InlineHours = styled.input`
  width: 100%;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 6px;
  background: ${(props) => props.theme.background};
  color: ${(props) => props.theme.text};
  font-size: 18px;
  font-weight: 600;
  padding: 7px 9px;
`;

const WorkplaceChoice = styled.div`
  display: flex;
  gap: 4px;

  button, input { min-width: 0; border: 1px solid ${(props) => props.theme.inputBorder}; border-radius: 6px; background: ${(props) => props.theme.background}; color: ${(props) => props.theme.textSecondary}; font-size: 12px; padding: 7px 9px; }
  button { cursor: var(--pointer); }
  button[data-active="true"] { border-color: ${(props) => props.theme.accent}; color: ${(props) => props.theme.accent}; }
  input { width: 82px; }
`;

const LedgerActions = styled.div`
  display: flex;
  gap: 6px;
  > button { white-space: nowrap; }
`;

const ModalForm = styled.div`
  display: grid;
  gap: 18px;
  min-width: min(100%, 460px);
`;

const ModalField = styled.label`
  display: grid;
  gap: 6px;
  color: ${(props) => props.theme.textSecondary};
  font-size: 13px;
  em { color: ${(props) => props.theme.textTertiary}; font-style: normal; }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;
export default observer(Timesheet);
