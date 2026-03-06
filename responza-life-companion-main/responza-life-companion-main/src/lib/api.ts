const API_BASE = "https://responza-api.onrender.com";

export const sendOTP = async (mobile_number: string) => {
  const response = await fetch(`${API_BASE}/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile_number,
      purpose: "registration",
    }),
  });

  return response.json();
};

export const verifyOTP = async (mobile_number: string, otp_code: string) => {
  const response = await fetch(`${API_BASE}/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mobile_number,
      otp_code,
    }),
  });

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

  return response.json();
};