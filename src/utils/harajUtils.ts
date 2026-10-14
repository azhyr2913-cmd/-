/**
 * Haraj System Utilities for Rawaq (رواق — حراج بيحان)
 */

export const HARAJ_BEIHAN_AREAS = [
  'بيحان (الكل)',
  'بيحان — العلياء',
  'بيحان — القصاب',
  'بيحان — الروضة',
  'بيحان — الحزم',
  'بيحان — الجدفرة',
] as const;

export function formatHarajTime(dateInput?: string | number | Date): string {
  if (!dateInput) return 'اليوم';

  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'مؤخراً';

    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) {
      return 'الآن';
    }

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      if (diffMinutes === 1) return 'قبل دقيقة';
      if (diffMinutes === 2) return 'قبل دقيقتين';
      if (diffMinutes <= 10) return `قبل ${diffMinutes} دقائق`;
      return `قبل ${diffMinutes} دقيقة`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      if (diffHours === 1) return 'قبل ساعة';
      if (diffHours === 2) return 'قبل ساعتين';
      if (diffHours <= 10) return `قبل ${diffHours} ساعات`;
      return `قبل ${diffHours} ساعة`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'أمس';
    if (diffDays === 2) return 'قبل يومين';
    if (diffDays <= 10) return `قبل ${diffDays} أيام`;
    if (diffDays <= 30) return `قبل ${Math.floor(diffDays / 7)} أسابيع`;

    return date.toLocaleDateString('ar-YE', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'مؤخراً';
  }
}

export function formatHarajPrice(price: number, condition?: string): string {
  if (price === 0) {
    return 'على السوم';
  }
  return `${price.toLocaleString()} ر.ي`;
}
