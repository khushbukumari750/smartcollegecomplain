
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

public class UserDAO {

    public boolean registerUser(
            String name, String email, String password,
            String role, String department, String phone) {

        String query = "INSERT INTO users " +
            "(name, email, password, role, department, phone) " +
            "VALUES (?, ?, ?, ?, ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection()) {

            if (conn == null) {
                return false;
            }

            try (PreparedStatement pstmt = conn.prepareStatement(query)) {
                pstmt.setString(1, name);
                pstmt.setString(2, email);
                pstmt.setString(3, password);
                pstmt.setString(4, role.toLowerCase());
                pstmt.setString(5, department);
                pstmt.setString(6, phone);

                return pstmt.executeUpdate() > 0;
            }

        } catch (SQLException e) {
            System.out.println("Registration failed: " + e.getMessage());
            return false;
        }
    }

    public String loginUser(String email, String password) {
        String query =
            "SELECT role FROM users WHERE email = ? AND password = ?";

        try (Connection conn = DatabaseConnection.getConnection()) {

            if (conn == null) {
                return null;
            }

            try (PreparedStatement pstmt = conn.prepareStatement(query)) {
                pstmt.setString(1, email);
                pstmt.setString(2, password);

                try (ResultSet rs = pstmt.executeQuery()) {
                    if (rs.next()) {
                        return rs.getString("role");
                    }
                }
            }

        } catch (SQLException e) {
            System.out.println("Login failed: " + e.getMessage());
        }

        return null;
    }
}
