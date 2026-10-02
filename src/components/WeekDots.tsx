import {
  getRecentWeekCompletion,
  getRecentWeekDates,
  getShanghaiDate,
  type CheckinState
} from "../domain/checkin";

export function WeekDots({ checkin }: { checkin: CheckinState }) {
  const today = getShanghaiDate();
  const completed = new Set(getRecentWeekCompletion(checkin.completedDates, today));

  return (
    <div className="week-dots">
      {getRecentWeekDates(today).map((date) => (
        <span key={date} className={completed.has(date) ? "active" : ""} title={date.slice(5)} />
      ))}
    </div>
  );
}
