import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "@/contexts/TranslationContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

const Register = () => {
  const { t, lang } = useTranslation();
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);

  const inputClass =
    "w-full p-3 rounded-lg border border-border bg-card text-foreground";

  const normalizeMobile = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    return value;
  };

  /* ---------------- SEND OTP ---------------- */

  const sendOtp = async () => {
    if (!mobile) {
      toast.error("Enter mobile number");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/otp/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile_number: normalizeMobile(mobile),
          purpose: "registration",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || "OTP failed");
        return;
      }

      setOtpSent(true);
      toast.success("OTP sent");
    } catch {
      toast.error("Network error while sending OTP");
    }
  };

  /* ---------------- VERIFY OTP ---------------- */

  const verifyOtp = async () => {
    if (!otp) {
      toast.error("Enter OTP");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/otp/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile_number: normalizeMobile(mobile),
          otp_code: otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || "Invalid OTP");
        return;
      }

      setMobileVerified(true);
      toast.success("Mobile verified");
    } catch {
      toast.error("Network error");
    }
  };

  /* ---------------- NEXT STEP ---------------- */

  const goStep2 = () => {
    if (
      !firstName ||
      !lastName ||
      !dob ||
      !gender ||
      !address ||
      !email ||
      !mobileVerified
    ) {
      toast.error("Fill all fields & verify mobile");
      return;
    }

    setStep(2);
  };

  /* ---------------- REGISTER ---------------- */

  const registerUser = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          dob,
          gender,
          address,
          email,
          mobile_number: normalizeMobile(mobile),
          preferred_language: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.detail || "Registration failed");
        return;
      }

      setUser(data);
      toast.success("Registration success");

      navigate("/dashboard");
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 max-w-lg w-full"
      >
        <h1 className="text-2xl font-bold mb-6">{t("register")}</h1>

        {step === 1 && (
          <div className="space-y-3">
            <input
              className={inputClass}
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />

            <input
              className={inputClass}
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />

            <input
              className={inputClass}
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />

            <select
              className={inputClass}
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="">Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>

            <input
              className={inputClass}
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <input
              className={inputClass}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* MOBILE + OTP */}

            <div className="flex gap-2">
              <input
                className={inputClass}
                placeholder="Mobile"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
              />

              {!mobileVerified && (
                <button
                  onClick={sendOtp}
                  className="px-4 rounded-lg bg-primary text-white"
                >
                  OTP
                </button>
              )}
            </div>

            {otpSent && !mobileVerified && (
              <div className="flex gap-2">
                <input
                  className={inputClass}
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />

                <button
                  onClick={verifyOtp}
                  className="px-4 rounded-lg bg-primary text-white"
                >
                  Verify
                </button>
              </div>
            )}

            {mobileVerified && (
              <p className="text-green-600 text-sm">✓ Mobile verified</p>
            )}

            <button
              onClick={goStep2}
              className="w-full py-3 rounded-xl bg-primary text-white"
            >
              Next
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p>Confirm and complete registration</p>

            <button
              onClick={registerUser}
              className="w-full py-3 rounded-xl bg-primary text-white"
            >
              Complete Registration
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Register;