export interface RedmineAuth {
  username: string;
  password: string;
}

export function createBasicAuth(authObj: RedmineAuth): string {
  const authString = `${authObj.username}:${authObj.password}`;
  return `Basic ${Buffer.from(authString).toString("base64")}`;
}
