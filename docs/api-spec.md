# EduPredict API Specification

## Authentication

### POST /api/auth/sign-up

Create a new user account.

Request

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPassword123"
}
```

Response

```json
{
  "success": true,
  "userId": "uuid"
}
```

---

### POST /api/auth/sign-in

Request

```json
{
  "email": "john@example.com",
  "password": "StrongPassword123"
}
```

Response

```json
{
  "success": true,
  "role": "admin"
}
```

---

### POST /api/auth/sign-out

Response

```json
{
  "success": true
}
```

---

## Students

### GET /api/students

Returns paginated students list.

Query Params

* page
* limit
* search
* classId

Response

```json
{
  "students": [],
  "total": 0
}
```

---

### POST /api/students

Create student.

Request

```json
{
  "firstName": "",
  "lastName": "",
  "email": "",
  "classId": "",
  "guardianId": ""
}
```

---

### PATCH /api/students/:id

Update student.

---

### DELETE /api/students/:id

Delete student.

---

## Teachers

### GET /api/teachers

### POST /api/teachers

### PATCH /api/teachers/:id

### DELETE /api/teachers/:id

---

## Attendance

### GET /api/attendance

Filters

* classId
* date

---

### POST /api/attendance

Request

```json
{
  "studentId": "",
  "status": "present"
}
```

---

## Results

### GET /api/results

### POST /api/results

### PATCH /api/results/:id

---

## Predictions

### GET /api/predictions/:studentId

Response

```json
{
  "riskLevel": "low",
  "predictedScore": 89,
  "recommendations": []
}
```

---

## Notifications

### GET /api/notifications

### POST /api/notifications

### PATCH /api/notifications/:id/read

---

## Bus Tracking

### GET /api/buses

### GET /api/buses/:id/location

Response

```json
{
  "latitude": 17.385,
  "longitude": 78.486,
  "speed": 32
}
```

---

## Reports

### GET /api/reports/performance

### GET /api/reports/attendance

### GET /api/reports/students
