export interface JwtPayload {
    user_id: string;
    email?: string;
    role: string[];
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_expiry: string;
    refresh_token_expiry: string;
}