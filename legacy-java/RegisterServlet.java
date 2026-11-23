
    import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/RegisterServlet")
public class RegisterServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private UserDAO userDAO;

    @Override
    public void init() {
        userDAO = new UserDAO();
    }

    @Override
    protected void doPost(HttpServletRequest request,
                          HttpServletResponse response)
            throws ServletException, IOException {

        request.setCharacterEncoding("UTF-8");

        String name = request.getParameter("name");
        String email = request.getParameter("email");
        String password = request.getParameter("password");
        String department = request.getParameter("department");
        String phone = request.getParameter("phone");

        if (name == null || email == null || password == null ||
            name.trim().isEmpty() || email.trim().isEmpty() ||
            password.length() < 8) {

            response.sendRedirect(
                "signup.html?error=InvalidDetails");
            return;
        }

        // Public registration can create student accounts only.
        boolean registered = userDAO.registerUser(
            name.trim(),
            email.trim().toLowerCase(),
            password,
            "student",
            department == null ? "" : department.trim(),
            phone == null ? "" : phone.trim()
        );

        if (registered) {
            response.sendRedirect("index.html?registered=true");
        } else {
            response.sendRedirect("signup.html?error=RegistrationFailed");
        }
    }
}

