export interface JwtPayload {
    sub: string; // user id
    email: string;
    username: string;
    iat?: number;
    exp?: number;
}
