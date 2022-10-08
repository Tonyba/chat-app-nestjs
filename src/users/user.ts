import { CreateUserDetails, FindUserParams } from '../utils/types';

export interface IUserService {
  createUser(userDetails: CreateUserDetails);
  findUser(findUserParams: FindUserParams);
}
