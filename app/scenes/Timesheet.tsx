import {
  BuildingBlocksIcon,
  CalendarIcon,
  EditIcon,
  HomeIcon,
  MoreIcon,
  NotepadIcon,
  PlusIcon,
  TrashIcon,
} from "outline-icons";
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
const dateParts = (date: string) => {
  const value = new Date(`${date}T12:00:00`);
  return {
    weekday: new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(value),
    day: new Intl.DateTimeFormat("ru-RU", { day: "numeric" }).format(value),
    month: new Intl.DateTimeFormat("ru-RU", { month: "short" }).format(value),
  };
};
const defaultMobileHalf = (month: string) =>
  localDate().startsWith(month) && Number(localDate().slice(-2)) > 15
    ? "second"
    : "first";
const scrollToTimesheetDate = (date: string) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(`[data-timesheet-date="${date}"]`)
  )
    .find((element) => element.offsetParent)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });

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
  const [focusToday, setFocusToday] = React.useState(false);

  React.useEffect(() => {
    void timesheetEntries.fetchMonth(month, all ? { all: true } : {});
  }, [all, month, timesheetEntries]);

  React.useEffect(() => {
    if (!selectedDate.startsWith(month)) {
      setSelectedDate(`${month}-01`);
    }
  }, [month, selectedDate]);

  React.useEffect(() => {
    if (!focusToday) {
      return;
    }
    scrollToTimesheetDate(localDate());
    setFocusToday(false);
  }, [focusToday, month]);

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

  const goToToday = () => {
    setMonth(currentMonth());
    setFocusToday(true);
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
          <Heading>{all ? "Табель" : "Мои часы"}</Heading>
        </TitleGroup>
        <MonthNavigation month={month} onChange={setMonth} />
        <TopActions>
          {all ? (
            <Button onClick={() => openEntryModal()}>Добавить часы</Button>
          ) : (
            <Button neutral icon={<CalendarIcon />} onClick={goToToday}>
              Сегодня
            </Button>
          )}
        </TopActions>
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
            userId={user.id}
            onSelect={selectDate}
            onChange={setForm}
            onSave={saveInline}
            onCancel={() => setEditingDate(undefined)}
            onAdd={() => openEntryModal()}
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

function PersonalLedger({ month, entries, total, form, editingDate, workplaces, userId, onSelect, onChange, onSave, onCancel, onAdd, onRemove }: {
  month: string;
  entries: TimesheetEntry[];
  total: number;
  form: Form;
  editingDate?: string;
  workplaces: Workplace[];
  userId: string;
  onSelect: (date: string, entry?: TimesheetEntry) => void;
  onChange: React.Dispatch<React.SetStateAction<Form>>;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onAdd: () => void;
  onRemove: (entry: TimesheetEntry) => Promise<void>;
}) {
  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const dates = monthDates(month);
  const [mobileHalf, setMobileHalf] = React.useState<"first" | "second">(
    () => defaultMobileHalf(month)
  );
  const firstHalf = dates.slice(0, 15);
  const secondHalf = dates.slice(15);

  React.useEffect(() => {
    const saved = window.localStorage.getItem(`timesheet-half:${userId}:${month}`);
    setMobileHalf(saved === "first" || saved === "second" ? saved : defaultMobileHalf(month));
  }, [month, userId]);

  const chooseHalf = (half: "first" | "second") => {
    setMobileHalf(half);
    window.localStorage.setItem(`timesheet-half:${userId}:${month}`, half);
  };

  const renderRows = (range: string[]) => range.map((date) => {
    const entry = entriesByDate.get(date);
    const isEditing = editingDate === date;
    return isEditing ? (
      <LedgerEditRow data-timesheet-date={date} key={date}>
        <LedgerDate><DateMark date={date} />{date === localDate() && <TodayBadge>Сегодня</TodayBadge>}</LedgerDate>
        <InlineHours value={form.hours} onChange={(event) => onChange({ ...form, hours: event.target.value })} type="number" min="0" max="24" step="0.25" inputMode="decimal" autoFocus aria-label="Часы" />
        <WorkplaceField><span>Где работали?</span><WorkplacePicker form={form} workplaces={workplaces} onChange={onChange} inputId={`workplace-${date}`} /></WorkplaceField>
        <CommentInput value={form.comment} placeholder="Комментарий (необязательно)" onChange={(event) => onChange({ ...form, comment: event.target.value })} />
        <LedgerActions><Button onClick={() => void onSave()}>Сохранить</Button><Button neutral onClick={onCancel}>Отмена</Button>{entry && <Button icon={<TrashIcon />} neutral aria-label="Удалить" onClick={() => void onRemove(entry)} />}</LedgerActions>
      </LedgerEditRow>
    ) : (
      <LedgerRow data-timesheet-date={date} key={date} data-today={date === localDate()}>
        <LedgerDateButton onClick={() => onSelect(date, entry)}><DateMark date={date} />{date === localDate() && <TodayBadge>Сегодня</TodayBadge>}</LedgerDateButton>
        <LedgerHours onClick={() => onSelect(date, entry)}>{entry ? <HoursPill>{entry.hours} ч</HoursPill> : "—"}</LedgerHours>
        <LedgerPlace onClick={() => onSelect(date, entry)}>{entry?.workplace ? <WorkplaceTag>{entry.workplace}</WorkplaceTag> : <AddHours>＋ Добавить часы</AddHours>}</LedgerPlace>
        <LedgerComment onClick={() => onSelect(date, entry)}>{entry?.comment || ""}</LedgerComment>
      </LedgerRow>
    );
  });

  const panel = (title: string, range: string[]) => <LedgerColumn>
    <LedgerHalfTitle>{title} <span>{formatMonth(month).split(" ")[0]}</span></LedgerHalfTitle>
    <LedgerHeader><span>Дата</span><span>Часы</span><span>Место работы</span><span>Заметка</span></LedgerHeader>
    <Ledger>{renderRows(range)}</Ledger>
  </LedgerColumn>;

  return (
    <PersonalLedgerWrap>
      <PersonalSummary>
        <div><span>Всего за {formatMonth(month)}</span><strong>{total.toFixed(2)} ч</strong></div>
        <SummaryProgress><span>Рабочих дней: {entries.length}</span><div><i style={{ width: `${(entries.length / dates.length) * 100}%` }} /></div></SummaryProgress>
      </PersonalSummary>
      <MobileHalfSwitch><button data-active={mobileHalf === "first"} onClick={() => chooseHalf("first")}>1–15</button><button data-active={mobileHalf === "second"} onClick={() => chooseHalf("second")}>16–{dates.length}</button></MobileHalfSwitch>
      <DesktopLedgerColumns>{panel("1–15", firstHalf)}{panel(`16–${dates.length}`, secondHalf)}</DesktopLedgerColumns>
      <MobileLedger>{panel(mobileHalf === "first" ? "1–15" : `16–${dates.length}`, mobileHalf === "first" ? firstHalf : secondHalf)}</MobileLedger>
      <LedgerFooter><Button neutral icon={<PlusIcon />} onClick={onAdd}>Добавить часы</Button></LedgerFooter>
      <MobileActions data-editing={Boolean(editingDate)}><Button neutral icon={<CalendarIcon />} onClick={() => { chooseHalf(defaultMobileHalf(month)); window.requestAnimationFrame(() => scrollToTimesheetDate(localDate())); }}>Сегодня</Button><Button icon={<PlusIcon />} onClick={onAdd}>Добавить часы</Button></MobileActions>
    </PersonalLedgerWrap>
  );
}

function DateMark({ date }: { date: string }) {
  const parts = dateParts(date);
  return <DateMarkWrap><span>{parts.weekday}</span><strong>{parts.day}</strong><small>{parts.month}</small></DateMarkWrap>;
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
  const places = defaultPlaces.length
    ? defaultPlaces
    : [
        { id: "workplace-koms", name: "Комс", isDefault: true },
        { id: "workplace-workshop", name: "Цех", isDefault: true },
      ];
  const [isCustom, setIsCustom] = React.useState(
    !!form.workplace && !places.some((place) => place.name === form.workplace)
  );

  return <WorkplaceChoice>
    {places.map((place) => <button key={place.id} type="button" data-active={!isCustom && form.workplace === place.name} onClick={() => { setIsCustom(false); onChange({ ...form, workplace: place.name }); }}><WorkplaceIcon name={place.name} />{place.name}</button>)}
    <button type="button" data-active={isCustom} onClick={() => { setIsCustom(true); onChange({ ...form, workplace: "" }); }}><MoreIcon />Другое</button>
    {isCustom && <input id={inputId} list={`${inputId}-options`} value={form.workplace} placeholder="Укажите место" onChange={(event) => onChange({ ...form, workplace: event.target.value })} autoFocus />}
    <datalist id={`${inputId}-options`}>{workplaces.filter((place) => !place.isDefault).map((place) => <option key={place.id} value={place.name} />)}</datalist>
  </WorkplaceChoice>;
}

function WorkplaceIcon({ name }: { name: string }) {
  if (name === "Комс") {
    return <HomeIcon />;
  }
  return <BuildingBlocksIcon />;
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

  > :last-child {
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

const TopActions = styled.div`
  display: flex;
  gap: 8px;
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
  max-width: 1180px;
  margin-top: 26px;
  padding-bottom: 82px;
`;

const PersonalSummary = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin: 0 0 18px;
  padding: 18px 20px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 10px;
  background: ${(props) => props.theme.backgroundSecondary};

  > div { display: grid; gap: 2px; }
  span { color: ${(props) => props.theme.textSecondary}; font-size: 13px; font-weight: 500; text-transform: capitalize; }
  strong { font-size: 32px; letter-spacing: -0.04em; }

  @media (max-width: 700px) { padding: 14px; strong { font-size: 26px; } }
`;

const SummaryProgress = styled.div`
  display: grid;
  gap: 6px;
  min-width: 220px;

  div { height: 5px; overflow: hidden; border-radius: 99px; background: ${(props) => props.theme.inputBorder}; }
  i { display: block; height: 100%; border-radius: inherit; background: ${(props) => props.theme.accent}; }

  @media (max-width: 700px) { min-width: 108px; text-align: right; }
`;

const DesktopLedgerColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 700px) { display: none; }
`;

const MobileLedger = styled.div`
  display: none;

  @media (max-width: 700px) { display: block; }
`;

const LedgerColumn = styled.section`
  min-width: 0;
  overflow: hidden;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 12px;
  background: ${(props) => props.theme.background};
  box-shadow: 0 2px 8px rgba(35, 24, 21, .035);

  @media (max-width: 700px) { border: 0; border-radius: 0; box-shadow: none; }
`;

const LedgerHalfTitle = styled.h2`
  margin: 0;
  padding: 15px 16px 12px;
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.text};
  font-size: 17px;

  span { color: ${(props) => props.theme.textTertiary}; font-size: 12px; font-weight: 500; text-transform: capitalize; }

  @media (max-width: 700px) { display: none; }
`;

const MobileHalfSwitch = styled.nav`
  display: none;

  @media (max-width: 700px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 12px;
    padding: 4px;
    border: 1px solid ${(props) => props.theme.inputBorder};
    border-radius: 9px;
    background: ${(props) => props.theme.backgroundSecondary};

    button { min-height: 36px; border: 0; border-radius: 6px; background: transparent; color: ${(props) => props.theme.textSecondary}; cursor: var(--pointer); font-size: 13px; font-weight: 600; }
    button[data-active="true"] { background: ${(props) => props.theme.background}; box-shadow: 0 1px 3px rgba(0, 0, 0, .08); color: ${(props) => props.theme.text}; }
  }
`;

const LedgerHeader = styled.div`
  display: grid;
  grid-template-columns: 130px 94px 144px minmax(0, 1fr);
  position: sticky;
  z-index: 1;
  top: 0;
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.textTertiary};
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;

  span { padding: 11px 12px; }
  span + span { border-left: 1px solid ${(props) => props.theme.inputBorder}; }

  @media (max-width: 700px) { display: none; }
`;

const Ledger = styled.div`
  border-top: 1px solid ${(props) => props.theme.inputBorder};

  @media (max-width: 700px) { display: grid; gap: 8px; border: 0; }
`;

const LedgerRow = styled.div`
  display: grid;
  grid-template-columns: 130px 94px 144px minmax(0, 1fr);
  align-items: center;
  min-height: 63px;
  border-bottom: 1px solid ${(props) => props.theme.inputBorder};

  > * { min-width: 0; padding: 0 12px; }
  > * + * { border-left: 1px solid ${(props) => props.theme.inputBorder}; }

  &[data-today="true"] { box-shadow: inset 3px 0 0 ${(props) => props.theme.accent}; background: ${(props) => props.theme.backgroundSecondary}; }
  &:hover { background: ${(props) => props.theme.backgroundSecondary}; }
  @media (max-width: 700px) {
    grid-template-columns: 58px minmax(0, 1fr) auto;
    min-height: 76px;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid ${(props) => props.theme.inputBorder};
    border-radius: 10px;

    > * { padding: 0; }
    > * + * { border-left: 0; }

    > :nth-child(1) { grid-column: 1; grid-row: 1; }
    > :nth-child(2) { grid-column: 2; grid-row: 1; }
    > :nth-child(3) { grid-column: 3; grid-row: 1; }
    > :last-child { display: none; }
  }
`;

const LedgerEditRow = styled(LedgerRow)`
  grid-template-columns: 126px 82px minmax(180px, 1fr);
  min-height: 94px;
  padding: 14px 10px;
  border: 1px solid ${(props) => props.theme.accent};
  border-radius: 8px;
  background: ${(props) => props.theme.backgroundSecondary};

  > * + * { border-left: 0; }
  > :nth-child(4), > :last-child { grid-column: 1 / -1; }
  @media (max-width: 900px) { grid-template-columns: 1fr 100px minmax(160px, 1fr); > :nth-child(4) { grid-column: 1 / -1; } > :last-child { display: flex; grid-column: 1 / -1; } }
  @media (max-width: 700px) { display: grid; grid-template-columns: 1fr 86px; gap: 12px; padding: 14px; > :nth-child(1), > :nth-child(2) { grid-column: auto; grid-row: auto; } > :nth-child(3), > :nth-child(4), > :last-child { grid-column: 1 / -1; } }
`;

const LedgerDate = styled.div`
  display: grid;
  align-items: center;
  gap: 5px;
  padding: 0 12px;

  @media (max-width: 700px) { padding: 0; }
`;

const LedgerDateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  align-self: stretch;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  text-align: left;

  @media (max-width: 700px) { flex-direction: column; align-items: flex-start; gap: 3px; padding: 0; }
`;

const DateMarkWrap = styled.span`
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  column-gap: 6px;
  line-height: 1;
  text-transform: capitalize;

  span { grid-column: 1 / -1; color: ${(props) => props.theme.textTertiary}; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  strong { font-size: 22px; letter-spacing: -0.04em; }
  small { color: ${(props) => props.theme.textSecondary}; font-size: 12px; font-weight: 600; }

  @media (max-width: 700px) { gap: 1px; strong { font-size: 24px; } small { display: none; } }
`;

const TodayBadge = styled.small`
  color: ${(props) => props.theme.accent};
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;

  @media (max-width: 700px) { font-size: 9px; }
`;

const LedgerHours = styled.button`
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: ${(props) => props.theme.text};
  cursor: var(--pointer);
  font-weight: 600;
  text-align: left;

  @media (max-width: 700px) { padding: 0; }
`;

const HoursPill = styled.span`
  display: inline-block;
  min-width: 92px;
  padding: 8px 12px;
  border: 1px solid ${(props) => props.theme.inputBorder};
  border-radius: 6px;
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.text};
  font-size: 16px;
  font-weight: 600;
  text-align: center;
`;

const LedgerPlace = styled.button`
  padding: 0 12px;
  border: 0;
  background: transparent;
  cursor: var(--pointer);
  text-align: left;

  @media (max-width: 700px) { padding: 0; }
`;

const LedgerComment = styled.button`
  overflow: hidden;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: ${(props) => props.theme.textSecondary};
  cursor: var(--pointer);
  font-size: 13px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 700px) { padding: 0; }
`;

const WorkplaceTag = styled.span`
  display: inline-block;
  padding: 5px 11px;
  border-radius: 999px;
  background: ${(props) => props.theme.accent};
  color: ${(props) => props.theme.accentText};
  font-size: 14px;
`;

const AddHours = styled.span`
  display: inline-block;
  padding: 6px 9px;
  border: 1px solid ${(props) => props.theme.accent};
  border-radius: 6px;
  background: ${(props) => props.theme.backgroundSecondary};
  color: ${(props) => props.theme.accent};
  font-size: 12px;
  font-weight: 600;

  white-space: nowrap;
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

const WorkplaceField = styled.label`
  display: grid;
  gap: 5px;
  color: ${(props) => props.theme.textSecondary};
  font-size: 12px;
`;

const WorkplaceChoice = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;

  button, input { min-width: 0; border: 1px solid ${(props) => props.theme.inputBorder}; border-radius: 6px; background: ${(props) => props.theme.background}; color: ${(props) => props.theme.textSecondary}; font-size: 12px; padding: 7px 9px; }
  button { cursor: var(--pointer); }
  button { display: inline-flex; align-items: center; gap: 5px; }
  button svg { width: 15px; height: 15px; }
  button[data-active="true"] { border-color: ${(props) => props.theme.accent}; background: ${(props) => props.theme.backgroundSecondary}; color: ${(props) => props.theme.accent}; }
  input { width: 132px; }

  @media (max-width: 700px) { flex-wrap: wrap; }
`;

const LedgerActions = styled.div`
  display: flex;
  gap: 6px;
  > button { white-space: nowrap; }
`;

const LedgerFooter = styled.div`
  display: flex;
  justify-content: center;
  padding: 26px 0 0;

  @media (max-width: 700px) { display: none; }
`;

const MobileActions = styled.div`
  display: none;

  @media (max-width: 700px) {
    position: fixed;
    z-index: 4;
    right: 12px;
    bottom: 12px;
    left: 12px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px;
    padding: 8px;
    border: 1px solid ${(props) => props.theme.inputBorder};
    border-radius: 12px;
    background: ${(props) => props.theme.background};
    box-shadow: 0 8px 24px rgba(0, 0, 0, .12);

    > button { min-height: 52px; }
    > button:last-child { justify-content: center; font-size: 15px; }
    &[data-editing="true"] { display: none; }
  }
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
