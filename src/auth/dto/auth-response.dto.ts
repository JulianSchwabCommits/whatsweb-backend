export class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        email: string;
        username: string;
        fullName: string;
    };
}

export class RefreshTokenDto {
    refreshToken: string;
}
