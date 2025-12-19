export class AuthResponseDto {
    accessToken: string;
    user: {
        id: string;
        email: string;
        username: string;
        fullName: string;
    };
}
