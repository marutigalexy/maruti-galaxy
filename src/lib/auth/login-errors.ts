export const GENERIC_LOGIN_ERROR = "Invalid email or password.";
export const INACTIVE_ACCOUNT_ERROR = "This account is inactive.";
export const UNAUTHORIZED_ACCOUNT_ERROR = "This account is not authorized.";

export function mapLoginFailure(): string {
  return GENERIC_LOGIN_ERROR;
}
