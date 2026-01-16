export class AuthUserDto {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly fullName: string;
}

export class AuthResponseDto {
  readonly accessToken: string;
  readonly user: AuthUserDto;
}
