/**
 * Bảng màu và các giá trị dùng chung cho bốn biểu đồ.
 *
 * Recharts vẽ ra SVG, và thuộc tính SVG không đọc được biến CSS một cách đáng
 * tin (`fill="var(--color-accent)"` chạy ở trình duyệt này và không chạy ở
 * trình duyệt khác). Nên các giá trị dưới đây **chép lại** hằng số trong
 * src/styles/index.css. Đổi màu ở đó thì đổi luôn ở đây; không có bài kiểm
 * tra nào canh hai bản chép này, nhưng lệch nhau thì chỉ là biểu đồ hơi lạc
 * tông chứ không hỏng gì.
 *
 * ## Vì sao đúng ba màu, cộng một màu xám
 *
 * Ba màu ở `CATEGORY_COLORS` đã qua bộ kiểm tra của kỹ năng `dataviz`, chạy ở
 * chế độ `--pairs all` (biểu đồ tròn thì hai lát bất kỳ đều có thể nằm cạnh
 * nhau) trên đúng nền giấy `--color-bg`:
 *
 *   node scripts/validate_palette.js "#b68235,#1f6fb2,#a8324a" \
 *     --mode light --surface "#f3f2f2" --pairs all
 *   → dải sáng PASS · sắc độ PASS · mù màu ΔE 15,6 PASS · mắt thường ΔE 20,1
 *     PASS · tương phản nền PASS
 *
 * Màu đầu tiên chính là màu đồng của cả trang. Màu thứ tư — ô "Other" — cố ý
 * là xám trung tính: nó không phải một loại mẫu mà là phần dư, và một sắc màu
 * thứ tư trong họ ấm này không vượt qua nổi ngưỡng phân biệt. Bù lại, biểu đồ
 * tròn ghi thẳng nhãn và con số bên cạnh từng lát, nên không lát nào phải
 * nhận dạng bằng riêng màu sắc. Thường thì ô đó còn không xuất hiện.
 *
 * Không có chế độ tối: cả hai trang đều khai `color-scheme: light`.
 */

/** Màu đồng của hệ thiết kế — dùng cho biểu đồ một chuỗi số liệu. */
export const SERIES_COLOR = '#b68235';

/** Ba loại trạng thái mẫu, theo đúng thứ tự của `SAMPLE_STATES`. */
export const CATEGORY_COLORS = ['#b68235', '#1f6fb2', '#a8324a'] as const;

/** Phần dư ("Other"): xám trung tính, không phải một sắc màu thứ tư. */
export const RESIDUAL_COLOR = '#605d5d';

/** Chữ và nét, chép từ index.css. */
export const INK = '#201f1d';
export const INK_MUTED = 'rgb(32 31 29 / 65%)';
export const GRID = 'rgb(32 31 29 / 16%)';
export const SURFACE = '#f3f2f2';

export const FONT_BODY = "'Lora', Georgia, 'Times New Roman', serif";

/** Bậc chữ nhỏ nhất của trang, dùng cho nhãn trục. */
export const AXIS_FONT_SIZE = 13;

/** Bo tròn đầu cột, đầu còn lại cắm thẳng vào trục. */
export const BAR_RADIUS = 4;

/** Nét mảnh, lưới lùi hẳn ra sau: số liệu là thứ được nhìn, không phải khung. */
export const axisLine = { stroke: GRID } as const;
export const tickStyle = {
  fill: INK_MUTED,
  fontSize: AXIS_FONT_SIZE,
  fontFamily: FONT_BODY,
} as const;

/** Khung hộp chú giải khi rê chuột, dựng theo tông giấy của trang. */
export const tooltipStyle = {
  background: SURFACE,
  border: `1px solid ${GRID}`,
  borderRadius: 4,
  fontFamily: FONT_BODY,
  fontSize: AXIS_FONT_SIZE,
  color: INK,
} as const;

/** Màu của lát thứ i trong biểu đồ trạng thái mẫu. */
export function categoryColor(index: number, isResidual: boolean): string {
  if (isResidual) return RESIDUAL_COLOR;
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}
