import {
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Menu,
  Settings,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type SheetType = "none" | "seek" | "units";
type SymbolChoice = "SPX" | "VIX";
type SeekPanel = "collapsed" | "date" | "time";

type SeekTime = { hour12: number; minute: number; period: "AM" | "PM" };

function wrapHour12(h: number, delta: number): number {
  let v = h + delta;
  while (v < 1) v += 12;
  while (v > 12) v -= 12;
  return v;
}

function wrapMinute(m: number, delta: number): number {
  return (((m + delta) % 60) + 60) % 60;
}

function formatSeekTimeLabel(t: SeekTime): string {
  return `${t.hour12}:${String(t.minute).padStart(2, "0")} ${t.period}`;
}

function formatSeekTimeShort(t: SeekTime): string {
  return `${t.hour12}:${String(t.minute).padStart(2, "0")}`;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Consecutive trading-style exp dates from 01-Jul-2025 (prototype). */
function formatExpiryDateRow(rowIndex: number): string {
  const base = new Date(2025, 6, 1);
  const d = new Date(base);
  d.setDate(base.getDate() + rowIndex);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTH_SHORT[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${mon}-${year}`;
}

function cellColor(row: number, col: number): string {
  if ((row + col) % 9 === 0) return "bg-[#efdbe0]";
  if ((row + col) % 2 === 0) return "bg-[#5ab768]";
  if ((row + col) % 3 === 0) return "bg-[#21a339]";
  return "bg-[#2ca643]";
}

const WHEEL_OFFSETS = [-2, -1, 0, 1, 2] as const;

function wheelButtonClass(selected: boolean, rowIndex: number): string {
  const base = "block w-full";
  if (selected) {
    return `${base} rounded-lg bg-slate-100 py-1 text-[36px] text-slate-800`;
  }
  const edge = rowIndex === 0 || rowIndex === 4;
  return `${base} ${edge ? "opacity-30" : "opacity-60"}`;
}

function TimeWheel({
  time,
  onTimeChange,
}: {
  time: SeekTime;
  onTimeChange: (next: SeekTime) => void;
}) {
  const hourCells = WHEEL_OFFSETS.map((d) => String(wrapHour12(time.hour12, d)));
  const minuteCells = WHEEL_OFFSETS.map((d) =>
    String(wrapMinute(time.minute, d)).padStart(2, "0"),
  );
  const periodCells =
    time.period === "AM"
      ? (["AM", "AM", "AM", "PM", "PM"] as const)
      : (["PM", "PM", "PM", "AM", "AM"] as const);

  return (
    <div className="rounded-md border border-slate-200 p-3 text-center text-slate-400">
      <div className="mx-auto grid max-w-[210px] grid-cols-3 items-center gap-4 text-[15px]">
        <div className="space-y-2">
          {WHEEL_OFFSETS.map((offset, i) => {
            const selected = offset === 0;
            return (
              <button
                key={`h-${offset}`}
                type="button"
                className={wheelButtonClass(selected, i)}
                onClick={() => {
                  if (offset === 0) return;
                  onTimeChange({ ...time, hour12: wrapHour12(time.hour12, offset) });
                }}
              >
                {hourCells[i]}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {WHEEL_OFFSETS.map((offset, i) => {
            const selected = offset === 0;
            return (
              <button
                key={`m-${offset}`}
                type="button"
                className={wheelButtonClass(selected, i)}
                onClick={() => {
                  if (offset === 0) return;
                  onTimeChange({ ...time, minute: wrapMinute(time.minute, offset) });
                }}
              >
                {minuteCells[i]}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          {periodCells.map((label, i) => {
            const selected = i === 2;
            const isAm = label === "AM";
            return (
              <button
                key={`${label}-${i}`}
                type="button"
                className={wheelButtonClass(selected, i)}
                onClick={() => {
                  if (selected) return;
                  onTimeChange({ ...time, period: isAm ? "AM" : "PM" });
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** November 2023 grid: Sun=0 … Sat=6. Outside = adjacent month. */
const NOV_2023_WEEKS: { day: number; outside: boolean; col: number }[][] = [
  [
    { day: 29, outside: true, col: 0 },
    { day: 30, outside: true, col: 1 },
    { day: 31, outside: true, col: 2 },
    { day: 1, outside: false, col: 3 },
    { day: 2, outside: false, col: 4 },
    { day: 3, outside: false, col: 5 },
    { day: 4, outside: false, col: 6 },
  ],
  [
    { day: 5, outside: false, col: 0 },
    { day: 6, outside: false, col: 1 },
    { day: 7, outside: false, col: 2 },
    { day: 8, outside: false, col: 3 },
    { day: 9, outside: false, col: 4 },
    { day: 10, outside: false, col: 5 },
    { day: 11, outside: false, col: 6 },
  ],
  [
    { day: 12, outside: false, col: 0 },
    { day: 13, outside: false, col: 1 },
    { day: 14, outside: false, col: 2 },
    { day: 15, outside: false, col: 3 },
    { day: 16, outside: false, col: 4 },
    { day: 17, outside: false, col: 5 },
    { day: 18, outside: false, col: 6 },
  ],
];

function dayCellClass(cell: { day: number; outside: boolean; col: number }): string {
  const weekend = cell.col === 0 || cell.col === 6;
  const base =
    "flex h-9 w-full items-center justify-center rounded-lg text-[15px] leading-none tabular-nums";

  if (cell.outside) {
    return `${base} text-slate-300`;
  }
  if (cell.day === 16) {
    return `${base} bg-[#3b82f6] font-medium text-white shadow-sm`;
  }
  if (cell.day === 15) {
    return `${base} font-medium text-[#2563eb]`;
  }
  if (weekend) {
    return `${base} font-medium text-slate-500`;
  }
  return `${base} font-medium text-[#1e293b]`;
}

function DateMiniCalendar() {
  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          aria-label="Previous month"
        >
          <ChevronLeft className="size-5" strokeWidth={2} />
        </button>
        <div className="text-[15px] font-semibold tracking-tight text-[#1e293b]">
          November 2023
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
          aria-label="Next month"
        >
          <ChevronRight className="size-5" strokeWidth={2} />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-0 text-center text-[12px] font-medium text-slate-400">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {NOV_2023_WEEKS.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((cell) => (
              <div key={`${wi}-${cell.day}-${cell.outside}`} className="flex justify-center">
                <span className={dayCellClass(cell)}>{cell.day}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3 text-[12px] text-slate-500">
        <span className="inline-block size-2.5 shrink-0 rounded-sm bg-[#3b82f6]" aria-hidden />
        Selected Date
      </div>
    </div>
  );
}

export function MobilePrototype() {
  const [sheet, setSheet] = useState<SheetType>("none");
  const [seekPanel, setSeekPanel] = useState<SeekPanel>("collapsed");
  const [symbol, setSymbol] = useState<SymbolChoice>("SPX");
  const [seekTime, setSeekTime] = useState<SeekTime>({
    hour12: 11,
    minute: 20,
    period: "AM",
  });

  const rows = useMemo(() => Array.from({ length: 120 }), []);

  return (
    <div className="h-dvh overflow-hidden bg-[#081a3a] text-slate-900">
      <div className="relative mx-auto flex h-dvh w-full flex-col bg-white">
        <div className="bg-[#062a56] px-3 pb-3 pt-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Menu className="size-5" />
              <span className="text-xl font-medium">IV Depth</span>
            </div>
            <div className="text-sm text-[#00d16e]">6840.20 +0.00 (+0.00%)</div>
          </div>
        </div>

        <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] bg-[#6f809d] text-center text-[12px] text-white">
          <div className="border-r border-slate-300 py-2">Exp. Date</div>
          {["75%", "80%", "85%", "90%"].map((h) => (
            <div key={h} className="py-2">
              {h}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-auto pb-16">
          {rows.map((_, i) => (
            <div key={i} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_1fr] text-center text-[12px]">
              <div className="border-r border-slate-300 bg-[#637793] py-2 text-white">
                {formatExpiryDateRow(i)}
              </div>
              {[0, 1, 2, 3].map((c) => (
                <div key={c} className={`${cellColor(i, c)} py-2 text-[#283d54]`}>
                  11.20%
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 flex items-center border-t bg-white px-3 py-2 text-sm gap-[clamp(14px,2vw,18px)]">
          <div className="flex min-w-0 flex-1 items-center justify-between">
            <button className="flex items-center gap-0.3 text-slate-700">
              <CalendarDays className="size-5" />
              <ChevronDown className="size-5 text-slate-400" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-0.3 text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                >
                  <span className="font-medium">{symbol}</span>
                  <ChevronDown className="size-5 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-32">
                <DropdownMenuRadioGroup
                  value={symbol}
                  onValueChange={(v) => setSymbol(v as SymbolChoice)}
                >
                  <DropdownMenuRadioItem value="SPX">SPX</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="VIX">VIX</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              className="flex items-center gap-1 text-slate-800 whitespace-nowrap"
              onClick={() => {
                setSheet("seek");
                setSeekPanel("collapsed");
              }}
            >
              <span className="size-2 rounded-full bg-amber-400" />
              <span>Mar 20, {formatSeekTimeShort(seekTime)}</span>
              <ChevronDown className="size-5 text-slate-400" />
            </button>
            <button
              className="flex items-center gap-0.3 text-slate-700 whitespace-nowrap"
              onClick={() => setSheet("units")}
            >
              <span>Exp/K</span>
              <ChevronDown className="size-4 text-slate-400" />
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-[clamp(10px,2vw,18px)]">
            <button className="text-slate-700">
              <SlidersHorizontal className="size-5.5" />
            </button>
            <button className="text-[#1e90e5]">
              <Settings className="size-5.5" />
            </button>
          </div>
        </div>
      </div>

      {sheet !== "none" && (
        <div className="fixed inset-0 z-50 bg-black/20">
          <div className="absolute inset-x-0 bottom-0 w-full max-w-none rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom,0px)] shadow-2xl">
            {sheet === "seek" ? (
              <>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 text-[18px] font-semibold text-[#222]">
                    Seek to Time
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button type="button" className="text-[#2f6ebf] underline">
                      Jump to Latest
                    </button>
                    <button type="button" onClick={() => setSheet("none")} aria-label="Close">
                      <X className="size-6" />
                    </button>
                  </div>
                </div>
                <div className="border-t px-4 py-3">
                  <button
                    className="mb-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-3 text-[16px] font-medium text-[#2b2b2b]"
                    onClick={() =>
                      setSeekPanel((p) => (p === "date" ? "collapsed" : "date"))
                    }
                  >
                    <Calendar className="size-5" />
                    Thursday March 20th <ChevronDown className="size-5 text-slate-400" />
                  </button>

                  {seekPanel === "date" && <DateMiniCalendar />}

                  <button
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border px-3 py-3 text-[16px] font-medium text-[#2b2b2b]"
                    onClick={() =>
                      setSeekPanel((p) => (p === "time" ? "collapsed" : "time"))
                    }
                  >
                    <Clock3 className="size-5" />
                    {formatSeekTimeLabel(seekTime)}{" "}
                    <ChevronDown className="size-5 text-slate-400" />
                  </button>
                  {seekPanel === "time" && (
                    <div className="mt-3">
                      <TimeWheel time={seekTime} onTimeChange={setSeekTime} />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 border-t px-4 pb-4 pt-4">
                  <button className="flex-1 rounded-md border px-3 py-2 text-[18px] font-medium text-[#60779a]">
                    Cancel
                  </button>
                  <button className="flex-1 rounded-md bg-[#2f6ebf] px-3 py-2 text-[18px] font-semibold text-white">
                    Apply
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-[18px] font-semibold text-[#222]">Table Units</div>
                  <button onClick={() => setSheet("none")}>
                    <X className="size-6" />
                  </button>
                </div>
                <div className="border-t px-4 py-3">
                  <div className="mb-2 text-[14px] font-semibold tracking-wide text-slate-700">
                    Rows
                  </div>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <button className="rounded-md border px-3 py-2 text-[16px] font-medium">Expirations</button>
                    <button className="rounded-md bg-[#1e90e5] px-3 py-2 text-[16px] font-medium text-white">
                      Tenors
                    </button>
                  </div>
                  <div className="mb-2 text-[14px] font-semibold tracking-wide text-slate-700">
                    Columns
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <button className="rounded-md border px-3 py-2 text-[16px] font-medium">Strike</button>
                    <button className="rounded-md bg-[#1e90e5] px-3 py-2 text-[16px] font-medium text-white">
                      Moneyness
                    </button>
                    <button className="rounded-md border px-3 py-2 text-[16px] font-medium">Delta</button>
                  </div>
                </div>

                <div className="flex gap-3 border-t pt-4 px-4 pb-4">
                  <button className="flex-1 rounded-md border px-3 py-2 text-[18px] font-medium text-[#60779a]">
                    Cancel
                  </button>
                  <button className="flex-1 rounded-md bg-[#2f6ebf] px-3 py-2 text-[18px] font-semibold text-white">
                    Apply
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

