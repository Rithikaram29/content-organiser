import { useState } from "react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const days: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday =
      i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();
    days.push({
      day: i,
      isCurrentMonth: true,
      isToday,
    });
  }

  // Next month days
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      isToday: false,
    });
  }

  return (
    <div className="calendar-container">
      <div className="page-header">
        <div className="calendar-header">
          <div>
            <h1 className="page-title">Content Calendar</h1>
            <p className="page-subtitle">Schedule and manage your content</p>
          </div>
          <div className="calendar-nav">
            <button className="btn-secondary btn-sm" onClick={goToToday}>
              Today
            </button>
            <button className="btn-secondary btn-sm" onClick={prevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="calendar-title">
              {MONTHS[month]} {year}
            </span>
            <button className="btn-secondary btn-sm" onClick={nextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="calendar-grid">
        {DAYS.map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}
        {days.map((day, index) => (
          <div
            key={index}
            className={`calendar-day ${day.isToday ? "today" : ""} ${!day.isCurrentMonth ? "other-month" : ""}`}
          >
            <div className="calendar-day-number">{day.day}</div>
          </div>
        ))}
      </div>

      <div className="calendar-legend">
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot" style={{ backgroundColor: "#f59e0b" }}></span>
          <span>Ideas</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot" style={{ backgroundColor: "#3b82f6" }}></span>
          <span>Script</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot" style={{ backgroundColor: "#ec4899" }}></span>
          <span>Shooting</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot" style={{ backgroundColor: "#6366f1" }}></span>
          <span>Editing</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot" style={{ backgroundColor: "#10b981" }}></span>
          <span>Scheduled</span>
        </div>
        <div className="calendar-legend-item">
          <span className="calendar-legend-dot" style={{ backgroundColor: "#22c55e" }}></span>
          <span>Posted</span>
        </div>
      </div>
    </div>
  );
}
