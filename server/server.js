import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import "dotenv/config";
import Groq from "groq-sdk";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import authMiddleware from "./middleware/authMiddleware.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import nodemailer from "nodemailer";

const app = express();

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
    adapter,
});

// ===============================
// GROQ AI
// ===============================

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// ===============================
// EMAIL TRANSPORTER
// ===============================

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },

    family: 4,
});

app.use(cors());
app.use(express.json());

// ===============================
// RESUME UPLOAD CONFIGURATION
// ===============================

const upload = multer({
    dest: "uploads/",
});

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "AI Resume Analyzer Backend is running!"
    });
});

// ===============================
// REGISTER
// ===============================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Name, email and password are required."
            });
        }

        // Check whether email is already registered
        const existingUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (existingUser) {
            return res.status(409).json({
                message: "User with this email already exists."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash
            }
        });

        res.status(201).json({
            message: "User registered successfully.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Registration Error", error);

        res.status(500).json({
            message: error.message
        });
    }
});

// ===============================
// NORMAL LOGIN
// ===============================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and Password are required"
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Google-only account
        if (!user.passwordHash) {
            return res.status(401).json({
                message: "This account uses Google Sign-In. Please login with Google."
            });
        }

        // Check password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user.id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Login Successfully",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Login Error", error);

        res.status(500).json({
            message: "Failed to Login."
        });
    }
});

// ===============================
// FORGOT PASSWORD - SEND OTP
// ===============================

app.post("/api/auth/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        // Check email
        if (!email) {
            return res.status(400).json({
                message: "Email is required."
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        // Don't reveal whether email exists
        if (!user) {
            return res.json({
                message: "If this email is registered, an OTP has been sent."
            });
        }

        // Generate 6-digit OTP
        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        // Hash OTP before saving
        const otpHash = await bcrypt.hash(otp, 10);

        // OTP valid for 10 minutes
        const otpExpiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        // Save OTP hash + expiry
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                loginOtpHash: otpHash,
                loginOtpExpiresAt: otpExpiresAt
            }
        });

        // Send OTP email
        await transporter.sendMail({
            from: `"AI Resume Analyzer" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Your Password Reset OTP - AI Resume Analyzer",

            html: `
            <div style="
                margin: 0;
                padding: 40px 20px;
                background-color: #f4f6f8;
                font-family: Arial, Helvetica, sans-serif;
            ">

            <div style="
                max-width: 600px;
                margin: auto;
                background-color: #ffffff;
                border-radius: 10px;
                padding: 40px;
                box-sizing: border-box;
                border: 1px solid #e5e7eb;
            ">

            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="
                    margin: 0;
                    color: #111827;
                    font-size: 26px;
                ">
                    AI Resume Analyzer
                </h1>

                <p style="
                    margin-top: 8px;
                    color: #6b7280;
                    font-size: 14px;
                ">
                    Secure Password Reset
                </p>
            </div>

            <div style="
                color: #374151;
                font-size: 15px;
                line-height: 1.7;
            ">
                <p>Hello <strong>${user.name}</strong></p>

                <p>
                    We received a request to reset the password for your
                    <strong>AI Resume Analyzer</strong> account.
                </p>

                <p>
                    Please use the verification code below to continue
                    with your password reset:
                </p>
            </div>

            <div style="
                margin: 30px 0;
                text-align: center;
                background-color: #f8fafc;
                padding: 25px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
            ">

                <p style="
                    margin: 0 0 12px 0;
                    color: #64748b;
                    font-size: 13px;
                ">
                    Your verification code
                </p>

                <div style="
                    display: inline-block;
                    padding: 14px 28px;
                    background-color: #6366f1;
                    color: #ffffff;
                    border-radius: 7px;
                    font-size: 28px;
                    font-weight: bold;
                    letter-spacing: 6px;
                ">
                    ${otp}
                </div>

                <p style="
                    margin: 15px 0 0 0;
                    color: #64748b;
                    font-size: 13px;
                ">
                    This OTP is valid for <strong>10 minutes</strong>.
                </p>
            </div>

            <div style="
                padding: 18px;
                background-color: #fff7ed;
                border-left: 4px solid #f59e0b;
                border-radius: 5px;
                color: #374151;
                font-size: 14px;
                line-height: 1.7;
            ">

                <strong>Security Notice</strong>

                <p style="margin: 8px 0 0 0;">
                    AI Resume Analyzer will never ask you to share your
                    OTP or password with anyone.
                </p>

            </div>

            <div style="
                margin-top: 25px;
                color: #374151;
                font-size: 14px;
                line-height: 1.7;
            ">

                <p>
                    If you did not request a password reset, you can safely
                    ignore this email. Your account will remain secure.
                </p>

                <p>
                    For your security, please do not share this verification
                    code with anyone.
                </p>

            </div>

            <div style="
                margin: 30px 0;
                border-top: 1px solid #e5e7eb;
            "></div>

            <div style="
                text-align: center;
                color: #6b7280;
                font-size: 13px;
                line-height: 1.6;
            ">

                <p style="margin: 0 0 8px 0;">
                    Thank you for using
                    <strong>AI Resume Analyzer</strong>.
                </p>

                <p style="margin: 0;">
                    Best regards,<br>
                    <strong>AI Resume Analyzer Team</strong>
                </p>

            </div>

            </div>

            <div style="
                text-align: center;
                margin-top: 20px;
                color: #9ca3af;
                font-size: 12px;
            ">
                <p>
                    This is an automated email. Please do not reply to this message.
                </p>
            </div>

            </div>
            `
        });

        res.json({
            message: "OTP sent successfully."
        });

    } catch (error) {

        console.error("Send OTP Error:", error);

        res.status(500).json({
            message: "Could not send OTP."
        });
    }
});

// ===============================
// FORGOT PASSWORD - VERIFY OTP
// ===============================

app.post("/api/auth/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: "Email and OTP are required."
            });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        // Check OTP exists
        if (
            !user ||
            !user.loginOtpHash ||
            !user.loginOtpExpiresAt
        ) {
            return res.status(401).json({
                message: "Invalid or expired OTP."
            });
        }

        // Check OTP expiry
        if (new Date() > user.loginOtpExpiresAt) {
            return res.status(401).json({
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // Compare OTP
        const isOtpCorrect = await bcrypt.compare(
            otp,
            user.loginOtpHash
        );

        if (!isOtpCorrect) {
            return res.status(401).json({
                message: "Invalid OTP."
            });
        }

        // Generate password reset JWT
        const resetToken = jwt.sign(
            {
                userId: user.id,
                purpose: "password-reset"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "10m"
            }
        );

        // Delete OTP after successful verification
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                loginOtpHash: null,
                loginOtpExpiresAt: null
            }
        });

        res.json({
            message: "OTP verified successfully.",
            resetToken: resetToken
        });

    } catch (error) {

        console.error("Verify OTP Error:", error);

        res.status(500).json({
            message: "Could not verify OTP."
        });
    }
});

// ===============================
// RESET PASSWORD
// ===============================

app.post("/api/auth/reset-password", async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                message: "Reset token and new password are required."
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters."
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(
                resetToken,
                process.env.JWT_SECRET
            );
        } catch (error) {
            return res.status(401).json({
                message: "Reset session expired. Please request a new OTP."
            });
        }

        if (decoded.purpose !== "password-reset") {
            return res.status(401).json({
                message: "Invalid reset token."
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: decoded.userId
            }
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        const passwordHash = await bcrypt.hash(
            newPassword,
            10
        );

        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                passwordHash
            }
        });

        res.json({
            message: "Password reset successfully."
        });

    } catch (error) {

        console.error("Reset Password Error:", error);

        res.status(500).json({
            message: "Could not reset password."
        });
    }
});

// ===============================
// GOOGLE SIGNUP
// ===============================

app.post("/api/auth/google/signup", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google Credential is required"
            });
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;

        if (!email) {
            return res.status(400).json({
                message: "Google account email not available"
            });
        }

        // Check Google account
        const existingGoogleUser = await prisma.user.findUnique({
            where: {
                googleId: googleId
            }
        });

        if (existingGoogleUser) {
            return res.status(409).json({
                message: "This Google account is already registered. Please Login."
            });
        }

        // Check email
        const existingEmailUser = await prisma.user.findUnique({
            where: {
                email: email
            }
        });

        if (existingEmailUser) {
            return res.status(409).json({
                message: "An Account with this email already exists. Please Login."
            });
        }

        // Create Google user
        const user = await prisma.user.create({
            data: {
                name: name || "Google User",
                email: email,
                googleId: googleId,
                passwordHash: null
            }
        });

        // Create application JWT
        const token = jwt.sign(
            {
                userId: user.id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            message: "Google Signup Successfully.",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            }
        });

    } catch (error) {

        console.error("Google Signup Error", error);

        res.status(401).json({
            message: "Google Authentication Failed."
        });
    }
});

// ===============================
// GOOGLE LOGIN
// ===============================

app.post("/api/auth/google/login", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google Credential is required"
            });
        }

        // Verify Google ID token
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        const googleId = payload.sub;
        const email = payload.email;

        if (!email) {
            return res.status(400).json({
                message: "Google account email not available."
            });
        }

        // Find user by Google ID only
        const user = await prisma.user.findUnique({
            where: {
                googleId: googleId
            }
        });

        // Google account not registered
        if (!user) {
            return res.status(404).json({
                message: "Google account not found. Please signup first."
            });
        }

        // Create application JWT
        const token = jwt.sign(
            {
                userId: user.id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            message: "Google login successfully",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (error) {

        console.error("Google login error", error);

        res.status(401).json({
            message: "Google Authentication failed."
        });
    }
});

// ===============================
// RESUME ANALYSIS
// ===============================

app.post(
    "/api/analyze",
    authMiddleware,
    upload.single("resume"),
    async (req, res) => {

        try {

            if (!req.file) {
                return res.status(400).json({
                    message: "No Resume Uploaded"
                });
            }

            let extractedText = "";

            // ===============================
            // PDF
            // ===============================

            if (req.file.mimetype === "application/pdf") {

                const dataBuffer = fs.readFileSync(req.file.path);

                const parser = new PDFParse({
                    data: dataBuffer,
                });

                const result = await parser.getText();

                extractedText = result.text;

                await parser.destroy();
            }

            // ===============================
            // DOCX
            // ===============================

            else if (
                req.file.mimetype ===
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ) {

                const result = await mammoth.extractRawText({
                    path: req.file.path,
                });

                extractedText = result.value;
            }

            // ===============================
            // CHECK EXTRACTED TEXT
            // ===============================

            if (!extractedText.trim()) {
                return res.status(400).json({
                    message: "Could not extract text from the resume."
                });
            }

            // ===============================
            // GROQ AI ANALYSIS
            // ===============================

            const prompt = `
You are an expert ATS resume analyzer.

Analyze the document provided below.

First determine whether the document is actually a resume or CV.

If the document is NOT a resume/CV:

- Set "isResume" to false.
- Set "message" to "Please upload a valid resume or CV."
- Set all numeric fields to 0.
- Set summary to an empty string.
- Set resumeStatus to an empty string.
- Set missingKeywords to an empty array.
- Set recommendations to an empty array.

If the document IS a resume/CV:

- Set "isResume" to true.
- Analyze ONLY the information present in the provided resume.
- Do not invent experience, education, skills, projects or achievements.
- Give practical ATS-based analysis.

Scoring:

- atsScore: overall ATS compatibility score from 0 to 100.
- skillsMatch: quality and relevance of listed skills from 0 to 100.
- experience: quality/relevance of work experience from 0 to 100.
- projects: quality/relevance of projects from 0 to 100.
- keywords: quality and relevance of important resume keywords from 0 to 100.

Additional rules:

- All numeric scores must be between 0 and 100.
- missingKeywords should contain useful keywords that could improve the resume.
- recommendations should be practical and specific.
- Do not invent information that is not present.
- resumeStatus must be a short 3-6 word message based on atsScore.
- For a high score use something like "Excellent Resume" or "Strong Resume".
- For a medium score use something like "Resume Needs Improvement".
- For a low score use something like "Resume Needs Major Upgrade".
- summary should briefly explain the overall resume quality.
- For a valid resume, set message to an empty string.

Resume content:

${extractedText}
`;

            const response = await groq.chat.completions.create({
                model: "openai/gpt-oss-120b",

                messages: [
                    {
                        role: "system",
                        content: "You are an expert ATS resume analyzer. Always follow the requested JSON schema exactly."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],

                response_format: {
                    type: "json_schema",

                    json_schema: {
                        name: "resume_analysis",

                        strict: true,

                        schema: {
                            type: "object",

                            properties: {

                                isResume: {
                                    type: "boolean"
                                },

                                message: {
                                    type: "string"
                                },

                                atsScore: {
                                    type: "number"
                                },

                                skillsMatch: {
                                    type: "number"
                                },

                                experience: {
                                    type: "number"
                                },

                                projects: {
                                    type: "number"
                                },

                                keywords: {
                                    type: "number"
                                },

                                summary: {
                                    type: "string"
                                },

                                resumeStatus: {
                                    type: "string"
                                },

                                missingKeywords: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    }
                                },

                                recommendations: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    }
                                }
                            },

                            required: [
                                "isResume",
                                "message",
                                "atsScore",
                                "skillsMatch",
                                "experience",
                                "projects",
                                "keywords",
                                "summary",
                                "resumeStatus",
                                "missingKeywords",
                                "recommendations"
                            ],

                            additionalProperties: false
                        }
                    }
                }
            });

            // ===============================
            // GET GROQ RESPONSE
            // ===============================

            const aiText =
                response.choices?.[0]?.message?.content;

            if (!aiText) {
                console.error("Empty response received from Groq.");

                return res.status(500).json({
                    message: "AI returned an empty response."
                });
            }

            let analysis;

            try {

                analysis = JSON.parse(aiText);

            } catch (error) {

                console.error(
                    "Invalid JSON received from Groq:",
                    error
                );

                console.error(
                    "Groq Response:",
                    aiText
                );

                return res.status(500).json({
                    message: "AI returned an invalid response."
                });
            }

            // ===============================
            // CHECK WHETHER DOCUMENT IS RESUME
            // ===============================

            if (analysis.isResume === false) {

                return res.status(400).json({
                    message:
                        analysis.message ||
                        "Please upload a valid resume or CV."
                });
            }

            // ===============================
            // SAVE ANALYSIS TO DATABASE
            // ===============================

            const savedAnalysis =
                await prisma.resumeAnalysis.create({
                    data: {

                        userId: req.userId,

                        filename:
                            req.file.originalname,

                        atsScore:
                            analysis.atsScore,

                        skillsMatch:
                            analysis.skillsMatch,

                        experience:
                            analysis.experience,

                        projects:
                            analysis.projects,

                        keywords:
                            analysis.keywords,

                        resumeStatus:
                            analysis.resumeStatus,

                        summary:
                            analysis.summary,

                        missingKeywords:
                            analysis.missingKeywords,

                        recommendations:
                            analysis.recommendations,
                    },
                });

            // ===============================
            // SEND RESPONSE TO FRONTEND
            // ===============================

            res.json({
                message:
                    "Resume Analyzed Successfully.",

                analysisId:
                    savedAnalysis.id,

                filename:
                    req.file.originalname,

                analysis:
                    analysis,
            });

        } catch (error) {

            console.error(
                "Resume Processing error:",
                error
            );

            // Groq-specific error information
            if (error?.status) {
                console.error(
                    "Groq API Status:",
                    error.status
                );
            }

            if (error?.message) {
                console.error(
                    "Groq API Message:",
                    error.message
                );
            }

            res.status(500).json({
                message:
                    "Failed to process resume"
            });

        } finally {

            // Delete uploaded temporary file
            if (
                req.file?.path &&
                fs.existsSync(req.file.path)
            ) {
                fs.unlinkSync(req.file.path);
            }
        }
    }
);

// ===============================
// HISTORY API
// ===============================

app.get(
    "/api/history",
    authMiddleware,
    async (req, res) => {

        try {

            const history =
                await prisma.resumeAnalysis.findMany({
                    where: {
                        userId: req.userId
                    },

                    orderBy: {
                        createdAt: "desc"
                    }
                });

            res.json({
                message:
                    "History Fetch Successfully",

                history:
                    history
            });

        } catch (error) {

            console.error(
                "History Error",
                error
            );

            res.status(500).json({
                message:
                    "Failed to fetch analyses history."
            });
        }
    }
);

// ===============================
// SERVER
// ===============================

const PORT = 5000;

app.listen(PORT, () => {
    console.log(
        `Server is running on PORT ${PORT}`
    );
});
