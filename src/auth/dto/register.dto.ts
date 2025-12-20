import { IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @MinLength(8)
    @MaxLength(100)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character',
    })
    password: string;

    @MinLength(3)
    @MaxLength(50)
    username: string;

    @MinLength(3)
    @MaxLength(100)
    fullName: string;
}
