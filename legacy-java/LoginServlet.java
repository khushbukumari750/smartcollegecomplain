import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

@WebServlet("/LoginServlet")
public class LoginServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private UserDAO userDAO;

    public void init() {
        userDAO = new UserDAO();
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        String email = request.getParameter("email");
        String password = request.getParameter("password");

        String role = userDAO.loginUser(email, password);

        if (role != null) {
            HttpSession session = request.getSession();
            session.setAttribute("userEmail", email);
            session.setAttribute("userRole", role);

            if (role.equalsIgnoreCase("student")) {
                response.sendRedirect("dashboard.html");
            } else if (role.equalsIgnoreCase("admin")) {
                response.sendRedirect("admin-dashboard.html");
            } else {
                response.sendRedirect("authority-dashboard.html");
            }
        } else {
            response.sendRedirect("index.html?error=InvalidCredentials");
        }
    }
}