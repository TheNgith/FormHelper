import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { Slice } from '../lib/aggregate';
import { OTHER_LABEL } from '../lib/aggregate';
import {
  BAR_RADIUS,
  RESIDUAL_COLOR,
  SERIES_COLOR,
  axisLine,
  tickStyle,
  tooltipStyle,
} from './theme';

/**
 * Cột nằm ngang cho hai bảng xếp hạng: lớp và giảng viên hướng dẫn.
 *
 * Nằm ngang chứ không nằm dọc vì nhãn ở đây là chuỗi dài — "Bộ môn Hóa Hữu
 * Cơ", "PGS. TS. Trần Văn Thành" — và chữ xoay nghiêng thì không đọc được.
 *
 * Một chuỗi số liệu duy nhất nên không có chú giải màu: tiêu đề đã gọi tên nó.
 * Con số hiện ở nhãn trục trái cùng tên, và hộp chú thích khi rê chuột lặp
 * lại — nhận dạng không bao giờ chỉ dựa vào màu.
 */
export default function RankingBars({
  data,
  valueName,
}: {
  data: Slice[];
  valueName: string;
}) {
  // Nhãn dài cần chỗ, nhưng cắt cột quá hẹp thì biểu đồ hết ý nghĩa. 168px là
  // chỗ cho khoảng 22 ký tự ở bậc chữ nhỏ nhất; dài hơn thì Recharts tự cắt.
  const labelWidth = 168;

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34 + 24)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        barCategoryGap={6}
      >
        {/* Chỉ kẻ dọc: vạch ngang giữa các cột không cho thêm thông tin nào. */}
        <CartesianGrid horizontal={false} stroke={axisLine.stroke} />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={axisLine}
          tick={tickStyle}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          tickLine={false}
          axisLine={axisLine}
          tick={tickStyle}
        />
        <Tooltip
          cursor={{ fill: 'rgb(32 31 29 / 4%)' }}
          contentStyle={tooltipStyle}
          formatter={(value: unknown) => [String(value), valueName]}
        />
        <Bar dataKey="value" radius={[0, BAR_RADIUS, BAR_RADIUS, 0]} isAnimationActive={false}>
          {data.map((slice) => (
            // "Other" là phần dư chứ không phải một mục, nên nó mặc màu xám
            // trung tính thay vì màu của chuỗi số liệu.
            <Cell
              key={slice.label}
              fill={slice.label === OTHER_LABEL ? RESIDUAL_COLOR : SERIES_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
