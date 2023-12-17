import { IRouter, Router } from 'express';
import { loginUser, logoutUser, registerUser } from '../controllers/user.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router: IRouter = Router();

router.route('/register').post(registerUser);
router.route('/login').post(loginUser);
router.route('/logout').post(verifyJWT, logoutUser);

export default router;
