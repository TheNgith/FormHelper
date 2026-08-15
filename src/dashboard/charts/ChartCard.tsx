import type { ReactNode } from 'react';

/**
 * Khung chung của bốn biểu đồ: tiêu đề và phần vẽ.
 *
 * Không có dòng chú thích nào dưới tiêu đề — cái gì cần nói thì nói bằng chính
 * biểu đồ, bằng nhãn trục, hoặc bằng dòng tổng kết trên thanh lọc.
 *
 * Không có dữ liệu thì hiện một câu, không vẽ một cái khung rỗng: một biểu đồ
 * trống trông y hệt một biểu đồ hỏng.
 */
export default function ChartCard({
  title,
  isEmpty,
  children,
}: {
  title: string;
  isEmpty: boolean;
  children: ReactNode;
}) {
  return (
    <section className="chart-card">
      <h3 className="chart-title">{title}</h3>
      {isEmpty ? (
        <p className="chart-empty">No data for this period.</p>
      ) : (
        <div className="chart-plot">{children}</div>
      )}
    </section>
  );
}
