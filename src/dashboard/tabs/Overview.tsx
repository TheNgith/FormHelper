import { useMemo } from 'react';

import ChartCard from '../charts/ChartCard';
import MonthlyBars from '../charts/MonthlyBars';
import RankingBars from '../charts/RankingBars';
import StateDonut from '../charts/StateDonut';
import {
  classRanking,
  sampleStates,
  submissionsByMonth,
  supervisorFrequency,
  totalSamples,
} from '../lib/aggregate';
import type { SubmissionRecord } from '../lib/records';

/**
 * Tab tổng quan: bốn biểu đồ trên cùng một tập đơn.
 *
 * Bộ chọn năm ở đây điều khiển *cả bốn*, không riêng biểu đồ tháng — nếu
 * không thì ba biểu đồ kia đọc trên toàn bộ lịch sử còn biểu đồ tháng đọc
 * trên một năm, và hai con số cạnh nhau nói về hai tập dữ liệu khác nhau.
 */

type Props = {
  records: SubmissionRecord[];
  years: string[];
  year: string;
  onYearChange: (year: string) => void;
};

/** Xếp hạng giảng viên cắt ở 12 cột — dài hơn thì cột mảnh tới mức khó đọc. */
const SUPERVISOR_LIMIT = 12;

export default function Overview({ records, years, year, onYearChange }: Props) {
  const inYear = useMemo(
    () => (year ? records.filter((r) => r.requestDate.startsWith(year)) : records),
    [records, year],
  );

  const classes = useMemo(() => classRanking(inYear), [inYear]);
  const months = useMemo(() => submissionsByMonth(records, year), [records, year]);
  const states = useMemo(() => sampleStates(inYear), [inYear]);
  const supervisors = useMemo(
    () => supervisorFrequency(inYear).slice(0, SUPERVISOR_LIMIT),
    [inYear],
  );
  const sampleTotal = useMemo(() => totalSamples(inYear), [inYear]);

  return (
    <>
      <div className="filter-bar">
        <div className="field">
          <label htmlFor="overview-year">Year</label>
          <select
            id="overview-year"
            value={year}
            onChange={(e) => onYearChange(e.target.value)}
          >
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <p className="filter-summary">
          {inYear.length} {inYear.length === 1 ? 'submission' : 'submissions'} ·{' '}
          {sampleTotal} {sampleTotal === 1 ? 'sample' : 'samples'}
        </p>
      </div>

      <div className="chart-grid">
        <ChartCard
          title={`Submissions per month, ${year}`}
          isEmpty={months.every((bucket) => bucket.value === 0)}
        >
          <MonthlyBars data={months} />
        </ChartCard>

        {/* Đếm theo *mẫu* chứ không theo *đơn*. Dòng tổng kết trên thanh lọc
            in ra cả hai con số, nên chỗ này không cần nhắc lại. */}
        <ChartCard title="Sample state" isEmpty={sampleTotal === 0}>
          <StateDonut data={states} />
        </ChartCard>

        {/* Mười lớp nhiều đơn nhất; phần còn lại gộp vào "Other". */}
        <ChartCard title="Classes" isEmpty={classes.length === 0}>
          <RankingBars data={classes} valueName="Submissions" />
        </ChartCard>

        {/* Gộp theo tên đã bỏ chữ Thầy/Cô, nhưng học hàm học vị khác nhau vẫn
            là hai mục khác nhau — chỗ hở đã biết của phép gộp. */}
        <ChartCard title="Supervisors" isEmpty={supervisors.length === 0}>
          <RankingBars data={supervisors} valueName="Submissions" />
        </ChartCard>
      </div>
    </>
  );
}
