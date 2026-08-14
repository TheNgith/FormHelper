import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { OTHER_LABEL, type Slice } from '../lib/aggregate';
import { SURFACE, categoryColor, tooltipStyle } from './theme';

/**
 * Trạng thái mẫu, vẽ thành vành khuyên.
 *
 * Chú giải nằm ngay dưới, mang cả tên lẫn con số, nên không lát nào phải nhận
 * dạng bằng riêng màu sắc — điều kiện để lát "Other" mặc màu xám trung tính
 * mà vẫn đọc được (xem ghi chú bảng màu trong theme.ts).
 *
 * Khe hở 2px giữa các lát là màu nền chứ không phải trong suốt: hai lát cạnh
 * nhau mà chạm nhau thì rìa của chúng lẫn vào nhau ở cỡ nhỏ.
 */
export default function StateDonut({ data }: { data: Slice[] }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={2}
            stroke={SURFACE}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((slice, index) => (
              <Cell
                key={slice.label}
                fill={categoryColor(index, slice.label === OTHER_LABEL)}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: unknown, name: unknown) => [`${value} samples`, String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="chart-legend">
        {data.map((slice, index) => (
          <li key={slice.label}>
            <span
              className="chart-swatch"
              style={{ background: categoryColor(index, slice.label === OTHER_LABEL) }}
              aria-hidden="true"
            />
            {/* Dữ liệu hiện đúng như đã lưu: "Rắn", "Lỏng", "Dung dịch". */}
            <span className="chart-legend-label">{slice.label}</span>
            <span className="chart-legend-value">
              {slice.value}
              {total > 0 && (
                <span className="chart-legend-share">
                  {' '}
                  ({Math.round((slice.value / total) * 100)}%)
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
