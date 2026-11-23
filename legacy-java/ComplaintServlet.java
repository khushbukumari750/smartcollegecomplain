import java.io.IOException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

@WebServlet("/ComplaintServlet")
public class ComplaintServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    private ComplaintDAO complaintDAO;

    public void init() {
        complaintDAO = new ComplaintDAO();
    }

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userEmail") == null) {
            response.sendRedirect("index.html");
            return;
        }

        // अस्थायी रूप से टेस्ट छात्र ID 1 मान रहे हैं, जब तक आपका सेशन ID सेट न हो जाए
        int studentId = 1; 
        
        String title = request.getParameter("title");
        String description = request.getParameter("description");
        String category = request.getParameter("category");
        String priority = request.getParameter("priority");

        if (priority == null || priority.isEmpty()) {
            priority = "medium";
        }

        boolean isSuccess = complaintDAO.fileComplaint(studentId, title, description, category, priority);

        if (isSuccess) {
            response.sendRedirect("dashboard.html?status=success");
        } else {
            response.sendRedirect("complaint.html?status=failed");
        }
    }
}