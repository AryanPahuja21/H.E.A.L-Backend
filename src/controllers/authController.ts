import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, specialization, profileImageUrl } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      specialization,
      profileImageUrl,
    });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ user: newUser, token });
    return;
  } catch (err) {
    res.status(500).json({ error: "Registration failed", details: err });
    return;
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({ user, token });
    return;
  } catch (err) {
    res.status(500).json({ error: "Login failed", details: err });
    return;
  }
};

export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Return the user data
    res.status(200).json({ user });
  } catch (err) {
    // If token is invalid or expired
    res.status(401).json({ message: "Invalid or expired token" });
    return;
  }
};
