package server.utils;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.*;

/**
 * Tiện ích kiểm tra ngày nghỉ: cuối tuần, ngày lễ dương, ngày lễ âm.
 * Dùng cho chấm công, xin nghỉ phép, hoặc nghiệp vụ liên quan.
 */
public class HolidayUtils {
    /**
     * Danh sách ngày lễ dương cố định trong năm (MM-dd)
     */
    private static final Set<String> FIXED_SOLAR_HOLIDAYS = new HashSet<>(Arrays.asList(
            "01-01", // Tết Dương lịch
            "04-30", // 30/4
            "05-01", // 1/5
            // Quốc khánh 2 ngày 2/9
            "09-02"
    ));

    /**
     * Danh sách số ngày Tết âm lịch (tính từ mùng 1 đến mùng 5)
     */
    private static final int[] TET_AM_LICH_DAYS = {1, 2, 3, 4, 5};

    /**
     * Số ngày Quốc khánh 2/9 được nghỉ (hiện là 2 ngày): 2/9 và 1 ngày liền kề (1/9 hoặc 3/9)
     */
    private static final int QUOC_KHANH_EXTRA_DAYS = 1;

    /**
     * Kiểm tra có phải ngày cuối tuần (chủ nhật)
     */
    public static boolean isWeekend(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SUNDAY;
    }

    /**
     * Kiểm tra có phải chủ nhật (alias cho isWeekend)
     */
    public static boolean isSunday(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SUNDAY;
    }

    /**
     * Kiểm tra có phải ngày lễ dương (nghỉ toàn quốc)
     */
    public static boolean isSolarHoliday(LocalDate date) {
        String mmdd = String.format("%02d-%02d", date.getMonthValue(), date.getDayOfMonth());
        // Quốc khánh nghỉ 2 ngày liên tiếp: 2/9 và 1 ngày liền kề (tùy vào lịch của năm)
        if (mmdd.equals("09-02")) return true;
        // Tính ngày liền kề với 2/9 (1/9 hoặc 3/9, không trùng chủ nhật)
        if (date.getMonthValue() == 9 && (date.getDayOfMonth() == 1 || date.getDayOfMonth() == 3)) {
            LocalDate sept2 = LocalDate.of(date.getYear(), 9, 2);
            // Nếu 2/9 trùng chủ nhật thì 3/9 là ngày nghỉ bù
            if (sept2.getDayOfWeek() == DayOfWeek.SUNDAY && date.getDayOfMonth() == 3) return true;
            // Nếu 2/9 là thứ 7 thì 1/9 nghỉ bù
            if (sept2.getDayOfWeek() == DayOfWeek.SATURDAY && date.getDayOfMonth() == 1) return true;
        }
        return FIXED_SOLAR_HOLIDAYS.contains(mmdd);
    }

    /**
     * Kiểm tra có phải ngày lễ âm lịch (Tết Nguyên đán, Giỗ tổ Hùng Vương)
     * Chỉ cần truyền vào ngày dương, hàm tự chuyển đổi sang âm để check
     */
    public static boolean isLunarHoliday(LocalDate date) {
        int year = date.getYear();

        // --- Tết âm lịch (mùng 1 - 5 tháng 1 âm) ---
        for (int day : TET_AM_LICH_DAYS) {
            LocalDate tet = LunarCalendarUtils.lunarToSolar(day, 1, year, false);
            if (date.equals(tet)) return true;
        }

        // --- Giỗ tổ Hùng Vương: 10/3 âm lịch ---
        LocalDate gioTo = LunarCalendarUtils.lunarToSolar(10, 3, year, false);
        if (date.equals(gioTo)) return true;

        return false;
    }

    /**
     * Kiểm tra có phải ngày nghỉ LỚN (nghỉ toàn quốc)
     * => Kết hợp: Chủ nhật, lễ dương, lễ âm
     * @param date ngày dương lịch
     * @return true nếu là ngày nghỉ
     */
    public static boolean isHoliday(LocalDate date) {
        return isWeekend(date) || isSolarHoliday(date) || isLunarHoliday(date);
    }

    /**
     * Lấy danh sách ngày nghỉ lễ năm X (dùng cho highlight trên lịch)
     */
    public static Set<LocalDate> getAllHolidaysOfYear(int year) {
        Set<LocalDate> holidays = new HashSet<>();

        // Lễ dương cố định
        for (String mmdd : FIXED_SOLAR_HOLIDAYS) {
            String[] parts = mmdd.split("-");
            int month = Integer.parseInt(parts[0]);
            int day = Integer.parseInt(parts[1]);
            holidays.add(LocalDate.of(year, month, day));
        }

        // Tết âm lịch (mùng 1 đến 5 tháng 1 âm)
        for (int day : TET_AM_LICH_DAYS) {
            holidays.add(LunarCalendarUtils.lunarToSolar(day, 1, year, false));
        }

        // Giỗ tổ Hùng Vương 10/3 âm
        holidays.add(LunarCalendarUtils.lunarToSolar(10, 3, year, false));

        // Quốc khánh 2/9 và ngày liền kề (1/9 hoặc 3/9)
        holidays.add(LocalDate.of(year, 9, 2));
        LocalDate qk = LocalDate.of(year, 9, 2);
        if (qk.getDayOfWeek() == DayOfWeek.SUNDAY) {
            holidays.add(qk.plusDays(1)); // nghỉ bù 3/9
        } else if (qk.getDayOfWeek() == DayOfWeek.SATURDAY) {
            holidays.add(qk.minusDays(1)); // nghỉ bù 1/9
        }

        // Chủ nhật trong năm
        LocalDate d = LocalDate.of(year, 1, 1);
        while (d.getYear() == year) {
            if (d.getDayOfWeek() == DayOfWeek.SUNDAY) holidays.add(d);
            d = d.plusDays(1);
        }

        return holidays;
    }

    /**
     * Trả về tên ngày nghỉ, trả "" nếu không phải ngày nghỉ.
     */
    public static String getHolidayName(LocalDate date) {
        // Chủ nhật
        if (isSunday(date)) return "Chủ nhật";
        // Lễ dương lịch
        String mmdd = String.format("%02d-%02d", date.getMonthValue(), date.getDayOfMonth());
        switch (mmdd) {
            case "01-01": return "Tết Dương lịch";
            case "04-30": return "Ngày Giải phóng miền Nam";
            case "05-01": return "Quốc tế Lao động";
            case "09-02": return "Quốc khánh";
        }
        // Quốc khánh nghỉ bù
        if (date.getMonthValue() == 9 && (date.getDayOfMonth() == 1 || date.getDayOfMonth() == 3)) {
            LocalDate sept2 = LocalDate.of(date.getYear(), 9, 2);
            if (sept2.getDayOfWeek() == DayOfWeek.SUNDAY && date.getDayOfMonth() == 3)
                return "Quốc khánh (nghỉ bù)";
            if (sept2.getDayOfWeek() == DayOfWeek.SATURDAY && date.getDayOfMonth() == 1)
                return "Quốc khánh (nghỉ bù)";
        }
        // Lễ âm lịch (Tết, giỗ Tổ...)
        int year = date.getYear();
        for (int day : TET_AM_LICH_DAYS) {
            LocalDate tet = LunarCalendarUtils.lunarToSolar(day, 1, year, false);
            if (date.equals(tet)) return "Tết Nguyên Đán";
        }
        LocalDate gioTo = LunarCalendarUtils.lunarToSolar(10, 3, year, false);
        if (date.equals(gioTo)) return "Giỗ tổ Hùng Vương";

        // Không phải ngày lễ
        return "";
    }
}
