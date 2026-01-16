import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(
    /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
    },
  )
  readonly password: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  readonly username: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  readonly fullName: string;
}
