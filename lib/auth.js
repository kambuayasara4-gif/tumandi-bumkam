// lib/auth.js
// Pengelolaan Session & Autentikasi Admin TUMANDI

const { prisma } = require('./prisma');
const bcrypt = require('bcryptjs');
const { cookies } = require('next/headers');
const crypto = require('crypto');

const SESSION_COOKIE_NAME = 'tumandi_session';
const SECRET_KEY = process.env.SESSION_SECRET || 'tumandi-bumkam-doyo-lama-secure-key-2026';

function signToken(data) {
  const jsonStr = JSON.stringify(data);
  const base64Data = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(base64Data)
    .digest('base64url');
  return `${base64Data}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [base64Data, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(base64Data)
    .digest('base64url');

  if (signature !== expectedSignature) return null;

  try {
    const jsonStr = Buffer.from(base64Data, 'base64url').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (e) {
    return null;
  }
}

async function loginAdmin(username, password) {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user || !user.isActive) {
    return { success: false, message: 'Username atau kata sandi tidak ditemukan.' };
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, message: 'Username atau kata sandi salah.' };
  }

  // Buat payload sesi
  const sessionData = {
    userId: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    loggedInAt: Date.now(),
  };

  const token = signToken(sessionData);

  // Set cookie di Next.js headers
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true', // Diizinkan pada HTTP lokal LAN / Wi-Fi agar HP & perangkat lain dapat login
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });
  } catch (e) {
    // Abaikan jika dipanggil di luar HTTP request context (misal unit test)
  }

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

async function getSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const data = verifyToken(token);
    if (!data) return null;

    return data;
  } catch (e) {
    return null;
  }
}

async function logoutAdmin() {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (e) {
    // Abaikan jika di luar request scope
  }
  return { success: true };
}

module.exports = {
  loginAdmin,
  getSession,
  logoutAdmin,
  verifyToken,
};
