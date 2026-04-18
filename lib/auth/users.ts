import { kv } from '../kv';
import { randomToken } from '../random';
import { listCredentialsForUser } from './credentials';

export type User = {
  id: string;
  username: string;
  displayName: string;
  emoji: string;
  createdAt: number;
};

export type PublicUser = {
  id: string;
  displayName: string;
  emoji: string;
  hasPasskey: boolean;
};

const USERS_SET = 'users';
const userKey = (id: string) => `user:${id}`;
const usernameIndexKey = (name: string) => `username:${name.toLowerCase()}`;

export async function createUser(input: {
  username: string;
  displayName: string;
  emoji: string;
}): Promise<User> {
  const existing = await kv.get<string>(usernameIndexKey(input.username));
  if (existing) throw new Error(`user "${input.username}" already exists`);

  const id = `u_${randomToken(8)}`;
  const user: User = {
    id,
    username: input.username.toLowerCase(),
    displayName: input.displayName,
    emoji: input.emoji,
    createdAt: Date.now(),
  };
  await kv.set(userKey(id), user);
  await kv.set(usernameIndexKey(user.username), id);
  await kv.sadd(USERS_SET, id);
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  return (await kv.get<User>(userKey(id))) ?? null;
}

export async function listUsers(): Promise<User[]> {
  const ids = await kv.smembers(USERS_SET);
  if (ids.length === 0) return [];
  const users = await Promise.all(ids.map((id) => getUser(id)));
  return users.filter((u): u is User => u !== null);
}

export async function getPublicUsers(): Promise<PublicUser[]> {
  const users = await listUsers();
  const withPasskeys = await Promise.all(
    users.map(async (u) => ({
      id: u.id,
      displayName: u.displayName,
      emoji: u.emoji,
      hasPasskey: (await listCredentialsForUser(u.id)).length > 0,
    })),
  );
  return withPasskeys;
}
