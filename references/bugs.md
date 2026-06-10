# EduPredict - Known Issues & Missing Features

## Project Status

Current version is a UI-first prototype generated from Base44.
Most functionality uses mock data and requires production implementation.

---

# Critical Issues

## Authentication

### Issue

Login and registration currently accept any input and do not verify users.

### Current Behavior

* User enters any email/password
* Access is granted immediately
* No database validation
* No session handling

### Expected Behavior

* Users must register with valid credentials
* Passwords stored securely
* Session-based authentication
* Protected routes
* Role-based access control

### Priority

Critical

---

## Database Integration

### Issue

Most dashboards and analytics use mock data.

### Current Behavior

* Charts display static values
* Student records are hardcoded
* Teacher records are hardcoded
* Notifications are hardcoded

### Expected Behavior

* All data must come from MySQL database
* CRUD operations must persist data
* Dashboard metrics must update dynamically

### Priority

Critical

---

## Student Management

### Issue

Add Student functionality does not exist.

### Current Behavior

* Student list is visible
* No ability to create student records

### Expected Behavior

* Add Student modal/form
* Validation
* Save to database
* Display in student list immediately

### Priority

High

---

## Bus Tracking

### Issue

Bus tracker uses mock coordinates.

### Current Behavior

* Location never changes
* No real-time updates

### Expected Behavior

* Real GPS updates
* Live map tracking
* Parent dashboard integration
* ETA calculations

### Priority

High

---

## Branding

### Issue

Current logo is temporary.

### Expected Behavior

* Replace with final EduPredict logo
* Update favicon
* Update loading screens
* Update authentication screens

### Priority

Medium

---

# Minor Issues

## Notifications

### Issue

Notifications are currently mocked.

### Expected Behavior

* Database-driven notifications
* Read/unread states
* Priority levels
* Role-specific notifications

### Priority

Medium

---

## AI Prediction Module

### Issue

Prediction values appear static.

### Expected Behavior

* Generate predictions using actual student data
* Use attendance, assignments, tests, and grades
* Dynamic confidence score

### Priority

Medium

---

# Future Enhancements

* Export reports to PDF
* Parent-teacher messaging
* Multi-school support
* Mobile application
* Advanced ML prediction engine
* Attendance QR scanning
* Fee management
