import type { ReactNode } from 'react';

/**
 * Khung chung của bốn biểu đồ: tiêu đề, một dòng chú thích, và phần vẽ.
 *
 * Dòng chú thích không phải chỗ trang trí. Biểu đồ trạng thái mẫu đếm theo
 * *mẫu* chứ không theo *đơn*, và nếu không nói ra thì con số tổng đọc lên sẽ
 * bị hiểu thành số đơn — đó là loại hiểu nhầm mà một chú thích chữa được còn
 * một cái nhãn trục thì không.
 *
 * Không có dữ liệu thì hiện một câu, không vẽ một cái khung rỗng: một biểu đồ
 * trống trông y hệt một biểu đồ hỏng.
 */
export default function ChartCard({
  title,
  note,
  isEmpty,
  children,
}: {
  title: string;
  note?: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {note && <p className="chart-note">{note}</p>}
      {isEmpty ? (
        <p className="chart-empty">No data for this period.</p>
      ) : (
        <div className="chart-plot">{children}</div>
      )}
    </section>
  );
}
