export const API_BASE = "https://responza-api.onrender.com";

export const sendOTP = async (mobile_number: string) => {
  const response = await fetch(`${API_BASE}/otp/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile_number,
      purpose: "registration",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send OTP");
  }

  return response.json();
};

export const verifyOTP = async (mobile_number: string, otp_code: string) => {
  const response = await fetch(`${API_BASE}/otp/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile_number,
      otp_code,
    }),
  });

  if (!response.ok) {
    throw new Error("OTP verification failed");
  }

  return response.json();
};

export const loginUser = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error("Login failed");
  }

  return response.json();
};