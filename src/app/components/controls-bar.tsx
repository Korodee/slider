import { ChevronDown, ChevronsLeft, ChevronsRight, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Slider } from "./ui/slider";
import { Calendar } from "./ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

/** Minutes from midnight — session window */
const MARKET_OPEN = 8 * 60;
const MARKET_CLOSE = 17 * 60;
const TOTAL_MARKET_MINUTES = MARKET_CLOSE - MARKET_OPEN;

/** Daily: day index 0 = oldest day in range, DAILY_INDEX_MAX = today (chevrons only, no slider) */
const DAILY_INDEX_MAX = 30;

/** 24h display, e.g. 08:00, 17:00 — no AM/PM */
function formatTime24(minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatIntradayHelperRange(
  availableStartFromOpen: number,
  availableEndFromOpen: number,
): string {
  const startTotal = MARKET_OPEN + availableStartFromOpen;
  const endTotal = MARKET_OPEN + availableEndFromOpen;
  return `Input a time between ${formatTime24(startTotal)} and ${formatTime24(endTotal)}.`;
}

/** Strip to at most 4 digits; show as HH:mm while typing (e.g. 123 → 12:3) */
function formatTimeDraftDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Parse draft from digit positions: HH then MM (partial OK on blur) */
function parseTimeDraftToMinutes(draft: string): number | null {
  const d = draft.replace(/\D/g, "").slice(0, 4);
  if (d.length === 0) return null;
  let h: number;
  let m: number;
  if (d.length <= 2) {
    h = parseInt(d, 10);
    if (Number.isNaN(h) || h < 0 || h > 23) return null;
    m = 0;
  } else {
    h = parseInt(d.slice(0, 2), 10);
    if (Number.isNaN(h) || h < 0 || h > 23) return null;
    m = parseInt(d.slice(2), 10);
    if (Number.isNaN(m) || m < 0 || m > 59) return null;
  }
  return h * 60 + m;
}

/** Calendar day for daily day index (local) */
function getDateForDailyIndex(index: number): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysOffset = DAILY_INDEX_MAX - index;
  const d = new Date(today);
  d.setDate(today.getDate() - daysOffset);
  return d;
}

function formatDateLabel(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: "short" });
  return `${month} ${day}`;
}

function formatDateLabelWithYear(date: Date): string {
  return `${formatDateLabel(date)}, ${date.getFullYear()}`;
}

function getDailyIndexFromDate(date: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const picked = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayMs = 24 * 60 * 60 * 1000;
  const daysFromToday = Math.round((today.getTime() - picked.getTime()) / dayMs);
  // daysFromToday: 0 for today, 1 for yesterday, ... DAILY_INDEX_MAX for oldest.
  const idx = DAILY_INDEX_MAX - daysFromToday;
  return Math.max(0, Math.min(DAILY_INDEX_MAX, idx));
}

/** Prototype stub: "latest available" intraday minute == now, clamped to market hours. */
function getIntradayAvailableEndMinutesFromOpen(now: Date): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const clampedMinutes = Math.max(
    MARKET_OPEN,
    Math.min(MARKET_CLOSE, nowMinutes),
  );
  return clampedMinutes - MARKET_OPEN; // 0..TOTAL_MARKET_MINUTES
}

export function ControlsBar() {
  const [isLive, setIsLive] = useState(false);
  const [selectedTime, setSelectedTime] = useState(187);
  const [timeMode, setTimeMode] = useState<"intraday" | "daily">("intraday");
  /** Daily: 0 … DAILY_INDEX_MAX = today */
  const [dailyIndex, setDailyIndex] = useState(DAILY_INDEX_MAX);
  /** Data mode dropdown — close after choosing Daily (or Intraday) */
  const [dataModeMenuOpen, setDataModeMenuOpen] = useState(false);
  /** Intraday "latest available data" cutoff (minutes from market open). */
  const [intradayAvailableEnd, setIntradayAvailableEnd] = useState(() =>
    getIntradayAvailableEndMinutesFromOpen(new Date()),
  );
  /** If we're not looking at today, prototype assumes the full market day is available. */
  const intradayAvailableEndEffective =
    dailyIndex === DAILY_INDEX_MAX ? intradayAvailableEnd : TOTAL_MARKET_MINUTES;
  /** Intraday earliest available data (minutes from market open). Prototype defaults to market open. */
  const [intradayAvailableStart] = useState(0);
  /** Show the inline calendar when user clicks the date label. */
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  /** While focused, edits go here so partial HH:mm is allowed */
  const [specificTimeDraft, setSpecificTimeDraft] = useState<string | null>(null);

  useEffect(() => {
    const tick = () =>
      setIntradayAvailableEnd(
        getIntradayAvailableEndMinutesFromOpen(new Date()),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (timeMode !== "intraday") return;
    const clamped = Math.max(
      intradayAvailableStart,
      Math.min(selectedTime, intradayAvailableEndEffective),
    );
    if (clamped !== selectedTime) setSelectedTime(clamped);
    setIsLive(clamped === intradayAvailableEndEffective);
  }, [
    dailyIndex,
    intradayAvailableEnd,
    intradayAvailableEndEffective,
    intradayAvailableStart,
    selectedTime,
    timeMode,
  ]);

  const minutesFromMidnight = MARKET_OPEN + selectedTime;
  const selectedDailyDate = getDateForDailyIndex(dailyIndex);

  const getTimeFromMinutes = (offsetFromOpen: number) =>
    formatTime24(MARKET_OPEN + offsetFromOpen);

  const applyMinutesFromMidnight = (total: number) => {
    const minTotal =
      timeMode === "intraday"
        ? MARKET_OPEN + intradayAvailableStart
        : MARKET_OPEN;
    const maxTotal =
      timeMode === "intraday"
        ? MARKET_OPEN + intradayAvailableEndEffective
        : MARKET_CLOSE;
    const clampedTotal = Math.max(minTotal, Math.min(maxTotal, total));
    const fromOpen = clampedTotal - MARKET_OPEN;
    setSelectedTime(fromOpen);
    const latestFromOpen =
      timeMode === "intraday"
        ? intradayAvailableEndEffective
        : TOTAL_MARKET_MINUTES;
    setIsLive(fromOpen === latestFromOpen);
  };

  const commitSpecificTimeInput = () => {
    if (specificTimeDraft === null) return;
    const parsed = parseTimeDraftToMinutes(specificTimeDraft);
    if (parsed !== null) applyMinutesFromMidnight(parsed);
    setSpecificTimeDraft(null);
  };

  const commitSpecificTimeInputAndClose = () => {
    commitSpecificTimeInput();
    setDataModeMenuOpen(false);
  };

  const jumpBackward = () => {
    if (timeMode === "daily") {
      setDailyIndex((i) => Math.max(0, i - 1));
      return;
    }
    setSelectedTime((t) => Math.max(intradayAvailableStart, t - 1));
    setIsLive(false);
  };

  const jumpForward = () => {
    if (timeMode === "daily") {
      setDailyIndex((i) => Math.min(DAILY_INDEX_MAX, i + 1));
      return;
    }
    const next = Math.min(intradayAvailableEndEffective, selectedTime + 1);
    setSelectedTime(next);
    setIsLive(next === intradayAvailableEndEffective);
  };

  const handleSliderChange = (value: number) => {
    const clamped =
      timeMode === "intraday"
        ? Math.max(
            intradayAvailableStart,
            Math.min(intradayAvailableEndEffective, value),
          )
        : value;
    setSelectedTime(clamped);
    setIsLive(clamped === intradayAvailableEndEffective);
  };

  const jumpToLatest = () => {
    setSelectedTime(intradayAvailableEndEffective);
    setIsLive(true);
  };

  const handleModeChange = (mode: "intraday" | "daily") => {
    setTimeMode(mode);
    if (mode === "daily") {
      setDailyIndex(DAILY_INDEX_MAX);
    }
    setDataModeMenuOpen(false);
  };

  const atDailyStart = timeMode === "daily" && dailyIndex === 0;
  const atDailyEnd = timeMode === "daily" && dailyIndex === DAILY_INDEX_MAX;
  const atIntradayStart =
    timeMode === "intraday" && selectedTime === intradayAvailableStart;
  const atIntradayEnd =
    timeMode === "intraday" && selectedTime === intradayAvailableEndEffective;

  const backDisabled = timeMode === "daily" ? atDailyStart : atIntradayStart;
  const forwardDisabled = timeMode === "daily" ? atDailyEnd : atIntradayEnd;

  const liveDotGreen =
    timeMode === "daily"
      ? dailyIndex === DAILY_INDEX_MAX
      : isLive;
  const isToday = dailyIndex === DAILY_INDEX_MAX;

  return (
    <div className="flex w-full justify-center px-4 pt-8">
      <div
        className={
          timeMode === "daily"
            ? "flex w-fit max-w-full items-center gap-2 rounded-xl border border-slate-600/70 bg-slate-900/95 px-2.5 py-2 shadow-lg backdrop-blur-sm"
            : "flex w-full max-w-lg items-center gap-1 rounded-xl border border-slate-600/70 bg-slate-900/95 px-4 py-2.5 shadow-lg backdrop-blur-sm"
        }
        data-slot="time-scrubber"
      >
        <button
          type="button"
          onClick={jumpBackward}
          disabled={backDisabled}
          className="shrink-0 rounded-md p-1.5 text-blue-400 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title={timeMode === "daily" ? "Previous day" : "Jump back 1 minute"}
        >
          <ChevronsLeft className="size-5" strokeWidth={2.5} />
        </button>

        {timeMode === "intraday" && (
          <div className="min-w-0 flex-1 px-1">
            <Slider
              value={[selectedTime]}
              onValueChange={(v) => handleSliderChange(v[0] ?? 0)}
                  min={intradayAvailableStart}
              max={TOTAL_MARKET_MINUTES}
                  availableMax={intradayAvailableEndEffective}
              step={1}
              className="w-full **:data-[slot=slider-track]:h-2 **:data-[slot=slider-track]:bg-slate-600/90 **:data-[slot=slider-range]:bg-blue-500 **:data-[slot=slider-thumb]:size-5 **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:border-slate-800 **:data-[slot=slider-thumb]:bg-white **:data-[slot=slider-thumb]:shadow-md"
            />
          </div>
        )}

        <DropdownMenu open={dataModeMenuOpen} onOpenChange={setDataModeMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={
                timeMode === "daily"
                  ? "inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-center outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  : "inline-flex shrink-0 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-left outline-none ring-0 ring-offset-0 hover:opacity-90 focus-visible:outline-none focus-visible:ring-0 data-[state=open]:ring-0"
              }
              aria-label={
                timeMode === "daily"
                  ? `${formatDateLabel(selectedDailyDate)}, open menu`
                  : `${formatDateLabel(selectedDailyDate)}, ${getTimeFromMinutes(selectedTime)}`
              }
            >
              {timeMode === "daily" ? (
                <span className="text-base font-bold leading-none text-white">
                  {formatDateLabel(selectedDailyDate)}
                </span>
              ) : (
                <>
                  <span
                    className={`text-[15px] font-medium tabular-nums ${
                      isToday ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {formatDateLabel(selectedDailyDate)}, {getTimeFromMinutes(selectedTime)}
                  </span>
                  <ChevronDown className="size-3.5 shrink-0 text-slate-400" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="center"
            className="w-[min(100vw-2rem,20rem)] p-0"
          >
            <div className="px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Date
              </p>
              {/* <div className="mt-2 h-px bg-border" /> */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setDailyIndex((i) => Math.max(0, i - 1))}
                  disabled={dailyIndex === 0}
                  className="rounded-md p-1 text-slate-400 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Previous date"
                >
                  <ChevronsLeft className="size-4" strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((v) => !v)}
                  className="rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition-colors hover:bg-muted dark:text-slate-200 tabular-nums"
                  aria-label="Open calendar"
                  aria-expanded={isCalendarOpen}
                >
                  {formatDateLabelWithYear(selectedDailyDate)}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDailyIndex((i) => Math.min(DAILY_INDEX_MAX, i + 1))
                  }
                  disabled={dailyIndex === DAILY_INDEX_MAX}
                  className="rounded-md p-1 text-slate-400 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Next date"
                >
                  <ChevronsRight className="size-4" strokeWidth={2.2} />
                </button>
              </div>
              {/* <div className="mt-2 h-px bg-border" /> */}
            </div>

            {isCalendarOpen && (
              <div className="px-3 pb-3">
                <Calendar
                  mode="single"
                  selected={selectedDailyDate}
                  className="bg-transparent p-0"
                  classNames={{
                    root: "w-full relative",
                    months: "w-full",
                  }}
                  onSelect={(d) => {
                    if (!d) return;
                    setDailyIndex(getDailyIndexFromDate(d));
                    setIsCalendarOpen(false);
                  }}
                  disabled={(d) => {
                    const now = new Date();
                    const today = new Date(
                      now.getFullYear(),
                      now.getMonth(),
                      now.getDate(),
                    );
                    const minDate = new Date(today);
                    minDate.setDate(today.getDate() - DAILY_INDEX_MAX);
                    return d < minDate || d > today;
                  }}
                />
              </div>
            )}
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Data mode</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleModeChange("intraday")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    timeMode === "intraday"
                      ? "border-blue-500 bg-blue-500/10 font-medium text-blue-700 dark:text-blue-300"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  Intraday
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange("daily")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                    timeMode === "daily"
                      ? "border-blue-500 bg-blue-500/10 font-medium text-blue-700 dark:text-blue-300"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  Daily
                </button>
              </div>
            </div>

            {timeMode === "intraday" && (
              <div className="space-y-2 px-3 py-3">
                <label
                  htmlFor="time-specific-input"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                >
                  Enter Specific Time
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Clock
                      className="pointer-events-none absolute right-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <input
                      id="time-specific-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="--:--"
                      maxLength={5}
                      title="24-hour time — type up to 4 digits (HH:mm), session hours only"
                      aria-describedby="time-specific-hint"
                      value={
                        specificTimeDraft ?? formatTime24(minutesFromMidnight)
                      }
                      onFocus={() =>
                        setSpecificTimeDraft(formatTime24(minutesFromMidnight))
                      }
                      onChange={(e) =>
                        setSpecificTimeDraft(
                          formatTimeDraftDisplay(e.target.value),
                        )
                      }
                      onBlur={commitSpecificTimeInput}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                          setDataModeMenuOpen(false);
                        }
                      }}
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 pr-9 text-left text-sm font-medium tabular-nums text-slate-900 shadow-none outline-none focus:border-slate-300 focus:ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-600 dark:focus:ring-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={commitSpecificTimeInputAndClose}
                    className="h-10 shrink-0 rounded-md bg-blue-500/10 px-3 text-sm font-medium text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
                    title="Apply time"
                  >
                    Go
                  </button>
                </div>
                <p
                  id="time-specific-hint"
                  className="text-[11px] leading-snug text-muted-foreground"
                >
                  {formatIntradayHelperRange(
                    intradayAvailableStart,
                    intradayAvailableEndEffective,
                  )}
                </p>
              </div>
            )}

            {timeMode === "intraday" && (
              <div className="border-t border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={jumpToLatest}
                  className="w-full rounded-md bg-blue-500/10 py-2 text-sm font-medium text-blue-700 hover:bg-blue-500/20 dark:text-blue-300"
                >
                  Jump to latest
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <button
          type="button"
          onClick={jumpForward}
          disabled={forwardDisabled}
          className="shrink-0 rounded-md p-1.5 text-blue-400 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title={timeMode === "daily" ? "Next day" : "Jump forward 1 minute"}
        >
          <ChevronsRight className="size-5" strokeWidth={2.5} />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => {
                if (timeMode !== "intraday") return;
                jumpToLatest();
              }}
              disabled={timeMode !== "intraday"}
              className="relative flex size-8 shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={timeMode === "intraday" ? "Jump to latest" : "Jump to latest (disabled)"}
            >
              <span
                className={`size-3 rounded-full shadow-md ${liveDotGreen ? "bg-emerald-400" : "bg-orange-400"}`}
                aria-hidden
              />
              {timeMode === "intraday" && isLive && (
                <span className="absolute size-3 animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Jump to latest</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
