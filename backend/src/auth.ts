import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2';
import { config } from './config.js';
import { pool } from './db.js';
import { findLocalUserByToken } from './localStore.js';

export type AuthRole = 'admin' | 'customer';

export type AuthUser = {
  id: number;
  name: string;
  username: string;
  email: string;
  role: AuthRole;
};

export type AuthRequest = Request & {
  authUser?: AuthUser;
};

type UserSessionRow = RowDataPacket & AuthUser;

const hashIterations = 120000;
const hashKeyLength = 32;
const hashDigest = 'sha256';

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return {
    salt,
    hash: pbkdf2Sync(password, salt, hashIterations, hashKeyLength, hashDigest).toString('hex')
  };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actualHash = pbkdf2Sync(password, salt, hashIterations, hashKeyLength, hashDigest);
  const expected = Buffer.from(expectedHash, 'hex');
  return actualHash.length === expected.length && timingSafeEqual(actualHash, expected);
}

export function createSessionToken() {
  return randomBytes(32).toString('hex');
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role
  };
}

function readBearerToken(req: Request) {
  const header = req.header('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return header.slice(7).trim();
}

export async function getUserFromRequest(req: Request): Promise<AuthUser | null> {
  const token = readBearerToken(req);
  if (!token) return null;

  if (config.useMockData) {
    return findLocalUserByToken(token);
  }

  const [rows] = await pool.query<UserSessionRow[]>(
    `
      SELECT id, name, username, email, role
      FROM users
      WHERE session_token = ?
      LIMIT 1
    `,
    [token]
  );

  return rows[0] ?? null;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Sesion requerida' });
      return;
    }
    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Sesion requerida' });
      return;
    }
    if (user.role !== 'admin') {
      res.status(403).json({ error: 'Solo el usuario administrador puede entrar a este recurso' });
      return;
    }
    req.authUser = user;
    next();
  } catch (error) {
    next(error);
  }
}
