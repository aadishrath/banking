const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { ensureDbReady, readDb, writeDb, makeId, sortByTimestamp } = require('./lib/db');
const { hashPassword, verifyPassword } = require('./lib/auth');

const app = express();
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET || 'luminate-demo-secret';
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:4200';
const tokenTtl = process.env.JWT_EXPIRES_IN || '8h';
const sessionTtlMs = Number(process.env.SESSION_TTL_MS || 1000 * 60 * 60 * 8);
const maxFailedLogins = Number(process.env.MAX_FAILED_LOGINS || 5);
const lockoutWindowMs = Number(process.env.LOCKOUT_WINDOW_MS || 1000 * 60 * 15);

app.use(cors({ origin: clientOrigin, credentials: false }));
app.use(express.json());

const ALL_PERMISSIONS = [
  'view_payments',
  'make_transfer',
  'pay_card',
  'freeze_card',
  'chat_balance',
  'chat_execute',
  'edit_profile',
  'manage_permissions',
  'manage_users',
  'view_company_hub',
  'view_activity'
];

const ROLE_DEFAULT_PERMISSIONS = {
  admin: [...ALL_PERMISSIONS],
  customer: ['view_payments', 'make_transfer', 'pay_card', 'chat_balance', 'view_activity'],
  company: [
    'view_payments',
    'make_transfer',
    'chat_balance',
    'chat_execute',
    'edit_profile',
    'manage_users',
    'view_company_hub',
    'view_activity'
  ]
};

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    profile: user.profile
  };
}

function logStartupWarning() {
  if (process.env.NODE_ENV === 'production' && jwtSecret === 'luminate-demo-secret') {
    console.warn('JWT_SECRET is using the demo fallback secret in production. Set a strong environment secret.');
  }
}

function findUserByUsername(db, username) {
  return db.users.find((user) => user.username === username);
}

function getWorkspace(db, username) {
  const workspace = db.workspaces[username];
  if (!workspace) {
    throw new Error('Workspace not found.');
  }
  return workspace;
}

async function auth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const db = await readDb();
    const user = findUserByUsername(db, payload.username);

    if (!user || !user.sessionId || !user.sessionExpiresAt) {
      return res.status(401).json({ message: 'User session is no longer valid.' });
    }

    if (payload.sessionId !== user.sessionId) {
      return res.status(401).json({ message: 'User session is no longer valid.' });
    }

    if (new Date(user.sessionExpiresAt).getTime() <= Date.now()) {
      user.sessionId = null;
      user.sessionExpiresAt = null;
      await writeDb(db);
      return res.status(401).json({ message: 'Your session has expired. Please sign in again.' });
    }

    req.db = db;
    req.user = user;
    req.workspace = getWorkspace(db, user.username);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ message: 'This role does not have access to that feature.' });
    }
    return next();
  };
}

function appendActivity(workspace, entry) {
  workspace.activity.push({
    id: makeId('act'),
    timestamp: new Date().toISOString(),
    ...entry
  });
}

function appendChat(workspace, role, text) {
  workspace.chat.push({
    id: makeId('msg'),
    role,
    text,
    timestamp: new Date().toISOString(),
    status: role === 'assistant' ? 'processed' : 'sent'
  });
}

function normalizeUserAuth(user) {
  if (!user.passwordHash && user.password) {
    user.passwordHash = hashPassword(user.password);
    delete user.password;
  }

  user.failedLoginAttempts = Number(user.failedLoginAttempts || 0);
  user.lockUntil = user.lockUntil || null;
  user.sessionId = user.sessionId || null;
  user.sessionExpiresAt = user.sessionExpiresAt || null;
  user.lastLoginAt = user.lastLoginAt || null;
}

function normalizeDbAuth(db) {
  let changed = false;

  for (const user of db.users) {
    const before = JSON.stringify(user);
    normalizeUserAuth(user);
    if (JSON.stringify(user) !== before) {
      changed = true;
    }
  }

  if (changed) {
    writeDb(db);
  }
}

function buildInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function manageableRolesFor(user) {
  if (user.role === 'admin') {
    return ['admin', 'company', 'customer'];
  }

  if (user.role === 'company') {
    return ['company', 'customer'];
  }

  return [];
}

function assignablePermissionsFor(user) {
  if (user.role === 'admin') {
    return [...ALL_PERMISSIONS];
  }

  return ALL_PERMISSIONS.filter(
    (permission) => !['manage_permissions', 'manage_users'].includes(permission)
  );
}

function createWorkspaceForRole(db, role, profile) {
  const templateKey = role === 'admin' ? 'admin' : role === 'company' ? 'company' : 'customer';
  const workspace = clone(db.workspaces[templateKey]);

  if (workspace.chat?.[0]) {
    const firstName = profile.name.split(' ')[0];
    workspace.chat[0].text =
      role === 'company'
        ? `Hi ${firstName}. I can help with treasury transfers, operating balances, payroll funding, and company workspace questions.`
        : `Hi ${firstName}. I can help with balances, transfers, payments, and account support.`;
  }

  if (role === 'company' && workspace.companyWorkspace && profile.organization) {
    workspace.companyWorkspace.companyName = profile.organization;
  }

  workspace.activity.unshift({
    id: makeId('act'),
    timestamp: new Date().toISOString(),
    title: 'Workspace provisioned',
    description: `${profile.name}'s workspace was created and is ready to use.`,
    status: 'success',
    category: role === 'company' ? 'company' : 'account',
    channel: 'system'
  });

  return workspace;
}

function updateWorkspaceForRole(workspace, role, profile) {
  if (workspace.chat?.[0]) {
    const firstName = profile.name.split(' ')[0];
    workspace.chat[0].text =
      role === 'company'
        ? `Hi ${firstName}. I can help with treasury transfers, operating balances, payroll funding, and company workspace questions.`
        : `Hi ${firstName}. I can help with balances, transfers, payments, and account support.`;
  }

  if (role === 'company') {
    workspace.companyWorkspace = workspace.companyWorkspace || {
      companyName: profile.organization || profile.name,
      pendingInvoices: 0,
      pendingApprovals: 0,
      payrollTotal: 0,
      payrollRunDate: new Date().toISOString(),
      treasuryBalance: 0
    };
    workspace.companyWorkspace.companyName = profile.organization || profile.name;
  } else {
    delete workspace.companyWorkspace;
  }
}

function requireAccount(workspace, accountId) {
  const account = workspace.accounts.find((item) => item.id === accountId);
  if (!account) {
    throw new Error('That account could not be found.');
  }
  return account;
}

function snapshot(user, workspace) {
  return {
    session: {
      isAuthenticated: true,
      sessionId: user.sessionId,
      lastLoginAt: user.lastLoginAt,
      username: user.username,
      role: user.role,
      permissions: user.permissions
    },
    profile: user.profile,
    permissions: user.permissions,
    accounts: workspace.accounts,
    activity: sortByTimestamp(workspace.activity),
    chat: workspace.chat,
    companyWorkspace: workspace.companyWorkspace || null
  };
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await readDb();
  normalizeDbAuth(db);
  const user = db.users.find((candidate) => candidate.username === username);

  if (user?.lockUntil && new Date(user.lockUntil).getTime() > Date.now()) {
    return res.status(423).json({
      message: 'This account is temporarily locked after repeated failed sign-in attempts. Please try again later.'
    });
  }

  if (!user || !verifyPassword(password, user.passwordHash || user.password)) {
    if (user) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;

      const workspace = getWorkspace(db, user.username);
      const shouldLock = user.failedLoginAttempts >= maxFailedLogins;
      user.lockUntil = shouldLock ? new Date(Date.now() + lockoutWindowMs).toISOString() : null;
      appendActivity(workspace, {
        title: shouldLock ? 'Account locked after failed logins' : 'Login failed',
        description: shouldLock
          ? `The ${user.username} account was temporarily locked after repeated failed sign-in attempts.`
          : `A failed login attempt was recorded for ${user.username}.`,
        status: 'failed',
        category: 'authentication',
        channel: 'system'
      });
      await writeDb(db);
    }

    return res.status(401).json({
      message: 'Invalid credentials. Check your username and password and try again.'
    });
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date().toISOString();
  user.sessionId = makeId('sess');
  user.sessionExpiresAt = new Date(Date.now() + sessionTtlMs).toISOString();
  const signedToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role, sessionId: user.sessionId },
    jwtSecret,
    { expiresIn: tokenTtl }
  );

  const workspace = getWorkspace(db, user.username);
  appendActivity(workspace, {
    title: 'Login successful',
    description: `${user.profile.name} logged into the ${user.role} workspace.`,
    status: 'success',
    category: 'authentication',
    channel: 'app'
  });
  await writeDb(db);

  return res.json({
    token: signedToken,
    user: sanitizeUser(user),
    data: snapshot(user, workspace)
  });
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({
    user: sanitizeUser(req.user),
    data: snapshot(req.user, req.workspace)
  });
});

app.post('/api/auth/logout', auth, async (req, res) => {
  appendActivity(req.workspace, {
    title: 'Logout successful',
    description: 'User logged out of the banking workspace.',
    status: 'success',
    category: 'authentication',
    channel: 'app'
  });
  req.user.sessionId = null;
  req.user.sessionExpiresAt = null;
  await writeDb(req.db);
  res.json({ ok: true });
});

app.get('/api/bootstrap', auth, async (req, res) => {
  res.json(snapshot(req.user, req.workspace));
});

app.get('/api/permissions', auth, async (req, res) => {
  res.json({
    role: req.user.role,
    permissions: req.user.permissions
  });
});

app.patch('/api/permissions', auth, requirePermission('manage_permissions'), async (req, res) => {
  const nextPermissions = Array.isArray(req.body?.permissions)
    ? req.body.permissions.filter((permission) => ALL_PERMISSIONS.includes(permission))
    : null;

  if (!nextPermissions) {
    return res.status(400).json({ message: 'A permissions array is required.' });
  }

  if (nextPermissions.length < 1) {
    return res.status(400).json({ message: 'At least one assigned access permission is required.' });
  }

  req.user.permissions = [...new Set(nextPermissions)];
  appendActivity(req.workspace, {
    title: 'Permissions updated',
    description: `Role permissions were updated for ${req.user.username}.`,
    status: 'success',
    category: 'security',
    channel: 'app'
  });
  await writeDb(req.db);
  return res.json({
    role: req.user.role,
    permissions: req.user.permissions,
    data: snapshot(req.user, req.workspace)
  });
});

app.get('/api/users', auth, requirePermission('manage_users'), async (req, res) => {
  const allowedRoles = manageableRolesFor(req.user);
  const users = req.db.users
    .filter((user) => allowedRoles.includes(user.role))
    .map((user) => sanitizeUser(user));

  res.json({
    users,
    allowedRoles
  });
});

app.post('/api/users', auth, requirePermission('manage_users'), async (req, res) => {
  const {
    username,
    password,
    role,
    name,
    email,
    permissions,
    organization
  } = req.body || {};
  const allowedRoles = manageableRolesFor(req.user);

  if (!username || !password || !role || !name || !email) {
    return res.status(400).json({ message: 'Username, password, role, name, and email are required.' });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ message: 'Your role cannot create that type of user.' });
  }

  if (findUserByUsername(req.db, username)) {
    return res.status(400).json({ message: 'That username is already in use.' });
  }

  const allowedPermissions = assignablePermissionsFor(req.user);
  const selectedPermissions = Array.isArray(permissions) && permissions.length
    ? permissions.filter((permission) => allowedPermissions.includes(permission))
    : ROLE_DEFAULT_PERMISSIONS[role].filter((permission) => allowedPermissions.includes(permission));

  if (selectedPermissions.length < 1) {
    return res.status(400).json({ message: 'New users must have at least one permission assigned.' });
  }

  const profile = {
    id: makeId('usr'),
    username: String(username).trim(),
    name: String(name).trim(),
    email: String(email).trim(),
    phoneNumber: '',
    address: '',
    twoFactorEnabled: false,
    membership:
      role === 'admin'
        ? 'Platform Administrator'
        : role === 'company'
          ? 'Business Workspace'
          : 'Private Client',
    location: 'Remote',
    initials: buildInitials(name),
    ...(role === 'company' && organization ? { organization: String(organization).trim() } : {})
  };

  const user = {
    id: profile.id,
    username: profile.username,
    passwordHash: hashPassword(String(password).trim()),
    role,
    permissions: [...new Set(selectedPermissions)],
    profile,
    sessionId: null,
    sessionExpiresAt: null,
    lastLoginAt: null,
    failedLoginAttempts: 0,
    lockUntil: null
  };

  req.db.users.push(user);
  req.db.workspaces[user.username] = createWorkspaceForRole(req.db, role, profile);
  appendActivity(req.workspace, {
    title: 'User created',
    description: `${user.profile.name} (${user.username}) was added as a ${role}.`,
    status: 'success',
    category: 'account',
    channel: 'app'
  });
  await writeDb(req.db);

  return res.status(201).json({ user: sanitizeUser(user) });
});

app.patch('/api/users/:id', auth, requirePermission('manage_users'), async (req, res) => {
  const target = req.db.users.find((user) => user.id === req.params.id);

  if (!target) {
    return res.status(404).json({ message: 'That user could not be found.' });
  }

  const allowedRoles = manageableRolesFor(req.user);

  if (!allowedRoles.includes(target.role)) {
    return res.status(403).json({ message: 'Your role cannot edit that user.' });
  }

  const {
    role,
    name,
    email,
    permissions,
    organization,
    password
  } = req.body || {};

  if (!role || !name || !email) {
    return res.status(400).json({ message: 'Role, name, and email are required.' });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ message: 'Your role cannot assign that type of user.' });
  }

  if (target.id === req.user.id && role !== req.user.role) {
    return res.status(400).json({ message: 'You cannot change the role of the account you are currently using.' });
  }

  const allowedPermissions = assignablePermissionsFor(req.user);
  const nextPermissions = Array.isArray(permissions)
    ? permissions.filter((permission) => allowedPermissions.includes(permission))
    : [];

  if (nextPermissions.length < 1) {
    return res.status(400).json({ message: 'Edited users must have at least one permission assigned.' });
  }

  target.role = role;
  target.permissions = [...new Set(nextPermissions)];
  target.profile.name = String(name).trim();
  target.profile.email = String(email).trim();
  target.profile.initials = buildInitials(name);
  target.profile.membership =
    role === 'admin'
      ? 'Platform Administrator'
      : role === 'company'
        ? 'Business Workspace'
        : 'Private Client';

  if (role === 'company') {
    target.profile.organization = String(organization || '').trim() || target.profile.organization || target.profile.name;
  } else {
    delete target.profile.organization;
  }

  if (typeof password === 'string' && password.trim()) {
    target.passwordHash = hashPassword(password.trim());
    target.failedLoginAttempts = 0;
    target.lockUntil = null;
  }

  const workspace = req.db.workspaces[target.username];
  if (workspace) {
    updateWorkspaceForRole(workspace, role, target.profile);
  }

  appendActivity(req.workspace, {
    title: 'User updated',
    description: `${target.profile.name} (${target.username}) was updated.`,
    status: 'success',
    category: 'account',
    channel: 'app'
  });
  await writeDb(req.db);

  return res.json({ user: sanitizeUser(target) });
});

app.delete('/api/users/:id', auth, requirePermission('manage_users'), async (req, res) => {
  const index = req.db.users.findIndex((user) => user.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ message: 'That user could not be found.' });
  }

  const target = req.db.users[index];
  const allowedRoles = manageableRolesFor(req.user);

  if (!allowedRoles.includes(target.role)) {
    return res.status(403).json({ message: 'Your role cannot remove that user.' });
  }

  if (target.id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete the account you are currently using.' });
  }

  req.db.users.splice(index, 1);
  delete req.db.workspaces[target.username];
  appendActivity(req.workspace, {
    title: 'User removed',
    description: `${target.profile.name} (${target.username}) was removed from the workspace.`,
    status: 'success',
    category: 'account',
    channel: 'app'
  });
  await writeDb(req.db);

  return res.json({ ok: true });
});

app.get('/api/accounts', auth, async (req, res) => {
  res.json(req.workspace.accounts);
});

app.get('/api/accounts/:id', auth, async (req, res) => {
  try {
    res.json(requireAccount(req.workspace, req.params.id));
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

app.post('/api/accounts', auth, requirePermission('view_company_hub'), async (req, res) => {
  const payload = req.body;
  const account = {
    id: makeId('acct'),
    name: payload.name || 'New Account',
    alias: payload.alias || [],
    kind: payload.kind || 'deposit',
    subtype: payload.subtype || 'Deposit',
    currency: payload.currency || 'USD',
    balance: Number(payload.balance || 0),
    available: Number(payload.available || payload.balance || 0),
    accent: payload.accent || 'linear-gradient(135deg, #0f766e, #14b8a6)',
    status: payload.status || 'active',
    lastFour: payload.lastFour || '0000',
    transactions: []
  };
  req.workspace.accounts.push(account);
  appendActivity(req.workspace, {
    title: 'Account created',
    description: `${account.name} was created through the API.`,
    status: 'success',
    category: 'account',
    channel: 'app'
  });
  await writeDb(req.db);
  res.status(201).json(account);
});

app.patch('/api/accounts/:id', auth, requirePermission('view_company_hub'), async (req, res) => {
  try {
    const account = requireAccount(req.workspace, req.params.id);
    Object.assign(account, req.body);
    appendActivity(req.workspace, {
      title: 'Account updated',
      description: `${account.name} was updated through the API.`,
      status: 'success',
      category: 'account',
      channel: 'app'
    });
    await writeDb(req.db);
    res.json(account);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

app.delete('/api/accounts/:id', auth, requirePermission('view_company_hub'), async (req, res) => {
  const index = req.workspace.accounts.findIndex((account) => account.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ message: 'That account could not be found.' });
  }
  const [removed] = req.workspace.accounts.splice(index, 1);
  appendActivity(req.workspace, {
    title: 'Account deleted',
    description: `${removed.name} was removed through the API.`,
    status: 'success',
    category: 'account',
    channel: 'app'
  });
  await writeDb(req.db);
  return res.status(204).send();
});

app.get('/api/activity', auth, requirePermission('view_activity'), async (req, res) => {
  res.json(sortByTimestamp(req.workspace.activity));
});

app.post('/api/activity', auth, requirePermission('view_activity'), async (req, res) => {
  const entry = {
    title: req.body.title || 'Manual activity',
    description: req.body.description || 'Created via API.',
    status: req.body.status || 'info',
    category: req.body.category || 'insight',
    channel: req.body.channel || 'app',
    amount: req.body.amount
  };
  appendActivity(req.workspace, entry);
  await writeDb(req.db);
  res.status(201).json(sortByTimestamp(req.workspace.activity)[0]);
});

app.patch('/api/profile', auth, requirePermission('edit_profile'), async (req, res) => {
  const {
    name,
    address,
    phoneNumber,
    email,
    twoFactorEnabled,
    password
  } = req.body || {};

  if (typeof name === 'string' && name.trim()) {
    req.user.profile.name = name.trim();
    req.user.profile.initials = buildInitials(name);
  }

  if (typeof address === 'string') {
    req.user.profile.address = address.trim();
  }

  if (typeof phoneNumber === 'string') {
    req.user.profile.phoneNumber = phoneNumber.trim();
  }

  if (typeof email === 'string' && email.trim()) {
    req.user.profile.email = email.trim();
  }

  if (typeof twoFactorEnabled === 'boolean') {
    req.user.profile.twoFactorEnabled = twoFactorEnabled;
  }

  if (typeof password === 'string' && password.trim()) {
    req.user.passwordHash = hashPassword(password.trim());
  }

  req.user.profile.username = req.user.username;
  appendActivity(req.workspace, {
    title: 'Profile updated',
    description: 'Profile changes were saved through the API.',
    status: 'success',
    category: 'account',
    channel: 'app'
  });
  await writeDb(req.db);
  res.json(req.user.profile);
});

app.get('/api/company', auth, requirePermission('view_company_hub'), async (req, res) => {
  res.json(req.workspace.companyWorkspace || null);
});

app.post('/api/actions/transfer', auth, requirePermission('make_transfer'), async (req, res) => {
  try {
    const { fromId, toId, amount, note } = req.body;
    const value = Number(amount);
    const source = requireAccount(req.workspace, fromId);
    const destination = requireAccount(req.workspace, toId);

    appendActivity(req.workspace, {
      title: 'Transfer requested',
      description: `Move $${value.toFixed(2)} from ${source.name} to ${destination.name}.`,
      status: 'in-progress',
      category: 'transfer',
      channel: 'app',
      amount: value
    });

    if (source.id === destination.id) {
      throw new Error('Choose two different accounts for a transfer.');
    }
    if (source.kind !== 'deposit' || destination.kind !== 'deposit') {
      throw new Error('Transfers can only happen between deposit accounts.');
    }
    if (source.available < value) {
      throw new Error('There is not enough available balance to complete that transfer.');
    }

    source.balance -= value;
    source.available -= value;
    source.transactions.unshift({
      id: makeId('txn'),
      timestamp: new Date().toISOString(),
      title: note || `Transfer to ${destination.name}`,
      amount: value,
      type: 'debit',
      detail: `Sent to ${destination.name}`
    });

    destination.balance += value;
    destination.available += value;
    destination.transactions.unshift({
      id: makeId('txn'),
      timestamp: new Date().toISOString(),
      title: note || `Transfer from ${source.name}`,
      amount: value,
      type: 'credit',
      detail: `Received from ${source.name}`
    });

    appendActivity(req.workspace, {
      title: 'Transfer completed',
      description: `Transferred $${value.toFixed(2)} from ${source.name} to ${destination.name}.`,
      status: 'success',
      category: 'transfer',
      channel: 'app',
      amount: value
    });
    await writeDb(req.db);
    res.json({ ok: true, message: `Transferred $${value.toFixed(2)} from ${source.name} to ${destination.name}.`, data: snapshot(req.user, req.workspace) });
  } catch (error) {
    appendActivity(req.workspace, {
      title: 'Transfer failed',
      description: error.message,
      status: 'failed',
      category: 'transfer',
      channel: 'app'
    });
    await writeDb(req.db);
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.post('/api/actions/pay-card', auth, requirePermission('pay_card'), async (req, res) => {
  try {
    const { fromId, cardId, amount, note } = req.body;
    const value = Number(amount);
    const funding = requireAccount(req.workspace, fromId);
    const card = requireAccount(req.workspace, cardId);

    appendActivity(req.workspace, {
      title: 'Card payment requested',
      description: `Pay $${value.toFixed(2)} from ${funding.name} to ${card.name}.`,
      status: 'in-progress',
      category: 'payment',
      channel: 'app',
      amount: value
    });

    if (funding.kind !== 'deposit' || card.kind !== 'card') {
      throw new Error('Card payments need a deposit account and a credit card.');
    }
    if (funding.available < value) {
      throw new Error('Not enough available funds for that card payment.');
    }

    funding.balance -= value;
    funding.available -= value;
    funding.transactions.unshift({
      id: makeId('txn'),
      timestamp: new Date().toISOString(),
      title: note || `Card payment to ${card.name}`,
      amount: value,
      type: 'debit',
      detail: `Paid ${card.name}`
    });

    card.balance = Math.min(card.balance + value, 0);
    card.transactions.unshift({
      id: makeId('txn'),
      timestamp: new Date().toISOString(),
      title: note || `Payment from ${funding.name}`,
      amount: value,
      type: 'credit',
      detail: `Received payment from ${funding.name}`
    });

    appendActivity(req.workspace, {
      title: 'Card payment completed',
      description: `Paid $${value.toFixed(2)} from ${funding.name} to ${card.name}.`,
      status: 'success',
      category: 'payment',
      channel: 'app',
      amount: value
    });
    await writeDb(req.db);
    res.json({ ok: true, message: `Paid $${value.toFixed(2)} from ${funding.name} to ${card.name}.`, data: snapshot(req.user, req.workspace) });
  } catch (error) {
    appendActivity(req.workspace, {
      title: 'Card payment failed',
      description: error.message,
      status: 'failed',
      category: 'payment',
      channel: 'app'
    });
    await writeDb(req.db);
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.post('/api/actions/card/freeze', auth, requirePermission('freeze_card'), async (req, res) => {
  try {
    const { cardId, freeze } = req.body;
    const card = requireAccount(req.workspace, cardId);
    appendActivity(req.workspace, {
      title: `${freeze ? 'Freeze' : 'Unfreeze'} card requested`,
      description: `${freeze ? 'Freeze' : 'Unfreeze'} ${card.name}.`,
      status: 'in-progress',
      category: 'security',
      channel: 'app'
    });

    if (card.kind !== 'card') {
      throw new Error('Only card accounts support freeze controls.');
    }
    if (freeze && card.status === 'frozen') {
      throw new Error(`${card.name} is already frozen.`);
    }
    if (!freeze && card.status !== 'frozen') {
      throw new Error(`${card.name} is already active.`);
    }

    card.status = freeze ? 'frozen' : 'active';
    appendActivity(req.workspace, {
      title: `${freeze ? 'Freeze' : 'Unfreeze'} card completed`,
      description: `${card.name} is now ${freeze ? 'frozen' : 'active again'}.`,
      status: 'success',
      category: 'security',
      channel: 'app'
    });
    await writeDb(req.db);
    res.json({ ok: true, message: `${card.name} is now ${freeze ? 'frozen' : 'active again'}.`, data: snapshot(req.user, req.workspace) });
  } catch (error) {
    appendActivity(req.workspace, {
      title: `${req.body.freeze ? 'Freeze' : 'Unfreeze'} card failed`,
      description: error.message,
      status: 'failed',
      category: 'security',
      channel: 'app'
    });
    await writeDb(req.db);
    res.status(400).json({ ok: false, message: error.message });
  }
});

app.post('/api/chat', auth, async (req, res) => {
  const prompt = String(req.body.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ message: 'Prompt is required.' });
  }

  appendChat(req.workspace, 'user', prompt);
  const normalized = prompt.toLowerCase();
  let reply = 'I can help with balances, transfers, payments, and company workspace information.';

  if (normalized.includes('balance') || normalized.includes('how much')) {
    if (!req.user.permissions.includes('chat_balance')) {
      reply = 'Your role does not have access to chatbot balance summaries.';
    } else {
      const total = req.workspace.accounts
        .filter((account) => account.kind === 'deposit')
        .reduce((sum, account) => sum + account.balance, 0);
      reply = `Liquid balances total $${total.toFixed(2)}.`;
      appendActivity(req.workspace, {
        title: 'Chatbot balance request',
        description: 'User asked the chatbot for a balance summary.',
        status: 'info',
        category: 'insight',
        channel: 'chatbot'
      });
    }
  } else if (req.user.permissions.includes('view_company_hub') && (normalized.includes('payroll') || normalized.includes('invoice') || normalized.includes('treasury'))) {
    const workspace = req.workspace.companyWorkspace;
    reply = `${workspace.companyName} has ${workspace.pendingInvoices} pending invoices, ${workspace.pendingApprovals} approvals pending, and $${workspace.payrollTotal.toFixed(2)} reserved for payroll.`;
    appendActivity(req.workspace, {
      title: 'Company chatbot request',
      description: 'User asked the chatbot for company workspace information.',
      status: 'info',
      category: 'company',
      channel: 'chatbot'
    });
  } else if (!req.user.permissions.includes('chat_execute') && (normalized.includes('transfer') || normalized.includes('pay') || normalized.includes('freeze'))) {
    reply = 'Your role can use the chatbot for guidance and balances, but not for executing tasks.';
  }

  appendChat(req.workspace, 'assistant', reply);
  await writeDb(req.db);
  return res.json({ reply, chat: req.workspace.chat, activity: sortByTimestamp(req.workspace.activity) });
});

app.listen(port, async () => {
  const db = await readDb();
  normalizeDbAuth(db);
  await writeDb(db);
  await ensureDbReady();
  logStartupWarning();
  console.log(`Banking API listening on http://localhost:${port}`);
});
