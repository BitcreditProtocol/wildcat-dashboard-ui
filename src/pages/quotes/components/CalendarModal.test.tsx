import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IntlProvider } from "react-intl";
import { CalendarModal } from "./CalendarModal";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const originalTimeZone = process.env.TZ;

// The deadline the component receives: end of the Sep 9 UTC day. In a positive-offset zone
// that instant is already Sep 10 locally, which is what used to shift the picked day.
const SELECTED = new Date("2026-09-09T23:59:59.999Z");

function renderModal(overrides: { draftDate?: Date } = {}) {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const onDateChange = vi.fn<(date: Date) => void>();
  const mountRoot = createRoot(mount);

  act(() => {
    mountRoot.render(
      <IntlProvider locale="en">
        <CalendarModal
          isOpen
          selectedDate={SELECTED}
          draftDate={overrides.draftDate ?? SELECTED}
          title="Payment deadline"
          minDate={SELECTED}
          onClose={vi.fn()}
          onDateChange={onDateChange}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
        />
      </IntlProvider>
    );
  });

  root = mountRoot;
  container = mount;

  return { page: mount, onDateChange };
}

function findDayCell(page: HTMLDivElement, day: string) {
  const cell = Array.from(page.querySelectorAll("button")).find((button) => button.textContent?.trim() === day);
  expect(cell, `day cell ${day} not found`).toBeDefined();

  return cell!;
}

function clickDay(page: HTMLDivElement, day: string) {
  const cell = findDayCell(page, day);

  act(() => {
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
}

function unmount() {
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
}

afterEach(() => {
  unmount();
  vi.clearAllMocks();
});

afterAll(() => {
  process.env.TZ = originalTimeZone;
});

// The calendar grid is built in local time while the component's props and callbacks are
// UTC, so run every case either side of UTC: a positive offset pushed the picked day one
// day back, a negative one left a non-zero time of day behind.
describe.each([
  ["Europe/Berlin", -120],
  ["America/New_York", 240],
])("CalendarModal in %s", (timeZone, expectedOffsetMinutes) => {
  beforeEach(() => {
    process.env.TZ = timeZone;
  });

  it("runs in the expected time zone", () => {
    expect(SELECTED.getTimezoneOffset()).toBe(expectedOffsetMinutes);
  });

  it("reports the clicked day as that day in UTC", () => {
    const { page, onDateChange } = renderModal();

    clickDay(page, "13");

    expect(onDateChange).toHaveBeenCalledTimes(1);
    expect(onDateChange.mock.calls[0][0].toISOString()).toBe("2026-09-13T00:00:00.000Z");
  });

  it("labels the draft date by its UTC day", () => {
    const { page } = renderModal({ draftDate: new Date("2026-09-13T00:00:00.000Z") });

    expect(page.textContent).toContain("Sep 13, 2026");
  });

  it("keeps the minimum day selectable", () => {
    const { page, onDateChange } = renderModal();

    expect(findDayCell(page, "9").disabled).toBe(false);

    clickDay(page, "9");

    expect(onDateChange.mock.calls[0][0].toISOString()).toBe("2026-09-09T00:00:00.000Z");
  });

  it("disables days before the minimum day", () => {
    const { page } = renderModal();

    expect(findDayCell(page, "8").disabled).toBe(true);
  });
});
