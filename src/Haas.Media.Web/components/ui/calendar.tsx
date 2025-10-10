"use client";

import { getDay, getDaysInMonth, isSameDay } from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { createContext, Dispatch, ReactNode, SetStateAction, useCallback, useContext, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CalendarState = {
  month: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  year: number;
};

type CalendarContextValue = {
  locale: Intl.LocalesArgument;
  startDay: number;
  month: CalendarState["month"];
  year: CalendarState["year"];
  setMonth: Dispatch<SetStateAction<CalendarState["month"]>>;
  setYear: Dispatch<SetStateAction<CalendarState["year"]>>;
};

const defaultDate = new Date();

const CalendarContext = createContext<CalendarContextValue>({
  locale: "en-US",
  startDay: 0,
  month: defaultDate.getMonth() as CalendarState["month"],
  year: defaultDate.getFullYear(),
  setMonth: () => {
    throw new Error("CalendarProvider is required to use calendar month state");
  },
  setYear: () => {
    throw new Error("CalendarProvider is required to use calendar year state");
  },
});

export const useCalendarMonth = (): [CalendarState["month"], Dispatch<SetStateAction<CalendarState["month"]>>] => {
  const { month, setMonth } = useContext(CalendarContext);
  return [month, setMonth];
};

export const useCalendarYear = (): [CalendarState["year"], Dispatch<SetStateAction<CalendarState["year"]>>] => {
  const { year, setYear } = useContext(CalendarContext);
  return [year, setYear];
};

export type Status = {
  id: string;
  name: string;
  color: string;
};

export type Feature<T = unknown> = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status: Status;
  data?: T;
};

export const monthsForLocale = (localeName: Intl.LocalesArgument, monthFormat: Intl.DateTimeFormatOptions["month"] = "long") => {
  const format = new Intl.DateTimeFormat(localeName, { month: monthFormat }).format;

  return [...new Array(12).keys()].map((m) => format(new Date(Date.UTC(2021, m, 2))));
};

export const daysForLocale = (locale: Intl.LocalesArgument, startDay: number) => {
  const weekdays: string[] = [];
  const baseDate = new Date(2024, 0, startDay);

  for (let i = 0; i < 7; i++) {
    weekdays.push(new Intl.DateTimeFormat(locale, { weekday: "short" }).format(baseDate));
    baseDate.setDate(baseDate.getDate() + 1);
  }

  return weekdays;
};

type OutOfBoundsDayProps = {
  day: number;
};

const OutOfBoundsDay = ({ day }: OutOfBoundsDayProps) => (
  <div className="relative h-full w-full bg-secondary p-2 text-right text-xs text-muted-foreground">{day}</div>
);

export type CalendarBodyProps<T = unknown> = {
  features: Feature<T>[];
  children: (props: { feature: Feature<T>; isSelected: boolean }) => ReactNode;
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date;
  today?: Date;
};

export function CalendarBody<T>({ features, children, onSelectDate, selectedDate, today }: CalendarBodyProps<T>) {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const { startDay } = useContext(CalendarContext);

  const currentMonthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const daysInMonth = useMemo(() => getDaysInMonth(currentMonthDate), [currentMonthDate]);
  const firstDay = useMemo(() => (getDay(currentMonthDate) - startDay + 7) % 7, [currentMonthDate, startDay]);

  const prevMonthData = useMemo(() => {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthDays = getDaysInMonth(new Date(prevMonthYear, prevMonth, 1));
    const prevMonthDaysArray = Array.from({ length: prevMonthDays }, (_, i) => i + 1);

    return { prevMonthDays, prevMonthDaysArray };
  }, [month, year]);

  const nextMonthDaysArray = useMemo(() => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthDays = getDaysInMonth(new Date(nextMonthYear, nextMonth, 1));

    return Array.from({ length: nextMonthDays }, (_, i) => i + 1);
  }, [month, year]);

  const featuresByDay = useMemo(() => {
    const result: Record<number, Feature<T>[]> = {};

    for (const feature of features) {
      const featureDate = new Date(feature.endAt.getFullYear(), feature.endAt.getMonth(), feature.endAt.getDate());

      if (featureDate.getMonth() === month && featureDate.getFullYear() === year) {
        const dayIndex = featureDate.getDate();
        result[dayIndex] = [...(result[dayIndex] ?? []), feature];
      }
    }

    for (const day of Object.keys(result)) {
      result[Number(day)]?.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [features, month, year]);

  const days: ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    const day = prevMonthData.prevMonthDaysArray[prevMonthData.prevMonthDays - firstDay + i];

    if (day) {
      days.push(
        <div className="relative aspect-square overflow-hidden border-r border-t" key={`prev-${i}`}>
          <OutOfBoundsDay day={day} />
        </div>,
      );
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
    const isToday = today ? isSameDay(date, today) : false;
    const featuresForDay = featuresByDay[day] ?? [];
    const hasFeatures = featuresForDay.length > 0;

    days.push(
      <div className="relative aspect-square border-r border-t" key={`day-${day}`}>
        <button
          className={cn(
            "group flex h-full w-full flex-col gap-2 p-3 text-left text-xs text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            hasFeatures ? "bg-muted/50 hover:bg-muted" : "bg-background hover:bg-muted/40",
            isToday && "ring-2 ring-inset ring-blue-500/50 bg-blue-500/5",
            isSelected && "ring-2 ring-inset ring-primary/60 bg-primary/10 text-foreground",
          )}
          onClick={() => onSelectDate?.(date)}
          type="button"
        >
          <span className="flex items-center justify-between text-foreground">
            <span className={cn("font-medium", isToday && "text-blue-600 dark:text-blue-400")}>{day}</span>
            {hasFeatures && <span className="h-2 w-2 rounded-full bg-primary/70" aria-hidden="true" />}
          </span>
          <div className="flex flex-col gap-1">
            {featuresForDay.slice(0, 3).map((feature) => (
              <div key={feature.id}>{children({ feature, isSelected })}</div>
            ))}
            {featuresForDay.length > 3 && <span className="text-muted-foreground text-[0.7rem]">+{featuresForDay.length - 3} more</span>}
          </div>
        </button>
      </div>,
    );
  }

  const remainingDays = 7 - ((firstDay + daysInMonth) % 7);
  if (remainingDays < 7) {
    for (let i = 0; i < remainingDays; i++) {
      const day = nextMonthDaysArray[i];

      if (day) {
        days.push(
          <div className="relative aspect-square overflow-hidden border-r border-t" key={`next-${i}`}>
            <OutOfBoundsDay day={day} />
          </div>,
        );
      }
    }
  }

  return <div className="grid flex-grow grid-cols-7 border-b border-l">{days}</div>;
}

export type CalendarDatePickerProps = {
  className?: string;
  children: ReactNode;
};

export function CalendarDatePicker({ className, children }: CalendarDatePickerProps) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

export type CalendarMonthPickerProps = {
  className?: string;
};

export function CalendarMonthPicker({ className }: CalendarMonthPickerProps) {
  const [month, setMonth] = useCalendarMonth();
  const { locale } = useContext(CalendarContext);

  const monthData = useMemo<{ value: string; label: string }[]>(
    () => monthsForLocale(locale).map((label, index) => ({ value: index.toString(), label })),
    [locale],
  );

  return (
    <Select value={month.toString()} onValueChange={(value) => setMonth(Number.parseInt(value, 10) as CalendarState["month"])}>
      <SelectTrigger className={cn("w-40 capitalize", className)}>
        <SelectValue placeholder="Select month" />
      </SelectTrigger>
      <SelectContent>
        {monthData.map((item) => (
          <SelectItem className="capitalize" key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type CalendarYearPickerProps = {
  className?: string;
  start: number;
  end: number;
};

export function CalendarYearPicker({ className, start, end }: CalendarYearPickerProps) {
  const [year, setYear] = useCalendarYear();

  const years = useMemo<{ value: string; label: string }[]>(() => {
    return Array.from({ length: end - start + 1 }, (_, i) => {
      const value = (start + i).toString();
      return { value, label: value };
    });
  }, [start, end]);

  return (
    <Select value={year.toString()} onValueChange={(value) => setYear(Number.parseInt(value, 10))}>
      <SelectTrigger className={cn("w-32", className)}>
        <SelectValue placeholder="Select year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type CalendarDatePaginationProps = {
  className?: string;
};

export function CalendarDatePagination({ className }: CalendarDatePaginationProps) {
  const [month, setMonth] = useCalendarMonth();
  const [year, setYear] = useCalendarYear();

  const handlePreviousMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth((month - 1) as CalendarState["month"]);
    }
  }, [month, year, setMonth, setYear]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth((month + 1) as CalendarState["month"]);
    }
  }, [month, year, setMonth, setYear]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button onClick={handlePreviousMonth} size="icon" variant="ghost">
        <ChevronLeftIcon size={16} />
      </Button>
      <Button onClick={handleNextMonth} size="icon" variant="ghost">
        <ChevronRightIcon size={16} />
      </Button>
    </div>
  );
}

export type CalendarDateProps = {
  children: ReactNode;
};

export function CalendarDate({ children }: CalendarDateProps) {
  return <div className="flex flex-wrap items-center justify-between gap-3 p-3">{children}</div>;
}

export type CalendarHeaderProps = {
  className?: string;
};

export function CalendarHeader({ className }: CalendarHeaderProps) {
  const { locale, startDay } = useContext(CalendarContext);

  const daysData = useMemo(() => daysForLocale(locale, startDay), [locale, startDay]);

  return (
    <div className={cn("grid flex-grow grid-cols-7 border-y text-right text-xs text-muted-foreground", className)}>
      {daysData.map((day) => (
        <div className="p-3" key={day}>
          {day}
        </div>
      ))}
    </div>
  );
}

export type CalendarItemProps<T = unknown> = {
  feature: Feature<T>;
  className?: string;
};

export function CalendarItem<T>({ feature, className }: CalendarItemProps<T>) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: feature.status.color }} />
      <span className="truncate text-foreground text-xs font-medium">{feature.name}</span>
    </div>
  );
}

export type CalendarProviderProps = {
  locale?: Intl.LocalesArgument;
  startDay?: number;
  children: ReactNode;
  className?: string;
};

export function CalendarProvider({ locale = "en-US", startDay = 0, children, className }: CalendarProviderProps) {
  const [month, setMonth] = useState<CalendarState["month"]>(() => new Date().getMonth() as CalendarState["month"]);
  const [year, setYear] = useState<CalendarState["year"]>(() => new Date().getFullYear());

  const contextValue = useMemo(
    () => ({ locale, startDay, month, year, setMonth, setYear }),
    [locale, startDay, month, year, setMonth, setYear],
  );

  return (
    <CalendarContext.Provider value={contextValue}>
      <div className={cn("relative flex flex-col", className)}>{children}</div>
    </CalendarContext.Provider>
  );
}
