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
import { Resend } from "resend";

const app = express();

const resend = new Resend(process.env.RESEND_API_KEY);

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

        if (!email) {
            return res.status(400).json({
                message: "Email is required.",
            });
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: {
                email: email.toLowerCase(),
            },
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // OTP expires after 10 minutes
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Hash OTP
        const otpHash = crypto
            .createHash("sha256")
            .update(otp)
            .digest("hex");

        // Save OTP in database
        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                loginOtpHash: otpHash,
                loginOtpExpiresAt: otpExpiresAt,
            },
        });

        // Send OTP email using Resend
        const { data, error } = await resend.emails.send({
            from: "AI Resume Analyzer <onboarding@resend.dev>",
            to: [email],
            subject: "AI Resume Analyzer - Password Reset OTP",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 30px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                ">
                    <h2>AI Resume Analyzer</h2>

                    <p>You requested to reset your password.</p>

                    <p>Your OTP is:</p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        margin: 20px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This OTP will expire in <strong>10 minutes</strong>.
                    </p>

                    <p>
                        If you did not request a password reset,
                        you can safely ignore this email.
                    </p>

                    <p>
                        Regards,<br>
                        AI Resume Analyzer
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Resend Error:", error);

            return res.status(500).json({
                message: "Could not send OTP.",
            });
        }

        console.log("OTP email sent:", data);

        return res.status(200).json({
            message: "OTP sent successfully.",
        });

    } catch (error) {
        console.error("Send OTP Error:", error);

        return res.status(500).json({
            message: "Could not send OTP.",
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