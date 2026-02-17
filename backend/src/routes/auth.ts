import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { config } from '../config';
import { getUser } from '../services/database';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const user = getUser(username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    config.jwtSecret,
    { expiresIn: '7d' },
  );

  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

export default router;
