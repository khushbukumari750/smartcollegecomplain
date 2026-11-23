# Archived Legacy Java & MySQL Servlets

This directory contains the original Java Servlet and JDBC code previously used by the Smart College Complaint System.

## Architecture Migration Notice
As part of the system refactor and consolidation:
- The backend has been completely migrated to **Firebase Authentication**, **Cloud Firestore**, and **Firebase Storage**.
- All business logic, complaint routing, user authentication, and real-time dashboard listeners now run purely through Firebase ES modules in the web frontend.
- These Java files are preserved strictly for historical reference and must NOT be used in the active application.

## ⚠️ CRITICAL SECURITY WARNING: ROTATE DATABASE CREDENTIALS
In `DatabaseConnection.java`, the following plain-text MySQL root password was found committed to version control:
```java
private static final String PASSWORD = "Laxmi@123";
```
**Action Required:**
If any production or development MySQL server uses this password or database, **immediately change the password** and revoke any remote database access associated with these credentials.

## Archived File Inventory
- `DatabaseConnection.java`: JDBC driver connector for MySQL.
- `UserDAO.java`: SQL queries for user registration and authentication.
- `ComplaintDAO.java`: SQL queries for filing complaints and authority lookup.
- `RegisterServlet.java`: HTTP POST servlet for student registration.
- `LoginServlet.java`: HTTP POST servlet for user login and session handling.
- `ComplaintServlet.java`: HTTP POST servlet for submitting grievances.
