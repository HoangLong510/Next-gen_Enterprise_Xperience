package server.utils;

import java.time.LocalDate;
/**
 * Utils chuyển đổi lịch âm-dương, dùng cho các nghiệp vụ như ngày Tết, giỗ tổ, ...
 * Đủ cho tính ngày lễ VN: Tết Nguyên đán, Giỗ tổ Hùng Vương (10/3 âm), ...
 * Không phụ thuộc ngoài.
 */
public class LunarCalendarUtils {
    private static final double PI = Math.PI;

    private static int INT(double d) {
        return (int) Math.floor(d);
    }

    // Julian Day Number từ 1/1/4713 BC
    private static double jdFromDate(int dd, int mm, int yy) {
        int a = (14 - mm) / 12;
        int y = yy + 4800 - a;
        int m = mm + 12 * a - 3;
        double jd = dd + INT((153 * m + 2) / 5.0) + 365 * y + INT(y / 4.0) - INT(y / 100.0) + INT(y / 400.0) - 32045;
        if (jd < 2299161) {
            jd = dd + INT((153 * m + 2) / 5.0) + 365 * y + INT(y / 4.0) - 32083;
        }
        return jd;
    }

    // Lấy ngày, tháng, năm dương từ JDN
    private static int[] jdToDate(double jd) {
        int a, b, c, d, e, m;
        if (jd > 2299160) {
            a = INT(jd + 0.5);
            b = INT((a - 1867216.25) / 36524.25);
            c = a + 1 + b - INT(b / 4.0);
        } else {
            c = INT(jd + 0.5);
        }
        d = c + 1524;
        e = INT((d - 122.1) / 365.25);
        m = INT((d - INT(365.25 * e)) / 30.6001);
        int day = d - INT(365.25 * e) - INT(30.6001 * m);
        int month = m < 14 ? m - 1 : m - 13;
        int year = month > 2 ? e - 4716 : e - 4715;
        return new int[]{day, month, year};
    }

    // Hàm tìm kỳ trăng mới
    private static double NewMoon(int k) {
        double T = k / 1236.85;
        double T2 = T * T;
        double T3 = T2 * T;
        double dr = PI / 180;
        double Jd1 = 2415020.75933 + 29.53058868 * k
                + 0.0001178 * T2
                - 0.000000155 * T3
                + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
        double M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
        double Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
        double F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
        double C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr)
                + 0.0021 * Math.sin(2 * dr * M)
                - 0.4068 * Math.sin(Mpr * dr)
                + 0.0161 * Math.sin(dr * 2 * Mpr)
                - 0.0004 * Math.sin(dr * 3 * Mpr)
                + 0.0104 * Math.sin(dr * 2 * F)
                - 0.0051 * Math.sin(dr * (M + Mpr))
                - 0.0074 * Math.sin(dr * (M - Mpr))
                + 0.0004 * Math.sin(dr * (2 * F + M))
                - 0.0004 * Math.sin(dr * (2 * F - M))
                - 0.0006 * Math.sin(dr * (2 * F + Mpr))
                + 0.0010 * Math.sin(dr * (2 * F - Mpr))
                + 0.0005 * Math.sin(dr * (2 * Mpr + M));
        double deltaT;
        if (T < -11) {
            deltaT = 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3;
        } else {
            deltaT = -0.000278 + 0.000265 * T + 0.000262 * T2;
        }
        return Jd1 + C1 - deltaT;
    }

    private static double SunLongitude(double jdn) {
        double T = (jdn - 2451545.0) / 36525;
        double T2 = T * T;
        double dr = PI / 180;
        double M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
        double L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
        double DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
                + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M)
                + 0.000290 * Math.sin(dr * 3 * M);
        double L = L0 + DL;
        L = L * dr;
        L = L - PI * 2 * (INT(L / (PI * 2)));
        return L / PI * 180;
    }

    // Lấy ngày bắt đầu tháng 11 âm lịch (thường là tháng có Đông chí)
    private static int getLunarMonth11(int yy, double timeZone) {
        double off = jdFromDate(31, 12, yy) - 2415021.076998695;
        int k = INT(off / 29.530588853);
        double nm = NewMoon(k);
        double sunLong = SunLongitude(nm + timeZone / 24.0);
        if (sunLong >= 9) {
            nm = NewMoon(k - 1);
        }
        return INT(nm + 0.5 + timeZone / 24.0);
    }

    // Đếm số tháng nhuận từ năm bắt đầu đến năm kết thúc
    private static int getLeapMonthOffset(double a11, double timeZone) {
        int k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        int last = 0;
        int i = 1;
        int arc = INT(SunLongitude(NewMoon(k + i) + timeZone / 24.0) / 30.0);
        do {
            last = arc;
            i++;
            arc = INT(SunLongitude(NewMoon(k + i) + timeZone / 24.0) / 30.0);
        } while (arc != last && i < 14);
        return i - 1;
    }

    /**
     * Chuyển ngày dương sang âm
     * @param dd Ngày dương
     * @param mm Tháng dương
     * @param yy Năm dương
     * @param timeZone múi giờ (7.0 cho VN)
     * @return [ngày âm, tháng âm, năm âm, isLeap]
     */
    public static int[] convertSolar2Lunar(int dd, int mm, int yy, double timeZone) {
        double dayNumber = jdFromDate(dd, mm, yy);
        int k = INT((dayNumber - 2415021.076998695) / 29.530588853);
        double monthStart = NewMoon(k + 1);
        if (monthStart > dayNumber + 0.5) {
            monthStart = NewMoon(k);
        }
        double a11 = getLunarMonth11(yy, timeZone);
        double b11 = a11;
        int lunarYear;
        if (a11 >= monthStart) {
            a11 = getLunarMonth11(yy - 1, timeZone);
            lunarYear = yy;
        } else {
            b11 = getLunarMonth11(yy + 1, timeZone);
            lunarYear = yy + 1;
        }
        int lunarDay = (int) (dayNumber - monthStart + 1);
        int diff = INT((monthStart - a11) / 29.530588853 + 0.5);
        int lunarMonth = diff + 11;
        int isLeap = 0;
        if (b11 - a11 > 365.0) {
            int leapMonthDiff = getLeapMonthOffset(a11, timeZone);
            if (diff >= leapMonthDiff) {
                lunarMonth = diff + 10;
                if (diff == leapMonthDiff) isLeap = 1;
            }
        }
        if (lunarMonth > 12) lunarMonth = lunarMonth - 12;
        if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
        return new int[]{lunarDay, lunarMonth, lunarYear, isLeap};
    }

    /**
     * Chuyển ngày âm sang dương
     * @param lunarDay Ngày âm
     * @param lunarMonth Tháng âm
     * @param lunarYear Năm âm
     * @param lunarLeap 1 nếu là tháng nhuận, 0 nếu không
     * @return [ngày, tháng, năm] dương lịch
     */
    public static int[] convertLunar2Solar(int lunarDay, int lunarMonth, int lunarYear, int lunarLeap) {
        double a11 = getLunarMonth11(lunarYear - 1, 7.0);
        double b11 = getLunarMonth11(lunarYear, 7.0);
        int k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
        int off = lunarMonth - 11;
        if (off < 0) off += 12;
        if (b11 - a11 > 365.0) {
            int leapOff = getLeapMonthOffset(a11, 7.0);
            int leapMonth = leapOff - 2;
            if (leapMonth < 0) leapMonth += 12;
            if (lunarLeap != 0 && lunarMonth != leapMonth) {
                throw new RuntimeException("Tháng nhuận không hợp lệ!");
            } else if (lunarLeap != 0 || off >= leapOff) off++;
        }
        double monthStart = NewMoon(k + off);
        int[] date = jdToDate(monthStart + lunarDay - 1);
        return date;
    }

    // Tiện ích: Lấy LocalDate dương lịch từ ngày âm
    public static LocalDate lunarToSolar(int lunarDay, int lunarMonth, int lunarYear, boolean isLeap) {
        int[] solar = convertLunar2Solar(lunarDay, lunarMonth, lunarYear, isLeap ? 1 : 0);
        return LocalDate.of(solar[2], solar[1], solar[0]);
    }
}
