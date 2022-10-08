import { UserCredentialsDetails } from '../utils/types';

export interface IAuthService {
  validateUser(userCredentials: UserCredentialsDetails);
}
