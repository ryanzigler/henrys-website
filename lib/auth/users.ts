import { kv } from '@/lib/kv';
import { randomToken } from '@/lib/random';
import { countCredentialsForUser } from '@/lib/auth/credentials';

export interface User {
  id: string;
  username: string;
  displayName: string;
  emoji: string;
  createdAt: number;
}

export interface PublicUser {
  id: string;
  displayName: string;
  emoji: string;
  hasPasskey: boolean;
}

const USERS_SET = 'users';
const userKey = (id: string) => `user:${id}`;
const usernameIndexKey = (name: string) => `username:${name.toLowerCase()}`;

export const createUser = async (input: {
  username: string;
  displayName: string;
  emoji: string;
}) => {
  const username = input.username.toLowerCase();
  const id = `u_${randomToken(8)}`;
  const claimed = await kv.set(usernameIndexKey(username), id, { nx: true });

  if (claimed !== 'OK') {
    throw new Error(`user "${input.username}" already exists`);
  }
  const user: User = {
    id,
    username,
    displayName: input.displayName,
    emoji: input.emoji,
    createdAt: Date.now(),
  };

  await Promise.all([kv.set(userKey(id), user), kv.sadd(USERS_SET, id)]);

  return user;
};

export const getUser = async (id: string) =>
  (await kv.get<User>(userKey(id))) ?? null;

export const listUsers = async () => {
  const ids = await kv.smembers(USERS_SET);
  if (ids.length === 0) return [];

  const users = await kv.mget<(User | null)[]>(...ids.map(userKey));
  return users.filter((user): user is User => user !== null);
};

export const getPublicUsers = async () => {
  const ids = await kv.smembers(USERS_SET);
  if (ids.length === 0) return [];

  const [users, counts] = await Promise.all([
    kv.mget<(User | null)[]>(...ids.map(userKey)),
    Promise.all(ids.map(countCredentialsForUser)),
  ]);

  return users.flatMap<PublicUser>((user, index) =>
    user ?
      [
        {
          id: user.id,
          displayName: user.displayName,
          emoji: user.emoji,
          hasPasskey: counts[index] > 0,
        },
      ]
    : [],
  );
};
