# EduPredict - Product Requirements Document

## Overview

EduPredict is an AI-powered School Management System designed to help schools manage students, teachers, parents, attendance, academic performance, communication, and predictive analytics from a single platform.

The system serves four primary roles:

* Admin
* Teacher/Staff
* Parent
* Student

The platform should be responsive, secure, scalable, and production-ready.

---

# Core Objectives

1. Centralize school management.
2. Improve academic performance monitoring.
3. Provide AI-driven student performance predictions.
4. Improve communication between schools, teachers, parents, and students.
5. Provide real-time operational visibility.

---

# User Roles

## Admin

Responsibilities:

* Manage schools
* Manage teachers
* Manage students
* Manage classes
* Manage subjects
* View analytics
* Configure settings
* Send announcements
* View reports

Access:

* Full system access

---

## Teacher / Staff

Responsibilities:

* Manage attendance
* Upload results
* Create assignments
* Create tests
* Manage classes
* View student performance
* Access AI predictions

Access:

* Assigned classes and students only

---

## Parent

Responsibilities:

* Monitor child performance
* View attendance
* View assignments
* Track school bus
* Receive notifications

Access:

* Own children only

---

## Student

Responsibilities:

* View assignments
* View results
* View attendance
* Access learning resources
* View AI predictions

Access:

* Own records only

---

# Authentication

Requirements:

* Email and password login
* Secure password hashing
* Session-based authentication
* Role-based access control
* Logout functionality
* Forgot password flow (future)

---

# Student Management

Requirements:

* Add student
* Edit student
* Delete student
* Student profile page
* Guardian details
* Attendance history
* Academic records
* AI insights

---

# Teacher Management

Requirements:

* Add teacher
* Edit teacher
* Delete teacher
* Subject assignments
* Class assignments
* Staff directory

---

# Attendance Management

Requirements:

* Mark attendance
* Edit attendance
* Class-wise attendance
* Daily attendance reports
* Attendance analytics

---

# Academic Performance

Requirements:

* Subject-wise scores
* Test results
* Assignment scores
* Performance trends
* Class comparisons
* Student comparisons

---

# AI Prediction System

Inputs:

* Attendance
* Assignment completion
* Test scores
* Exam scores

Outputs:

* Predicted academic performance
* Risk level
* Improvement suggestions
* Performance trend analysis

---

# Notifications

Requirements:

* Announcements
* Assignment reminders
* Exam reminders
* Attendance alerts
* Performance alerts

Features:

* Read/Unread
* Priority levels
* Role-specific delivery

---

# School Bus Tracking

Requirements:

* Real-time GPS updates
* Parent tracking dashboard
* Estimated arrival times
* Route information

---

# Reporting

Requirements:

* Student reports
* Teacher reports
* Attendance reports
* Performance reports
* Export functionality

---

# Technical Requirements

Frontend:

* Next.js App Router
* TypeScript
* Tailwind CSS
* Zustand

Backend:

* Next.js Server Actions
* Drizzle ORM
* MySQL

Authentication:

* Better Auth

Deployment:

* Production-ready architecture

---

# Non-Functional Requirements

* Responsive design
* Mobile support
* Fast page loads
* Secure authentication
* Scalable database design
* Clean code architecture
* Accessibility compliance

---

# Success Criteria

The system should operate without mock data and support real schools with real users, real attendance records, real academic data, and real-time tracking.
