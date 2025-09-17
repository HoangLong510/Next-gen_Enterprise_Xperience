package server.utils;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import server.models.accountant.salary.Salary;

import java.io.ByteArrayOutputStream;

public class PdfGenerator {

    public static byte[] generateSalarySlip(Salary salary) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdfDoc = new PdfDocument(writer);
            Document document = new Document(pdfDoc);

            // Title
            Paragraph title = new Paragraph("Salary Slip")
                    .setFont(PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD))
                    .setFontSize(18)
                    .setFontColor(ColorConstants.BLACK);
            document.add(title);

            document.add(new Paragraph("Employee: " + salary.getEmployee().getLastName() + " " + salary.getEmployee().getFirstName()));
            document.add(new Paragraph("Code: " + salary.getEmployee().getCode()));
            document.add(new Paragraph("Month/Year: " + salary.getMonth() + "/" + salary.getYear()));
            document.add(new Paragraph("\n"));

            // Table with details
            float[] columnWidths = {200f, 200f};
            Table table = new Table(columnWidths);

            table.addCell(new Cell().add(new Paragraph("Base Salary")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getBaseSalary()))));

            table.addCell(new Cell().add(new Paragraph("Working Days")));
            table.addCell(new Cell().add(new Paragraph(String.valueOf(salary.getWorkingDays()))));

            table.addCell(new Cell().add(new Paragraph("Actual Salary")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getActualSalary()))));

            table.addCell(new Cell().add(new Paragraph("Lunch Allowance")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getAllowanceLunch()))));

            table.addCell(new Cell().add(new Paragraph("Phone Allowance")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getAllowancePhone()))));

            table.addCell(new Cell().add(new Paragraph("Responsibility Allowance")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getAllowanceResponsibility()))));

            table.addCell(new Cell().add(new Paragraph("Total Salary")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getTotalSalary()))));

            table.addCell(new Cell().add(new Paragraph("Social Insurance")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getDeductionBhxh()))));

            table.addCell(new Cell().add(new Paragraph("Health Insurance")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getDeductionBhyt()))));

            table.addCell(new Cell().add(new Paragraph("Unemployment Insurance")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getDeductionBhtn()))));

            table.addCell(new Cell().add(new Paragraph("Personal Income Tax")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getPersonalIncomeTax()))));

            table.addCell(new Cell().add(new Paragraph("Net Pay")));
            table.addCell(new Cell().add(new Paragraph(formatCurrency(salary.getTotal()))));


            document.add(table);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            e.printStackTrace();
            return new byte[0];
        }
    }

    private static String formatCurrency(Long amount) {
        if (amount == null) return "-";
        return String.format("%,d VND", amount);
    }
}
