import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { IAuthService } from './auth';
import { UserCredentialsDetails } from '../utils/types';
import { Services } from '../utils/constants';
import { UserService } from 'src/users/user.service';
import { compareHash } from 'src/utils/helpers';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @Inject(Services.USERS) private readonly userService: UserService,
  ) {}

  async validateUser(userCredentials: UserCredentialsDetails) {
    console.log('userservice.createuser');
    const user = await this.userService.findUser({
      email: userCredentials.email,
    });

    if (!user)
      throw new HttpException('Invalid Credentials', HttpStatus.UNAUTHORIZED);

    return compareHash(userCredentials.password, user.password);
  }
}
