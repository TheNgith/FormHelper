import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { MonthBucket } from '../lib/aggregate';
import { BAR_RADIUS, SERIES_COLOR, axisLine, tickStyle, tooltipStyle } from './theme';

/**
 * Số đơn theo từng tháng của một năm — luôn đủ mười hai cột.
 *
 * Tháng không có đơn nào vẽ ra thành một chỗ trống trên trục, và đó chính là
 * điều cần thấy: một tháng rỗng là thông tin, không phải dữ liệu thiếu. Phép
 * gộp ở `submissionsByMonth` giữ đủ mười hai ô; chỗ này chỉ việc không bỏ ô
 * nào đi.
 */
export default function MonthlyBars({ data }: { data: MonthBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        {/* Chỉ kẻ ngang: cột đã đứng trên trục nên vạch dọc chỉ thêm nhiễu. */}
        <CartesianGrid vertical={false} stroke={axisLine.stroke} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={axisLine}
          tick={tickStyle}
          interval={0}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={axisLine}
          tick={tickStyle}
          width={36}
        />
        <Tooltip
          cursor={{ fill: 'rgb(32 31 29 / 4%)' }}
          contentStyle={tooltipStyle}
          formatter={(value: unknown) => [String(value), 'Submissions']}
        />
        <Bar
          dataKey="value"
          fill={SERIES_COLOR}
          radius={[BAR_RADIUS, BAR_RADIUS, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
