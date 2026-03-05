# Lovable Frontend API Integration Guide

## Backend URL
```
https://noncitable-sara-forebearingly.ngrok-free.dev
```

---

## Sample API Calls for Your Frontend

### 1. USER REGISTRATION

```javascript
const API_BASE = 'https://noncitable-sara-forebearingly.ngrok-free.dev';

async function registerUser(formData) {
  try {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        first_name: formData.firstName,
        last_name: formData.lastName,
        dob: formData.dob,
        gender: formData.gender,
        email: formData.email,
        mobile_number: formData.mobileNumber,
        password: formData.password,
        address: formData.address,
        username: formData.username,
        preferred_language: 'en'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('User registered:', data);
      return { success: true, userId: data.user_id };
    } else {
      console.error('Registration failed:', data);
      return { success: false, error: data.detail };
    }
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: error.message };
  }
}
```

### 2. USER LOGIN

```javascript
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Login successful:', data);
      // Store token in localStorage
      localStorage.setItem('authToken', data.access_token);
      return { success: true, token: data.access_token };
    } else {
      console.error('Login failed:', data);
      return { success: false, error: data.detail };
    }
  } catch (error) {
    console.error('Network error:', error);
    return { success: false, error: error.message };
  }
}
```

### 3. ADD INCOME

```javascript
async function addIncome(token, incomeData) {
  try {
    const response = await fetch(`${API_BASE}/income`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        monthly_income: incomeData.monthlyIncome,
        other_income: incomeData.otherIncome || 0,
        income_source: incomeData.source,
        monthly_expenses: incomeData.monthlyExpenses,
        current_savings: incomeData.currentSavings,
        emergency_fund: incomeData.emergencyFund,
        dependents: incomeData.dependents
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Income added:', data);
      return { success: true, data };
    } else {
      return { success: false, error: data.detail };
    }
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}
```

### 4. ADD EXPENSE

```javascript
async function addExpense(token, expenseData) {
  try {
    const response = await fetch(`${API_BASE}/expense`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        category: expenseData.category,
        amount: expenseData.amount,
        description: expenseData.description,
        date: expenseData.date
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Expense added:', data);
      return { success: true, data };
    } else {
      return { success: false, error: data.detail };
    }
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}
```

### 5. GET USER PROFILE

```javascript
async function getUserProfile(token) {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      console.log('User profile:', data);
      return { success: true, data };
    } else {
      return { success: false, error: data.detail };
    }
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}
```

### 6. GET DASHBOARD

```javascript
async function getDashboard(token) {
  try {
    const response = await fetch(`${API_BASE}/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (response.ok) {
      console.log('Dashboard data:', data);
      return { success: true, data };
    } else {
      return { success: false, error: data.detail };
    }
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
  }
}
```

---

## Available Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user profile

### Financial Data
- `POST /income` - Add income
- `GET /income` - Get income records
- `POST /expense` - Add expense
- `GET /expense` - Get expenses
- `POST /loans` - Add loan
- `GET /loans` - Get loans

### Dashboard
- `GET /dashboard` - Get dashboard summary
- `GET /health` - Health check

### Other Features
- `POST /otp` - Send OTP
- `GET /security` - Security settings
- `POST /nominee` - Add nominee
- `POST /documents` - Upload documents
- `POST /banking` - Add bank details
- `POST /insurance` - Add insurance
- `POST /emergency` - Add emergency contacts

---

## Implementation Steps in Lovable

1. **Create environment variable** in Lovable:
   ```
   VITE_API_BASE_URL = https://noncitable-sara-forebearingly.ngrok-free.dev
   ```

2. **Use the API calls** in your components:
   ```javascript
   const API_BASE = import.meta.env.VITE_API_BASE_URL;
   ```

3. **Handle form submissions** by calling the functions above

4. **Store auth token** in localStorage after login

5. **Include Bearer token** in Authorization header for authenticated endpoints

---

## Testing

**Test Registration** (via curl or Postman):
```bash
curl -X POST "https://noncitable-sara-forebearingly.ngrok-free.dev/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "dob": "1990-01-01",
    "gender": "male",
    "email": "john@example.com",
    "mobile_number": "1234567890",
    "password": "password123",
    "address": "123 Main St",
    "username": "johndoe",
    "preferred_language": "en"
  }'
```

---

## Notes

- All requests must include `Content-Type: application/json` header
- Authenticated endpoints require `Authorization: Bearer {token}` header
- Token is valid for 30 minutes
- All data is stored in MongoDB (responza_db)
- CORS is enabled for your Lovable domain

**Backend is running and ready to receive requests!** ✅
