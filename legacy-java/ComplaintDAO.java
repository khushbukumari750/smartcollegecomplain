
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;

public class ComplaintDAO {

    public boolean fileComplaint(
            int studentId,
            String title,
            String description,
            String category,
            String priority) {

        String assignedTo = getAuthority(category);

        String query = "INSERT INTO complaints " +
            "(student_id, title, description, category, assigned_to, priority) " +
            "VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection()) {

            if (conn == null) {
                return false;
            }

            try (PreparedStatement pstmt = conn.prepareStatement(query)) {
                pstmt.setInt(1, studentId);
                pstmt.setString(2, title);
                pstmt.setString(3, description);
                pstmt.setString(4, category.toLowerCase());
                pstmt.setString(5, assignedTo);
                pstmt.setString(6, priority.toLowerCase());

                return pstmt.executeUpdate() > 0;
            }

        } catch (SQLException e) {
            System.out.println("Complaint submission failed: "
                    + e.getMessage());
            return false;
        }
    }

    private String getAuthority(String category) {

        switch (category.toLowerCase()) {
            case "hostel":
                return "warden";

            case "classroom":
                return "tg";

            case "faculty":
            case "academic":
                return "hod";

            case "lab":
                return "hod";

            case "library":
                return "admin";

            case "wi-fi/internet":
            case "wifi":
            case "computer":
                return "admin";

            case "canteen":
            case "transport":
            case "infrastructure":
                return "admin";

            case "safety/security":
            case "ragging":
                return "dean";

            default:
                return "admin";
        }
    }
}
