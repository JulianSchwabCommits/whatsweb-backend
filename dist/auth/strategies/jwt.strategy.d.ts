import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { UserService } from '../../user/user.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private configService;
    private userService;
    constructor(configService: ConfigService, userService: UserService);
    validate(payload: JwtPayload): Promise<{
        id: string;
        email: string;
        username: string;
    }>;
}
export {};
