
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

// ============================================================
// 1. Status Colors
// ============================================================

const STATUS_COLORS = {
  quoting: {
    label: "Quoting",
    color: "#EF4444",
  },
  underreview: {
    label: "Under Review",
    color: "#EAB308",
  },
  awarded: {
    label: "Awarded",
    color: "#22C55E",
  },
  submitted: {
    label: "Submitted",
    color: "#A855F7",
  },
};

const DEFAULT_STATUS = {
  label: "Unknown",
  color: "#9CA3AF",
};

// ============================================================
// 2. Normalize Status
// ============================================================

function normalizeStatus(status) {
  return String(status || "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();
}

// ============================================================
// 3. Date Helpers
// ============================================================

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date) {
  if (!date) return null;

  const parsedDate =
    date instanceof Date ? date : new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return new Date(
    parsedDate.getFullYear(),
    parsedDate.getMonth(),
    parsedDate.getDate()
  );
}

// Convert Firestore Date / Timestamp / String

function parseDate(value) {
  if (!value) return null;

  if (typeof value?.toDate === "function") {
    value = value.toDate();
  }

  if (value instanceof Date) {
    return startOfDay(value);
  }

  // YYYY-MM-DD: parse as local date

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    const [year, month, day] = value
      .split("-")
      .map(Number);

    return startOfDay(
      new Date(year, month - 1, day)
    );
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : startOfDay(date);
}

// Calculate calendar days, avoiding DST issues

function daysBetween(start, end) {
  const a = startOfDay(start);
  const b = startOfDay(end);

  if (!a || !b) return 0;

  const startUTC = Date.UTC(
    a.getFullYear(),
    a.getMonth(),
    a.getDate()
  );

  const endUTC = Date.UTC(
    b.getFullYear(),
    b.getMonth(),
    b.getDate()
  );

  return Math.round(
    (endUTC - startUTC) / DAY_MS
  );
}

function formatDate(date) {
  if (!date) return "Not set";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDetailedDate(date) {
  if (!date) return "Not set";

  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================================
// 4. Month Names
// ============================================================

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec",
];

// ============================================================
// 5. Quote Timeline Page
// ============================================================

export default function QuoteTimelinePage() {
  const router = useRouter();

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Temporary drag preview
  // Firebase will only be updated after confirmation

  const [dragPreview, setDragPreview] = useState({});
  const [pendingChange, setPendingChange] = useState(null);
  const [savingChange, setSavingChange] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dragInfo, setDragInfo] = useState(null);
  const suppressClickRef = useRef(false);

  // Default current year

  const [year, setYear] = useState(
    new Date().getFullYear()
  );

  // ==========================================================
  // 6. Load Quote Collection
  // ==========================================================

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "quote"),

      (snapshot) => {
        const quoteList = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));

        console.log(
          "Quote Timeline - Loaded documents:",
          quoteList.length
        );

        console.log(
          "Quote Timeline - Quote data:",
          quoteList
        );

        setQuotes(quoteList);
        setLoading(false);
        setError("");
      },

      (err) => {
        console.error(
          "Failed to load quotes:",
          err
        );

        setError(
          err.message || "Failed to load Quote data."
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ==========================================================
  // 7. Timeline Date Range
  // ==========================================================

  const yearStart = useMemo(
    () => new Date(year, 0, 1),
    [year]
  );

  const yearEnd = useMemo(
    () => new Date(year + 1, 0, 1),
    [year]
  );

  const totalDays = daysBetween(
    yearStart,
    yearEnd
  );

  // ==========================================================
  // 8. Month Widths
  // Actual calendar month proportions
  // ==========================================================

  const monthWidths = useMemo(() => {
    return MONTHS.map((_, index) => {
      return new Date(
        year,
        index + 1,
        0
      ).getDate();
    });
  }, [year]);

  const monthGrid = monthWidths
    .map((days) => `${days}fr`)
    .join(" ");

  // ==========================================================
  // 9. Filter & Prepare Timeline Data
  // ==========================================================

  const timelineQuotes = useMemo(() => {
    return quotes
      .map((quote) => {
        const start = parseDate(
          quote.estStartDate
        );

        const end = parseDate(
          quote.estCompDate
        );

        const statusKey = normalizeStatus(
          quote.status
        );

        return {
          ...quote,
          start,
          end,
          statusKey,
        };
      })

      // Must have a valid start date

      .filter((quote) => {
        if (!quote.start) return false;

        // Invalid completion date range

        if (
          quote.end &&
          quote.end < quote.start
        ) {
          return false;
        }

        // With completion date:
        // Show projects overlapping selected year

        if (quote.end) {
          return (
            quote.start < yearEnd &&
            quote.end >= yearStart
          );
        }

        // Without completion date:
        // Show point only if start is in selected year

        return (
          quote.start >= yearStart &&
          quote.start < yearEnd
        );
      })

      // Sort by estimated start date

      .sort((a, b) => {
        return a.start - b.start;
      });

  }, [quotes, yearStart, yearEnd]);

  // ==========================================================
  // 10. Calculate Timeline Position & Width
  // ==========================================================

  function getTimelinePosition(quote) {
    const hasEndDate = Boolean(quote.end);

    // Start position

    const rawStartOffset = daysBetween(
      yearStart,
      quote.start
    );

    const startOffset = Math.max(
      0,
      Math.min(totalDays, rawStartOffset)
    );

    // End position

    const rawEndOffset = hasEndDate
      ? daysBetween(yearStart, quote.end) + 1
      : startOffset;

    const endOffset = Math.max(
      0,
      Math.min(totalDays, rawEndOffset)
    );

    const left =
      (startOffset / totalDays) * 100;

    const width = hasEndDate
      ? Math.max(
          0,
          ((endOffset - startOffset) /
            totalDays) * 100
        )
      : 0;

    return {
      left: `${left}%`,
      width: `${width}%`,
      hasEndDate,
    };
  }

  // ============================================================
  // 11. Drag Date Handles
  // Only left and right edges can be dragged.
  // Middle area is not draggable.
  // ============================================================

  function handleDatePointerDown(event, quote, edge) {
    if (
      event.button !== 0 ||
      pendingChange ||
      savingChange
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const row = event.currentTarget.closest(
      "[data-timeline-row]"
    );

    if (!row) return;

    const rowWidth = row.getBoundingClientRect().width;

    if (!rowWidth) return;

    const originalStart = new Date(quote.start);
    const originalEnd = new Date(quote.end);

    const pointerId = event.pointerId;
    const startX = event.clientX;

    suppressClickRef.current = true;

    setSaveError("");

    let latestStart = originalStart;
    let latestEnd = originalEnd;

    // Remove pointer event listeners

    const cleanup = () => {
      window.removeEventListener(
        "pointermove",
        handlePointerMove
      );

      window.removeEventListener(
        "pointerup",
        handlePointerUp
      );

      window.removeEventListener(
        "pointercancel",
        handlePointerCancel
      );
    };

    // Drag movement

    const handlePointerMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;

      moveEvent.preventDefault();

      const deltaDays = Math.round(
        ((moveEvent.clientX - startX) / rowWidth) *
          totalDays
      );

      // Adjust Start Date

      if (edge === "start") {
        latestStart = addDays(
          originalStart,
          deltaDays
        );

        if (latestStart > originalEnd) {
          latestStart = new Date(originalEnd);
        }
      }

      // Adjust End Date

      else {
        latestEnd = addDays(
          originalEnd,
          deltaDays
        );

        if (latestEnd < originalStart) {
          latestEnd = new Date(originalStart);
        }
      }

      setDragInfo({
            edge,
            date: edge === "start"
                ? latestStart
                : latestEnd,
            x: moveEvent.clientX,
            y: moveEvent.clientY,
            });

      // Update temporary preview only

      setDragPreview((previous) => ({
        ...previous,
        [quote.id]: {
          start: latestStart,
          end: latestEnd,
        },
      }));
    };

    // Drag completed

    const handlePointerUp = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return;

      cleanup();
      setDragInfo(null);

      const changed =
        latestStart.getTime() !==
          originalStart.getTime() ||
        latestEnd.getTime() !==
          originalEnd.getTime();

      if (changed) {
        // Open confirmation modal

        setPendingChange({
          id: quote.id,
          projectName:
            quote.projectName || "Untitled Project",

          oldStart: originalStart,
          oldEnd: originalEnd,

          newStart: latestStart,
          newEnd: latestEnd,
        });
      } else {
        // No change: remove preview

        setDragPreview((previous) => {
          const next = { ...previous };

          delete next[quote.id];

          return next;
        });
      }

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);
    };

    // Drag cancelled

    const handlePointerCancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;

      cleanup();
      setDragInfo(null);

      setDragPreview((previous) => {
        const next = { ...previous };

        delete next[quote.id];

        return next;
      });

      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 300);
    };

    window.addEventListener(
      "pointermove",
      handlePointerMove
    );

    window.addEventListener(
      "pointerup",
      handlePointerUp
    );

    window.addEventListener(
      "pointercancel",
      handlePointerCancel
    );
  }

  // ============================================================
  // 12. Cancel Pending Date Change
  // ============================================================

  function cancelDateChange() {
    if (!pendingChange) return;

    setDragPreview((previous) => {
      const next = { ...previous };

      delete next[pendingChange.id];

      return next;
    });

    setPendingChange(null);
    setSaveError("");
  }

  // ============================================================
  // 13. Confirm & Save Date Change
  // ============================================================

  async function confirmDateChange() {
    if (!pendingChange || savingChange) return;

    setSavingChange(true);
    setSaveError("");

    try {
      // Update Firestore

      await updateDoc(
        doc(db, "quote", pendingChange.id),
        {
          estStartDate: Timestamp.fromDate(
            pendingChange.newStart
          ),

          estCompDate: Timestamp.fromDate(
            pendingChange.newEnd
          ),

          updatedAt: serverTimestamp(),
        }
      );

      // Update local state

      setQuotes((previous) =>
        previous.map((quote) =>
          quote.id === pendingChange.id
            ? {
                ...quote,
                estStartDate: pendingChange.newStart,
                estCompDate: pendingChange.newEnd,
              }
            : quote
        )
      );

      // Remove temporary preview

      setDragPreview((previous) => {
        const next = { ...previous };

        delete next[pendingChange.id];

        return next;
      });

      setPendingChange(null);

    } catch (err) {
      console.error(
        "Failed to update Quote dates:",
        err
      );

      // Restore original Timeline display

      setDragPreview((previous) => {
        const next = { ...previous };

        delete next[pendingChange.id];

        return next;
      });

      setPendingChange(null);

      setSaveError(
        err.message ||
          "Failed to save date changes. Please try again."
      );

    } finally {
      setSavingChange(false);
    }
  }

  // ============================================================
  // 14. Year Navigation
  // ============================================================

  function previousYear() {
    setYear((prev) => prev - 1);
  }

  function nextYear() {
    setYear((prev) => prev + 1);
  }

  function goToCurrentYear() {
    setYear(new Date().getFullYear());
  }

  // ==========================================================
  // 15. Loading
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-sm text-gray-500">
          Loading Quote Timeline...
        </p>
      </div>
    );
  }

  // ==========================================================
  // 16. Error
  // ==========================================================

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-600">
        {error}
      </div>
    );
  }

  // ==========================================================
  // 17. Page
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-7xl space-y-6">

        {/* Date Save Error */}

        {saveError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* Header */}

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Quote Timeline
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Estimated project schedule overview
            </p>
          </div>

          {/* Year Navigation */}

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={previousYear}
              className="rounded-lg border border-gray-300 bg-white p-2.5 hover:bg-gray-100"
              title="Previous year"
            >
              ←
            </button>

            <div className="min-w-[75px] text-center text-lg font-semibold text-gray-900">
              {year}
            </div>

            <button
              type="button"
              onClick={nextYear}
              className="rounded-lg border border-gray-300 bg-white p-2.5 hover:bg-gray-100"
              title="Next year"
            >
              →
            </button>

            <button
              type="button"
              onClick={goToCurrentYear}
              className="ml-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Today
            </button>

          </div>
        </div>

        {/* Status Legend */}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-xl border border-gray-200 bg-white px-5 py-4">

          {Object.entries(STATUS_COLORS).map(
            ([key, status]) => (
              <div
                key={key}
                className="flex items-center gap-2"
              >
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{
                    backgroundColor: status.color,
                  }}
                />

                <span className="text-sm text-gray-600">
                  {status.label}
                </span>
              </div>
            )
          )}

          <div className="ml-auto text-sm text-gray-500">
            {timelineQuotes.length} Projects
          </div>

        </div>

        {/* Timeline Chart */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

          <div className="overflow-x-auto">

            <div className="min-w-[900px]">

              {/* Month Header */}

              <div
                className="grid border-b border-gray-200 bg-gray-50"
                style={{
                  gridTemplateColumns: monthGrid,
                }}
              >
                {MONTHS.map((month) => (
                  <div
                    key={month}
                    className="border-r border-gray-200 px-1 py-4 text-center text-xs font-semibold text-gray-600 last:border-r-0"
                  >
                    {month}
                  </div>
                ))}
              </div>

              {/* Project Rows */}

              {timelineQuotes.length === 0 ? (

                <div className="flex min-h-[250px] items-center justify-center text-sm text-gray-400">
                  No projects found for {year}.
                </div>

              ) : (

                <div>

                  {timelineQuotes.map((quote) => {
                    const preview = dragPreview[quote.id];

                    const displayQuote = preview
                      ? {
                          ...quote,
                          start: preview.start,
                          end: preview.end,
                        }
                      : quote;

                    const position =
                      getTimelinePosition(displayQuote);

                    const status =
                      STATUS_COLORS[quote.statusKey] ||
                      DEFAULT_STATUS;

                    const canResizeStart =
                      quote.start >= yearStart &&
                      quote.start < yearEnd;

                    const canResizeEnd =
                      quote.end &&
                      quote.end >= yearStart &&
                      quote.end < yearEnd;

                    return (
                      <div
                        key={quote.id}
                        data-timeline-row
                        className="relative h-[58px] border-b border-gray-100 last:border-b-0"
                      >

                        {/* Month Grid Background */}

                        <div
                          className="absolute inset-0 grid"
                          style={{
                            gridTemplateColumns: monthGrid,
                          }}
                        >
                          {MONTHS.map((month) => (
                            <div
                              key={month}
                              className="border-r border-gray-100 last:border-r-0"
                            />
                          ))}
                        </div>

                        {/* Project Box / Point */}

                        {position.hasEndDate ? (

                          <button
                            type="button"
                            onClick={() => {
                              if (suppressClickRef.current) {
                                suppressClickRef.current = false;
                                return;
                              }

                              router.push(
                                `/quote/${quote.id}`
                              );
                            }}
                            title={[
                              quote.projectName ||
                                "Untitled Project",

                              `Status: ${status.label}`,

                              `Start: ${formatDate(quote.start)}`,

                              `Completion: ${formatDate(quote.end)}`,
                            ].join("\n")}
                            aria-label={`Open quote: ${
                              quote.projectName ||
                              "Untitled Project"
                            }`}
                            className="group absolute top-1/2 z-10 h-8 -translate-y-1/2 overflow-visible rounded-md text-left transition hover:brightness-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                            style={{
                              left: position.left,
                              width: position.width,
                              minWidth: "5px",
                              backgroundColor: status.color,
                            }}
                          >

                            {/* Tooltip */}

                            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
                              {quote.projectName ||
                                "Untitled Project"}
                            </span>

                            {/* Project Name */}

                            <span className="pointer-events-none block truncate px-2 text-xs font-medium leading-8 text-white">
                              {quote.projectName || ""}
                            </span>

                            {/* Left resize handle: Start Date */}

                            {canResizeStart && (
                              <span
                                role="separator"
                                aria-label={`Adjust start date for ${
                                  quote.projectName || "project"
                                }`}
                                title="Drag to change Start Date"
                                onPointerDown={(event) =>
                                  handleDatePointerDown(
                                    event,
                                    quote,
                                    "start"
                                  )
                                }
                                className="absolute left-0 top-0 z-20 h-full w-3 cursor-ew-resize rounded-l-md border-r-2 border-white/80 bg-black/15 hover:bg-black/30"
                                style={{
                                  touchAction: "none",
                                }}
                              />
                            )}

                            {/* Right resize handle: End Date */}

                            {canResizeEnd && (
                              <span
                                role="separator"
                                aria-label={`Adjust completion date for ${
                                  quote.projectName || "project"
                                }`}
                                title="Drag to change End Date"
                                onPointerDown={(event) =>
                                  handleDatePointerDown(
                                    event,
                                    quote,
                                    "end"
                                  )
                                }
                                className="absolute right-0 top-0 z-20 h-full w-3 cursor-ew-resize rounded-r-md border-l-2 border-white/80 bg-black/15 hover:bg-black/30"
                                style={{
                                  touchAction: "none",
                                }}
                              />
                            )}

                          </button>

                        ) : (

                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/quote/${quote.id}`
                              )
                            }
                            title={[
                              quote.projectName ||
                                "Untitled Project",

                              `Status: ${status.label}`,

                              `Start: ${formatDate(quote.start)}`,

                              "Completion: Not set",
                            ].join("\n")}
                            aria-label={`Open quote: ${
                              quote.projectName ||
                              "Untitled Project"
                            }`}
                            className="group absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                            style={{
                              left: position.left,
                              backgroundColor: status.color,
                            }}
                          >

                            {/* Tooltip */}

                            <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white shadow-lg group-hover:block group-focus-visible:block">
                              {quote.projectName ||
                                "Untitled Project"}
                            </span>

                          </button>

                        )}

                      </div>
                    );
                  })}

                </div>

              )}

            </div>
          </div>

          {/* Footer */}

          <div className="border-t border-gray-200 bg-gray-50 px-5 py-3">

            <p className="text-xs text-gray-500">
              Showing projects overlapping {year}.
              Hover over a project to see its name.
              Drag either edge to adjust dates, then confirm to save.
              Click the middle of a project to open Quote Detail.
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          18. Confirm Date Changes Modal
      ===================================================== */}
      {/* Drag Date Tooltip */}

        {dragInfo && (
        <div
            className="pointer-events-none fixed z-[200] rounded-lg bg-gray-900 px-4 py-3 text-white shadow-xl"
            style={{
            left: Math.min(
                dragInfo.x + 15,
                window.innerWidth - 250
            ),
            top: Math.max(10, dragInfo.y - 85),
            }}
        >
            <div className="text-xs font-medium text-gray-300">
            {dragInfo.edge === "start"
                ? "Start Date"
                : "End Date"}
            </div>

            <div className="mt-1 text-sm font-semibold">
            {formatDetailedDate(dragInfo.date)}
            </div>
        </div>
        )}

      {pendingChange && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !savingChange
            ) {
              cancelDateChange();
            }
          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-change-title"
            className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-2xl"
          >

            {/* Modal Header */}

            <div className="mb-4 flex items-start justify-between gap-4">

              <div>
                <h2
                  id="date-change-title"
                  className="text-lg font-semibold text-gray-900"
                >
                  Confirm Date Changes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {pendingChange.projectName}
                </p>
              </div>

              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                Pending
              </span>

            </div>

            {/* Date Changes */}

            <div className="space-y-4 rounded-lg bg-gray-50 p-4">

              {/* Start Date */}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Start Date
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">

                  <span className="text-gray-500 line-through">
                    {formatDate(pendingChange.oldStart)}
                  </span>

                  <span className="text-red-600">
                    →
                  </span>

                  <span className="font-semibold text-gray-900">
                    {formatDate(pendingChange.newStart)}
                  </span>

                </div>
              </div>

              {/* End Date */}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  End Date
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">

                  <span className="text-gray-500 line-through">
                    {formatDate(pendingChange.oldEnd)}
                  </span>

                  <span className="text-red-600">
                    →
                  </span>

                  <span className="font-semibold text-gray-900">
                    {formatDate(pendingChange.newEnd)}
                  </span>

                </div>
              </div>

            </div>

            {/* Confirmation Message */}

            <p className="mt-4 text-xs text-gray-500">
              The changes will only be saved to Firebase after you confirm.
            </p>

            {/* Modal Buttons */}

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={cancelDateChange}
                disabled={savingChange}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDateChange}
                disabled={savingChange}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingChange
                  ? "Saving..."
                  : "Confirm Save"}
              </button>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
